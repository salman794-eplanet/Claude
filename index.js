require('@shopify/shopify-api/adapters/node');
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

// Simple MCP Server Setup
const server = new Server({
  name: "shopify-bridge",
  version: "1.0.0",
}, {
  capabilities: { tools: {} },
});

// Claude ko batana ke ye server kya kar sakta hai
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "get_shop_status",
    description: "Checks if Shopify connection is alive",
    inputSchema: { type: "object", properties: {} },
  }],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_shop_status") {
    return { content: [{ type: "text", text: "Shopify Bridge is active on Railway!" }] };
  }
});

// Transport setup for Claude
const transport = new StdioServerTransport();
server.connect(transport);
