const express = require('express');
const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Shopify setup
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: ['read_products', 'read_orders'],
  hostName: process.env.RAILWAY_STATIC_URL || 'localhost',
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: false,
});

app.get('/', (req, res) => {
  res.send('Shopify-Claude Bridge is Running!');
});

// Example route to fetch products for Claude
app.get('/products', async (req, res) => {
  try {
    // Note: This is a simplified example
    res.json({ message: "Connection successful. Add your Shopify logic here." });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
