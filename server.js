const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());

function appendToJsonFile(filename, newData) {
  const filePath = path.join(__dirname, 'src', 'data', filename);
  let data = [];
  if (fs.existsSync(filePath)) {
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  data.push(newData);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

app.post('/writings', (req, res) => {
  appendToJsonFile('writings.json', req.body);
  res.status(201).json({ message: 'Writing added!' });
});
app.post('/infographics', (req, res) => {
  appendToJsonFile('infographics.json', req.body);
  res.status(201).json({ message: 'Infographic added!' });
});
app.post('/visualizations', (req, res) => {
  appendToJsonFile('visualization.json', req.body);
  res.status(201).json({ message: 'Visualization added!' });
});

app.listen(3001, () => console.log('Server running on http://localhost:3001'));
