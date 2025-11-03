const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 4000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me'

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Mongo connection error:', err.message);
    process.exit(1);
  });

const queueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  studentId: { type: String, required: false, index: true },
  number: { type: Number, required: true, index: true },
  createdAt: { type: Date, default: Date.now }
});

const QueueItem = mongoose.model('QueueItem', queueSchema);

// Get full queue (sorted by number)
app.get('/api/queue', async (req, res) => {
  const items = await QueueItem.find().sort({ number: 1, createdAt: 1 });
  res.json(items);
});

// Health check for deployment platforms
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Admin login - returns JWT if password matches
app.post('/api/admin/login', async (req, res) => {
  const { password } = req.body || {}
  if (!password) return res.status(400).json({ error: 'password required' })
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'invalid password' })
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' })
  res.json({ token })
})

// middleware to require admin token
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (!m) return res.status(401).json({ error: 'missing token' })
  const token = m[1]

  // Simple dev mode: allow raw ADMIN_PASSWORD as bearer token
  if (token === ADMIN_PASSWORD) {
    req.admin = { role: 'admin', via: 'password' }
    return next()
  }

  // Fallback: support JWT tokens if present (older clients)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    if (payload.role !== 'admin') return res.status(403).json({ error: 'forbidden' })
    req.admin = payload
    return next()
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' })
  }
}

// Join queue - assigns next highest number (end of queue)
app.post('/api/join', async (req, res) => {
  const { name, studentId } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const last = await QueueItem.findOne().sort({ number: -1 });
  const nextNumber = last ? last.number + 1 : 1;
  const item = new QueueItem({ name, studentId: studentId || null, number: nextNumber });
  await item.save();
  res.status(201).json(item);
});

// Complete first-in-line (or by id) - ADMIN only
app.post('/api/complete/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  // Remove the item
  const removed = await QueueItem.findByIdAndDelete(id);
  if (!removed) return res.status(404).json({ error: 'not found' });

  // Decrement numbers for items that were after the removed one
  await QueueItem.updateMany({ number: { $gt: removed.number } }, { $inc: { number: -1 } });

  res.json({ removedId: id });
});

// Endpoint to clear all (dev)
app.post('/api/clear', async (req, res) => {
  await QueueItem.deleteMany({});
  res.json({ ok: true });
});

// If a built frontend exists in ../frontend/dist, serve it as static files (useful when deploying
// a single service that hosts both backend and frontend).
const path = require('path');
const fs = require('fs');
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  console.log('Serving frontend from', distPath)
  try {
    const list = fs.readdirSync(distPath).slice(0, 20)
    console.log('frontend/dist contents (top 20):', list)
  } catch (e) {
    console.error('Error reading dist directory:', e && e.message)
  }
  app.use(express.static(distPath));
  // SPA fallback - send index.html for any non-API route
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path === '/health') return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(distPath, 'index.html'))
  })
}
else {
  console.log('frontend/dist not found at', distPath)
}

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
