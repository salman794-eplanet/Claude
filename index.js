mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Yahan humne token ko direct fix kar diya hai
  const session = await shopify.session.customAppSession(process.env.SHOPIFY_STORE);
  session.accessToken = process.env.SHOPIFY_ACCESS_TOKEN; // Forcefully setting the token

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
        // Inventory ke liye path thora different hota hai
        const inventory = await client.get({path: 'inventory_items'});
        return { content: [{ type: "text", text: JSON.stringify(inventory.body) }] };

      default:
        throw new Error("Tool not found");
    }
  } catch (error) {
    console.error("Shopify API Error:", error);
    return {
      content: [{ type: "text", text: "Shopify Error: " + error.message }],
      isError: true
    };
  }
});
