require('@shopify/shopify-api/adapters/node'); // Yeh line error khatam karegi
const express = require('express');
const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');

const app = express();
const port = process.env.PORT || 3000;

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  adminApiAccessToken: process.env.SHOPIFY_ACCESS_TOKEN,
  scopes: ['read_products'],
  hostName: process.env.RAILWAY_STATIC_URL || 'localhost',
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: false,
});

app.get('/', (req, res) => {
  res.send('<h1>Bridge is LIVE!</h1><p>Connection to Shopify is ready.</p>');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
