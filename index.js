require('@shopify/shopify-api/adapters/node');
const express = require('express');
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');

const app = express();
const port = process.env.PORT || 3000;

// 1. Shopify Initialized
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  adminApiAccessToken: process.env.SHOPIFY_ACCESS_TOKEN,
  scopes: ['read_products'],
  hostName: process.env.RAILWAY_STATIC_URL || 'localhost',
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: false,
});

const mcpServer = new Server({
  name: "shopify-bridge",
  version: "1.0.0",
}, {
  capabilities: { tools: {} },
});

// 2. Define Tools for Claude
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "get_products",
    description: "List all products from Shopify store",
    inputSchema: { type: "object", properties: {} },
  }],
}));

// 3. Handle Tool Execution (Asli Kaam Yahan Hoga)
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_products") {
    try {
      const sessionId = await shopify.session.getOfflineId(process.env.SHOPIFY_STORE);
      const session = await shopify.session.customAppSession(process.env.SHOPIFY_STORE);
      
      const client = new shopify.clients.Rest({session});
      const data = await client.get({path: 'products'});

      return {
        content: [{ type: "text", text: JSON.stringify(data.body.products) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: "Error fetching products: " + error.message }],
        isError: true
      };
    }
  }
});

let transport;
app.get("/sse", async (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  await mcpServer.connect(transport);
});

app.post("/messages", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  }
});

app.get('/', (req, res) => res.send('Bridge is Online! Connect via Claude /sse'));

app.listen(port, () => console.log(`Server running on ${port}`));
