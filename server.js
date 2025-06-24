
const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

const DB_FILE = './server/data.json';

app.post('/api/monuments', (req, res) => {
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  data.push(req.body);
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  res.status(200).send({ success: true });
});

app.get('/api/monuments', (req, res) => {
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  res.send(data);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
