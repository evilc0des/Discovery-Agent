/**
 * Raw HTTP test: bypass the ai SDK and hit DO directly via fetch().
 * This isolates whether the issue is the SDK protocol or the DO endpoint.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(filePath: string) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch { /* ok */ }
}
loadEnvFile(resolve(process.cwd(), '.env.local'));

const TOKEN = process.env.DIGITALOCEAN_TOKEN;
if (!TOKEN) { console.error('Missing DIGITALOCEAN_TOKEN'); process.exit(1); }

const BASE = 'https://inference.do-ai.run/v1';

async function fetchDO(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`   HTTP ${res.status}`);
  try {
    const json = JSON.parse(text);
    if (json.error) {
      console.log(`   Error: ${json.error.message ?? JSON.stringify(json.error)}`);
    } else {
      console.log(`   Response: ${text.slice(0, 300)}`);
    }
  } catch {
    console.log(`   Raw (first 300 chars): ${text.slice(0, 300)}`);
  }
}

async function main() {
  console.log(`Testing DO endpoint: ${BASE}\n`);

  // Test models endpoint first (to see available models)
  console.log('1. GET /v1/models');
  const modelsRes = await fetch(`${BASE}/models`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` },
  });
  const modelsText = await modelsRes.text();
  console.log(`   HTTP ${modelsRes.status}`);
  console.log(`   First 500 chars: ${modelsText.slice(0, 500)}\n`);

  // Test simple chat completion
  console.log('2. POST /v1/chat/completions (simple)');
  await fetchDO('/chat/completions', {
    model: 'llama3.3-70b-instruct',
    messages: [{ role: 'user', content: 'Say hello in one word.' }],
    max_completion_tokens: 10,
    stream: false,
  });
  console.log();

  // Test with json_object format
  console.log('3. POST /v1/chat/completions (json_object)');
  await fetchDO('/chat/completions', {
    model: 'llama3.3-70b-instruct',
    messages: [{ role: 'user', content: 'Return JSON: {"status":"ok"}' }],
    response_format: { type: 'json_object' },
    max_completion_tokens: 50,
    stream: false,
  });
  console.log();

  // Test with json_schema format (the critical one)
  console.log('4. POST /v1/chat/completions (json_schema - strict)');
  await fetchDO('/chat/completions', {
    model: 'llama3.3-70b-instruct',
    messages: [{ role: 'user', content: 'Return a discovery response.' }],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'test',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            score: { type: 'number' },
          },
          required: ['message', 'score'],
          additionalProperties: false,
        },
      },
    },
    max_completion_tokens: 100,
    stream: false,
  });
  console.log();
}

main().catch((e) => { console.error(e); process.exit(1); });
