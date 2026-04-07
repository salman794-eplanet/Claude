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

// 2. MCP Server Definition
const mcpServer = new Server({
  name: "shopify-bridge",
  version: "1.0.0",
}, {
  capabilities: { tools: {} },
});

// 3. Define Tools for Claude
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_products",
      description: "Fetch all products from the Shopify store",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "get_orders",
      description: "Fetch the latest orders from the Shopify store",
      inputSchema: { type: "object", properties: {} }
    }
  ],
}));

// 4. Handle Tool Execution (Logic)
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const session = await shopify.session.customAppSession(process.env.SHOPIFY_STORE);
  session.accessToken = process.env.SHOPIFY_ACCESS_TOKEN; // Force the token
  
  const client = new shopify.clients.Rest({session});
  const { name: toolName } = request.params;

  try {
    if (toolName === "get_products") {
      const response = await client.get({ path: 'products' });
      return { 
        content: [{ type: "text", text: `Found ${response.body.products.length} products: ` + JSON.stringify(response.body.products) }] 
      };
    }
    
    if (toolName === "get_orders") {
      const response = await client.get({ path: 'orders' });
      return { 
        content: [{ type: "text", text: `Found ${response.body.orders.length} orders: ` + JSON.stringify(response.body.orders) }] 
      };
    }

    return {
      content: [{ type: "text", text: `Tool '${toolName}' not found. Available: get_products, get_orders` }],
      isError: true
    };

  } catch (error) {
    return {
      content: [{ type: "text", text: "Shopify API Error: " + error.message }],
      isError: true
    };
  }
});

// 5. SSE & Express Endpoints
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

// Landing Page for health check
app.get('/', (req, res) => res.send('<h1>Shopify Bridge is LIVE!</h1><p>Connect Claude to /sse</p>'));

app.listen(port, () => console.log(`Bridge server running on port ${port}`));
