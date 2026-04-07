const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('<h1>SERVER IS WORKING!</h1>');
});

app.listen(port, () => {
  console.log('Server is up on port ' + port);
});
