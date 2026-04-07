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
  scopes: ['read_products', 'write_products', 'read_orders', 'write_orders', 'read_inventory'],
  hostName: process.env.RAILWAY_STATIC_URL || 'localhost',
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: false,
});

const mcpServer = new Server({
  name: "shopify-full-access-bridge",
  version: "1.0.0",
}, {
  capabilities: { tools: {} },
});

// 2. Claude's Menu (List of all rights)
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
    },
    {
      name: "get_inventory",
      description: "Check stock levels",
      inputSchema: { type: "object", properties: {} }
    }
  ],
}));

// 3. Execution Logic
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const session = await shopify.session.customAppSession(process.env.SHOPIFY_STORE);
  const client = new shopify.clients.Rest({session});
  
  try {
    switch (request.params.name) {
      case "get_products":
        const products = await client.get({path: 'products'});
        return { content: [{ type: "text", text: JSON.stringify(products.body.products) }] };
      
      case "get_orders":
        const orders = await client.get({path: 'orders'});
        return { content: [{ type: "text", text: JSON.stringify(orders.body.orders) }] };

      case "get_inventory":
        const inventory = await client.get({path: 'inventory_items'});
        return { content: [{ type: "text", text: JSON.stringify(inventory.body) }] };

      default:
        throw new Error("Tool not found");
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: "Shopify Error: " + error.message }],
      isError: true
    };
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

app.get('/', (req, res) => res.send('Full Access Bridge is Online!'));

app.listen(port, () => console.log(`Server running on ${port}`));
