const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('SERVER IS WORKING!'));
const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Live on ' + port));
