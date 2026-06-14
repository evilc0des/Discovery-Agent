import { createOpenAI, openai } from '@ai-sdk/openai';

export const digitalocean = createOpenAI({
  baseURL: 'https://inference.do-ai.run/v1',
  apiKey: process.env.DIGITALOCEAN_TOKEN,
});

export const DO_MODEL = 'deepseek-v4-pro';

export { openai };
