import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('public/css', { recursive: true });
await copyFile('index.html', 'public/invitation-editor.html');
await copyFile('css/styles.css', 'public/css/styles.css');
