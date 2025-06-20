import { workbenchStore } from '~/lib/stores/workbench';

// debug function to see current state
export function debugFileState() {
  const files = workbenchStore.files.get();
  const selectedFile = workbenchStore.selectedFile.get();
  const currentDocument = workbenchStore.currentDocument.get();

  console.log('=== DEBUG FILE STATE ===');
  console.log('Available files:', Object.keys(files));
  console.log('Selected file:', selectedFile);
  console.log('Current document:', currentDocument?.filePath);
  console.log('Files store:', files);

  // debug file contents to check for duplicates
  console.log('\n=== FILE CONTENTS DEBUG ===');

  const fileContents = new Map();
  const duplicateGroups = new Map();

  for (const [filePath, dirent] of Object.entries(files)) {
    if (dirent?.type === 'file') {
      const content = dirent.content;
      const contentHash = content.substring(0, 200); // first 200 chars as hash
      const fullContentHash = content; // full content for exact matching

      console.log(`File: ${filePath}`);
      console.log(`Content length: ${content.length}`);
      console.log(`Content preview: ${contentHash}...`);

      // check for duplicate content (exact match)
      if (fileContents.has(fullContentHash)) {
        const existingFile = fileContents.get(fullContentHash);

        console.warn(`⚠️  EXACT DUPLICATE CONTENT! File "${filePath}" has identical content to "${existingFile}"`);

        if (!duplicateGroups.has(fullContentHash)) {
          duplicateGroups.set(fullContentHash, [existingFile]);
        }

        duplicateGroups.get(fullContentHash).push(filePath);
      } else {
        fileContents.set(fullContentHash, filePath);
      }

      // check for similar content (first 200 chars)
      const similarFiles = [];

      for (const [existingHash, existingFile] of fileContents.entries()) {
        if (existingHash !== fullContentHash && existingHash.substring(0, 200) === contentHash) {
          similarFiles.push(existingFile);
        }
      }

      if (similarFiles.length > 0) {
        console.warn(`⚠️  SIMILAR CONTENT! File "${filePath}" has similar content to: ${similarFiles.join(', ')}`);
      }

      console.log('---');
    }
  }

  // summary of duplicates
  if (duplicateGroups.size > 0) {
    console.log('\n=== DUPLICATE CONTENT SUMMARY ===');

    for (const [content, files] of duplicateGroups.entries()) {
      console.warn(`Duplicate group (${files.length} files):`);
      files.forEach((file: string) => console.warn(`  - ${file}`));
      console.log(`Content preview: ${content.substring(0, 100)}...`);
      console.log('---');
    }
  } else {
    console.log('\n✅ No duplicate content detected');
  }

  console.log('========================');
}

/**
 * Test function to simulate and debug file creation issues.
 * Call this from browser console after asking AI to create multiple files.
 */
export function testFileCreation() {
  console.log('=== FILE CREATION TEST ===');

  // run the existing debug function
  debugFileState();

  // additional checks specific to the duplicate content issue
  const files = workbenchStore.files.get();
  const fileEntries = Object.entries(files).filter(([, dirent]) => dirent?.type === 'file');

  if (fileEntries.length === 0) {
    console.warn('⚠️  No files found! AI may not have created any files yet.');
    return;
  }

  console.log(`\n=== TESTING ${fileEntries.length} FILES ===`);

  const contentMap = new Map();
  let duplicateCount = 0;

  fileEntries.forEach(([filePath, dirent]) => {
    if (dirent?.type === 'file') {
      const content = dirent.content;
      const contentSignature = content.trim();

      if (contentMap.has(contentSignature)) {
        duplicateCount++;

        const originalFile = contentMap.get(contentSignature);

        console.error(`🚨 DUPLICATE CONTENT DETECTED!`);
        console.error(`   File 1: ${originalFile}`);
        console.error(`   File 2: ${filePath}`);
        console.error(`   Content: "${contentSignature.substring(0, 100)}..."`);
      } else {
        contentMap.set(contentSignature, filePath);
      }
    }
  });

  if (duplicateCount === 0) {
    console.log('✅ SUCCESS: No duplicate content detected!');
  } else {
    console.error(`❌ FAILED: Found ${duplicateCount} files with duplicate content`);
  }
}

// add debug functions to window for browser console access
if (typeof window !== 'undefined') {
  (window as any).debugFileState = debugFileState;
  (window as any).testFileCreation = testFileCreation;
}
