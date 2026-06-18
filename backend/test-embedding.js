import dotenv from 'dotenv';
dotenv.config();

import geminiService from './src/services/gemini.service.js';

async function run() {
  try {
    console.log('Testing text-embedding-004 via new @google/genai SDK...');
    const result = await geminiService.generateEmbeddings(['This is a test document.']);
    console.log('\n✅ Success! Embeddings generated. Length:', result[0].length);
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

run();
