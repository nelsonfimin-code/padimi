import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { refineLocal } from './src/refine.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT || 3000);

const send = (res, status, type, body, cache='no-store') => { res.writeHead(status, { 'Content-Type': type, 'Cache-Control': cache }); res.end(body); };

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 500_000) throw Object.assign(new Error('Request too large'), { statusCode: 413 });
  }
  try { return JSON.parse(body || '{}'); } catch { throw Object.assign(new Error('Invalid JSON'), { statusCode: 400 }); }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return send(res, 200, 'application/json', JSON.stringify({ status: 'ok', service: 'padimi' }));
    }

    if (req.method === 'POST' && req.url === '/api/refine') {
      const { text, mode = 'natural', tone = 'neutral' } = await readJson(req);
      if (typeof text !== 'string' || !text.trim()) return send(res, 400, 'application/json', JSON.stringify({ error: 'Text is required' }));
      if (!['clear', 'natural', 'strong'].includes(mode)) return send(res, 400, 'application/json', JSON.stringify({ error: 'Invalid mode' }));
      if (!['neutral', 'professional', 'friendly', 'casual', 'funny', 'confident', 'polite'].includes(tone)) return send(res, 400, 'application/json', JSON.stringify({ error: 'Invalid tone' }));
      if (process.env.GROQ_API_KEY) {
        const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
          body: JSON.stringify({ model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant', messages: [
            { role: 'system', content: 'You edit text precisely. Preserve meaning and voice. Output only the finished text.' },
            { role: 'user', content: `You are PADIMI, a personal writing editor. ${mode === 'clear' ? 'Make the writing clear and easy to read. Remove unnecessary filler and repetition.' : mode === 'strong' ? 'Make the writing more direct and confident without sounding aggressive or corporate.' : 'Lightly improve the writing so it sounds natural, clean, and human.'} ${({neutral:'Use a neutral, natural tone.',professional:'Use a professional, polished tone. Keep it human and avoid corporate jargon.',friendly:'Use a friendly, warm tone. Sound approachable, not overly cheerful.',casual:'Use a relaxed, casual tone. Keep it natural and easy to read.',funny:'Use light, natural humor where it fits. Do not force jokes or change the meaning.',confident:'Use a confident tone. Sound clear and self-assured without sounding arrogant.',polite:'Use a polite and considerate tone. Keep it clear without sounding overly formal.'})[tone]} Keep meaning, personality, paragraph breaks, and facts. Return only the rewritten text.\n\nDRAFT:\n${text.trim()}` }
          ], temperature: mode === 'strong' ? 0.35 : 0.2, max_tokens: Math.min(4000, Math.max(256, text.length * 2)) })
        });
        const data = await upstream.json();
        const output = data?.choices?.[0]?.message?.content?.trim();
        if (upstream.ok && output) return send(res, 200, 'application/json', JSON.stringify({ text: output, provider: 'groq' }));
      }
      return send(res, 200, 'application/json', JSON.stringify({ text: refineLocal(text, mode), provider: 'local' }));
    }

    let url = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    const file = path.normalize(path.join(dist, url));
    const relative = path.relative(dist, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return send(res, 403, 'text/plain', 'Forbidden');
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      const ext = path.extname(file); const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.json':'application/json' };
      return send(res, 200, types[ext] || 'application/octet-stream', fs.readFileSync(file));
    }
    return send(res, 404, 'text/plain', 'Not found');
  } catch (e) {
    const status = Number.isInteger(e?.statusCode) ? e.statusCode : 500;
    return send(res, status, 'application/json', JSON.stringify({ error: status === 500 ? 'Server error' : e.message }));
  }
});
server.listen(port, '0.0.0.0', () => console.log(`PADIMI listening on ${port}`));
