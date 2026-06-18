const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from root
app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  maxAge: '1h'
}));

// Fallback to index.html for clean URLs
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Mobiliar Demo running on port ${PORT}`);
});
