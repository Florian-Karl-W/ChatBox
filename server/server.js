import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8787;
const API_KEY = process.env.DAIJOBU_API_KEY;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.join(__dirname, '../frontend');

app.use(express.json());

app.use(express.static(FRONTEND_DIR));
app.get('/', (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/api/chat', async (req, res) => {
  const { prompt, session_id, stream = false, rag = false } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing prompt (string)' });
  }

  const sid =
    (typeof session_id === 'string' && session_id) ||
    (globalThis.crypto?.randomUUID?.() || String(Date.now()));

  try {
    const upstream = await fetch('https://platform.daijobu.ai/api/llm/test-technique/prompt', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, session_id: sid, stream, rag })
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        success: false,
        error: (data && (data.message || data.error)) || 'Upstream error'
      });
    }

    return res.json({
      success: true,
      session_id: (data && data.session_id) || sid,
      status: (data && data.status) || 'final',
      message: (data && data.message) || ''
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Proxy error' });
  }
});

app.listen(PORT, () => {
  console.log(`[proxy] Listening on http://localhost:${PORT}`);
});