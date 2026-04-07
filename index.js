require('@shopify/shopify-api/adapters/node');
const express = require('express');
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');

const app = express();
const port = process.env.PORT || 3000;

// 1. Shopify Setup
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  adminApiAccessToken: process.env.SHOPIFY_ACCESS_TOKEN,
  scopes: ['read_products', 'write_products', 'read_orders', 'read_inventory'],
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

// 2. Tools List
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_products",
      description: "List all products in the store",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "get_orders",
      description: "List recent orders",
      inputSchema: { type: "object", properties: {} }
    }
  ],
}));

// 3. Execution Logic (Wohi part jo pehle miss hua)
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const session = await shopify.session.customAppSession(process.env.SHOPIFY_STORE);
  session.accessToken = process.env.SHOPIFY_ACCESS_TOKEN; // Force set token

  const client = new shopify.clients.Rest({session});
  
  try {
    if (request.params.name === "get_products") {
      const products = await client.get({path: 'products'});
      return { content: [{ type: "text", text: JSON.stringify(products.body.products) }] };
    }
    
    if (request.params.name === "get_orders") {
      const orders = await client.get({path: 'orders'});
      return { content: [{ type: "text", text: JSON.stringify(orders.body.orders) }] };
    }
    
    throw new Error("Tool not found");
  } catch (error) {
    return {
      content: [{ type: "text", text: "Shopify Error: " + error.message }],
      isError: true
    };
  }
});

// 4. Transport setup
let transport;
app.get("/sse", async (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  await mcpServer.connect(transport);
});

app.post("/messages", async (req, res) => {
  if (transport) await transport.handlePostMessage(req, res);
});

app.get('/', (req, res) => res.send('Bridge is Online!'));

app.listen(port, () => console.log(`Server running on ${port}`));
