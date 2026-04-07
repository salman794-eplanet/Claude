const express = require('express');
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

const app = express();
const port = process.env.PORT || 3000;

// MCP Server Setup
const mcpServer = new Server({
  name: "shopify-bridge",
  version: "1.0.0",
}, {
  capabilities: { tools: {} },
});

// 1. Define Tools
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_products",
      description: "Get all products directly from Shopify API",
      inputSchema: { type: "object", properties: {} }
    }
  ],
}));

// 2. Direct API Logic (No Session Hassle)
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_products") {
    const store = process.env.SHOPIFY_STORE;
    const token = process.env.SHOPIFY_ACCESS_TOKEN;
    const url = `https://${store}/admin/api/2024-01/products.json`;

    try {
      console.log(`Connecting to: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.errors || `Shopify error: ${response.status}`);
      }

      const productTitles = data.products.map(p => p.title).join(", ");
      
      return {
        content: [{ 
          type: "text", 
          text: productTitles ? `Products found: ${productTitles}` : "Store is empty." 
        }]
      };

    } catch (error) {
      console.error("Direct API Error:", error.message);
      return {
        content: [{ type: "text", text: "Direct API Error: " + error.message }],
        isError: true
      };
    }
  }
});

// 3. Transport Setup
let transport;
app.get("/sse", async (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  await mcpServer.connect(transport);
});

app.post("/messages", async (req, res) => {
  if (transport) await transport.handlePostMessage(req, res);
});

app.get('/', (req, res) => res.send('Bridge is LIVE (Direct Version)'));
app.listen(port, () => console.log(`Server running on port ${port}`));
