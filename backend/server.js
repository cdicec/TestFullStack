const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());

const TOTAL_COUNT = 1_000_000;
const userStates = {}; // { userId: { order: [], selected: Set() }}

function getUser(req) {
  let userId = req.cookies.userId;
  if (!userId || !userStates[userId]) {
    userId = uuidv4();
    const order = Array.from({ length: TOTAL_COUNT }, (_, i) => i + 1);
    userStates[userId] = { order, selected: new Set() };
  }
  resCookie(req, 'userId', userId);
  return userId;
}

function resCookie(req, name, value) {
  req.res.cookie(name, value, { httpOnly: false });
}

app.get('/data', (req, res) => {
  const userId = getUser(req);
  const { search = '', start = 0, count = 20 } = req.query;
  const state = userStates[userId];
  const filtered = state.order.filter(id => id.toString().includes(search));
  const slice = filtered.slice(Number(start), Number(start) + Number(count));
  const items = slice.map(id => ({ id, selected: state.selected.has(id) }));
  res.json({ items, total: filtered.length });
});

app.post('/select', (req, res) => {
  const userId = getUser(req);
  const { id, selected } = req.body;
  const state = userStates[userId];
  if (selected) state.selected.add(id); else state.selected.delete(id);
  res.json({ status: 'ok' });
});

app.post('/order', (req, res) => {
  const userId = getUser(req);
  const { search = '', fromIndex, toIndex } = req.body;
  const state = userStates[userId];
  const order = state.order;
  const filteredIndices = [];
  for (let i = 0; i < order.length; i++) {
    if (order[i].toString().includes(search)) filteredIndices.push(i);
  }
  const fromGlobal = filteredIndices[fromIndex];
  let toGlobal = filteredIndices[toIndex];
  const [moved] = order.splice(fromGlobal, 1);
  if (fromGlobal < toGlobal) toGlobal -= 1;
  order.splice(toGlobal, 0, moved);
  res.json({ status: 'ok' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
