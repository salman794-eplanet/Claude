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

// 1. Define Tools for Claude
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_products",
      description: "Get all products from Shopify",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "get_orders",
      description: "Get recent orders from Shopify",
      inputSchema: { type: "object", properties: {} }
    }
  ],
}));

// 2. Execution Logic with Strict JSON Format
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const store = process.env.SHOPIFY_STORE;
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  const toolName = request.params.name;

  try {
    let endpoint = "";
    if (toolName === "get_products") {
      endpoint = `https://${store}/admin/api/2024-01/products.json`;
    } else if (toolName === "get_orders") {
      endpoint = `https://${store}/admin/api/2024-01/orders.json?status=any`;
    } else {
      throw new Error(`Tool ${toolName} not found`);
    }

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(data.errors || "Shopify API Error"));
    }

    // Claude ka bataya hua SAHI format ✅
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data) 
        }
      ]
    };

  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`
        }
      ],
      isError: true
    };
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

app.get('/', (req, res) => res.send('Bridge is LIVE - Format Fixed!'));
app.listen(port, () => console.log(`Server running on port ${port}`));
