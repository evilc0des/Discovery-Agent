/**
 * Smoke test: DigitalOcean serverless inference.
 *
 * Usage:
 *   npx tsx scripts/smoke-test-do.ts
 *
 * Tries multiple models (starting with direct gpt-4o, then falling back to open-source models)
 * and tests both basic connectivity and strict JSON schema support.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { generateText, generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

// ---- load .env.local -------------------------------------------------------

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

// ---- config ----------------------------------------------------------------

const DO_BASE_URL = 'https://inference.do-ai.run/v1';

const CANDIDATE_MODELS = [
  'openai-gpt-4o',
  'openai-gpt-4o-mini',
  'openai-gpt-4.1',
  'openai-o3-mini',
  'deepseek-v4-pro',
  'deepseek-3.2',
  'llama3.3-70b-instruct',
  'llama-4-maverick',
  'qwen3.5-397b-a17b',
  'mistral-3-14B',
  'gemma-4-31B-it',
];

const token = process.env.DIGITALOCEAN_TOKEN;
if (!token) {
  console.error('❌ DIGITALOCEAN_TOKEN not found in .env.local or environment.');
  process.exit(1);
}

const digitalocean = createOpenAI({ baseURL: DO_BASE_URL, apiKey: token });

// ---- schema subset ---------------------------------------------------------

const smokeSchema = z.object({
  message: z.string(),
  state_update: z.object({
    coverage: z.object({
      product_context: z.number().min(0).max(1),
      functional: z.number().min(0).max(1),
      aesthetics: z.number().min(0).max(1),
    }),
    extracted: z.array(z.object({ key: z.string(), value: z.string() })),
    contradictions: z.array(z.string()),
    open_questions: z.array(z.string()),
    assumptions: z.array(z.string()),
  }),
  reasoning: z.string(),
});

// ---- test helpers ----------------------------------------------------------

async function testConnectivity(model: string): Promise<boolean> {
  try {
    const r = await generateText({
      model: digitalocean.chat(model),
      prompt: 'Say "OK" and nothing else.',
      maxTokens: 10,
    });
    console.log(`   ✅ connectivity      → "${r.text.trim()}"`);
    return true;
  } catch (e: any) {
    const msg = e.message?.slice(0, 150) ?? String(e);
    console.log(`   ❌ connectivity      → ${msg}`);
    return false;
  }
}

async function testStructuredOutput(model: string): Promise<boolean> {
  try {
    const r = await generateObject({
      model: digitalocean.chat(model),
      schema: smokeSchema,
      system: 'You are a product discovery assistant. Respond with valid JSON matching the schema exactly.',
      prompt: 'Client: "I need a task management app." Provide 2 open questions and 2 assumptions.',
      maxTokens: 500,
    });
    console.log(`   ✅ structured output → "${r.object.message.slice(0, 80)}..."`);
    return true;
  } catch (e: any) {
    const msg = e.message?.slice(0, 200) ?? String(e);
    console.log(`   ❌ structured output → ${msg}`);
    return false;
  }
}

// ---- main ------------------------------------------------------------------

async function main() {
  console.log(`🔍 DO endpoint: ${DO_BASE_URL}\n`);

  for (const model of CANDIDATE_MODELS) {
    console.log(`Testing: ${model}`);
    const ok = await testConnectivity(model);
    if (!ok) {
      console.log();
      continue;
    }
    await testStructuredOutput(model);
    console.log();
  }

  console.log('🏁 Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
