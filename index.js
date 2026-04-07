require('@shopify/shopify-api/adapters/node');
const express = require('express');
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

const app = express();
const port = process.env.PORT || 3000;

// 1. MCP Server Setup
const mcpServer = new Server({
  name: "shopify-bridge",
  version: "1.0.0",
}, {
  capabilities: { tools: {} },
});

// 2. Claude ko tools batana (List Tools)
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "get_shopify_info",
    description: "Get Shopify store status",
    inputSchema: { type: "object", properties: {} },
  }],
}));

// 3. Tool chalne par kya hoga
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_shopify_info") {
    return {
      content: [{ type: "text", text: `Connected to store: ${process.env.SHOPIFY_STORE}` }]
    };
  }
});

// 4. SSE Endpoints (Claude isi se connect hota hai)
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

// Simple landing page for browser check
app.get('/', (req, res) => res.send('<h1>Bridge is Online!</h1><p>Use /sse for Claude connection.</p>'));

app.listen(port, () => console.log(`Server is running on port ${port}`));
