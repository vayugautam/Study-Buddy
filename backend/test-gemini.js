import dotenv from 'dotenv';
dotenv.config();

import geminiService from './src/services/gemini.service.js';

async function run() {
  try {
    console.log('Testing gemini-2.5-flash via new @google/genai SDK...');
    const result = await geminiService.generateChatResponse(
      'You are a helpful assistant.',
      [],
      'Explain recursion in simple words.'
    );
    console.log('\n✅ Success! Response:\n');
    console.log(result);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

run();
