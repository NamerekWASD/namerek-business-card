import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// From the repository root, not `import.meta.url`: under jsdom that is not a
// file URL.
const DIR = 'src/flat';

/**
 * The flat card's whole stylesheet as one string, its parts joined in the
 * order `flat.css` imports them — the text the tests search by rule header.
 * Test-only: it reads the disk.
 */
export function readFlatCss() {
  return [...readFileSync(join(DIR, 'flat.css'), 'utf8').matchAll(/@import '([^']+)';/g)]
    .map(([, path]) => readFileSync(join(DIR, path), 'utf8'))
    .join('\n');
}
