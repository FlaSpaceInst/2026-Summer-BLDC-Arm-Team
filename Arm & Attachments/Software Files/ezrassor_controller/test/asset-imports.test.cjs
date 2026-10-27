// Verify local asset imports before attempting an Expo web build.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function listSourceFiles(directory) {
  const files = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

test('no source file contains an unresolved ezrassor-app asset alias', () => {
  const files = [path.join(projectRoot, 'App.js'), ...listSourceFiles(path.join(projectRoot, 'src'))];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.doesNotMatch(content, /ezrassor-app\/assets\//, path.relative(projectRoot, filePath));
  }
});

test('every statically referenced local asset exists', () => {
  const files = [path.join(projectRoot, 'App.js'), ...listSourceFiles(path.join(projectRoot, 'src'))];
  const assetReference = /(?:from\s*|require\s*\(\s*)['"](\.{1,2}\/[^'"]+\.(?:png|jpg|jpeg|webp|json|ttf))['"]/g;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    let match;

    while ((match = assetReference.exec(content)) !== null) {
      const resolved = path.resolve(path.dirname(filePath), match[1]);
      assert.ok(fs.existsSync(resolved), `Missing asset: ${path.relative(projectRoot, filePath)} -> ${match[1]}`);
    }

    assetReference.lastIndex = 0;
  }
});
