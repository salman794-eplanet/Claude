require('@shopify/shopify-api/adapters/node');
const express = require('express');
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');

const app = express();
const port = process.env.PORT || 3000;

// 1. Shopify Setup with Error Catching
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  adminApiAccessToken: process.env.SHOPIFY_ACCESS_TOKEN,
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

// 2. Define Tools
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_products",
      description: "List all products",
      inputSchema: { type: "object", properties: {} }
    }
  ],
}));

// 3. Execution Logic with Detailed Logging
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_products") {
    try {
      console.log("Attempting to fetch products for:", process.env.SHOPIFY_STORE);
      
      const session = shopify.session.customAppSession(process.env.SHOPIFY_STORE);
      const client = new shopify.clients.Rest({session});
      
      const response = await client.get({ path: 'products' });
      
      console.log("Success! Products fetched.");
      return {
        content: [{ type: "text", text: "Products: " + JSON.stringify(response.body.products) }]
      };
    } catch (error) {
      // Yeh line Railway logs mein asli wajah dikhayegi
      console.error("DETAILED SHOPIFY ERROR:", error.message);
      return {
        content: [{ type: "text", text: "Shopify Error Detail: " + error.message }],
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
  if (transport) await transport.handlePostMessage(req, res);
});

app.get('/', (req, res) => res.send('Bridge is LIVE and ready for Claude.'));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log("Store Configured:", process.env.SHOPIFY_STORE);
});
