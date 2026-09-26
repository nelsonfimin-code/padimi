import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { refineLocal } from './src/refine.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT || 3000);

const send = (res, status, type, body) => { res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(body); };

async function readJson(req) {
  let body = ''; for await (const chunk of req) body += chunk;
  return JSON.parse(body || '{}');
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/refine') {
      const { text, mode = 'natural' } = await readJson(req);
      if (typeof text !== 'string' || !text.trim()) return send(res, 400, 'application/json', JSON.stringify({ error: 'Text is required' }));
      if (process.env.GROQ_API_KEY) {
        const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
          body: JSON.stringify({ model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant', messages: [
            { role: 'system', content: 'You edit text precisely. Preserve meaning and voice. Output only the finished text.' },
            { role: 'user', content: `You are PADIMI, a personal writing editor. ${mode === 'clear' ? 'Make the writing clear and easy to read. Remove unnecessary filler and repetition.' : mode === 'strong' ? 'Make the writing more direct and confident without sounding aggressive or corporate.' : 'Lightly improve the writing so it sounds natural, clean, and human.'} Keep meaning, personality, formality, paragraph breaks, and facts. Return only the rewritten text.\n\nDRAFT:\n${text.trim()}` }
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
    if (!file.startsWith(dist)) return send(res, 403, 'text/plain', 'Forbidden');
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      const ext = path.extname(file); const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.json':'application/json' };
      return send(res, 200, types[ext] || 'application/octet-stream', fs.readFileSync(file));
    }
    return send(res, 404, 'text/plain', 'Not found');
  } catch (e) { return send(res, 500, 'application/json', JSON.stringify({ error: 'Server error' })); }
});
server.listen(port, '0.0.0.0', () => console.log(`PADIMI listening on ${port}`));
