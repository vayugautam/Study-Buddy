import { GoogleGenAI } from '@google/genai';
import config from './src/config/env.config.js';

const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });

async function list() {
  const models = await ai.models.list();
  for await (const m of models) {
    if (m.name.includes('embed')) console.log(m.name);
  }
}
list().catch(console.error);
