import dotenv from 'dotenv';
dotenv.config();

import pdfService from './src/services/pdf.service.js';
import embeddingsService from './src/services/embeddings.service.js';
import path from 'path';
import fs from 'fs/promises';

async function run() {
  try {
    console.log('1. Starting test debug...');
    
    // Find a PDF in the uploads folder
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const files = await fs.readdir(uploadsDir).catch(() => []);
    const pdfFile = files.find(f => f.endsWith('.pdf'));
    
    if (!pdfFile) {
      console.log('❌ No PDF found in uploads directory to test with.');
      return;
    }
    
    const filePath = path.join(uploadsDir, pdfFile);
    console.log('2. Found PDF:', pdfFile);
    
    console.log('3. Extracting text...');
    const { text, pageCount } = await pdfService.extractText(filePath);
    console.log(`✅ Text extracted! Page count: ${pageCount}, Text length: ${text.length}`);
    
    console.log('4. Chunking text...');
    const chunks = await embeddingsService.chunkText(text);
    console.log(`✅ Chunks generated! Count: ${chunks.length}`);
    
    console.log('5. Generating and storing embeddings (using gemini-embedding-2)...');
    const result = await embeddingsService.embedAndStore({
      noteId: 'test_note_123',
      ownerId: 'test_owner_456',
      chunks,
      originalFilename: pdfFile,
    });
    console.log('✅ Embeddings successfully stored!', result);
    
    console.log('\n✅ ALL SYSTEMS GO! The backend pipeline works perfectly.');
  } catch (error) {
    console.error('\n❌ ERROR during pipeline test:', error);
  }
}

run();
