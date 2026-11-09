import { cp, copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'dist');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all([
  copyFile(join(root, 'index.html'), join(output, 'index.html')),
  copyFile(join(root, 'styles.css'), join(output, 'styles.css')),
  cp(join(root, 'src'), join(output, 'src'), { recursive: true }),
  cp(join(root, 'assets'), join(output, 'assets'), { recursive: true }),
  mkdir(join(output, 'clients'), { recursive: true })
]);
await copyFile(join(root, 'clients', 'fam-vornicu.json'), join(output, 'clients', 'fam-vornicu.json'));
await writeFile(join(output, '.nojekyll'), '', 'utf8');
