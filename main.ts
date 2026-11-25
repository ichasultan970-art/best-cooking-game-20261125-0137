// Ember & Pass — entry hand-in program (Node 22, standard library only).
// Copies game/ and screenshots/ into MAKEFUN_OUTPUT_DIR (or /output) and emits deterministic dossier.json.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const GATE_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
} as const;

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });

const screenshotsSrc = join(repoRoot, 'screenshots');
const screenshotsOut = join(outDir, 'screenshots');
mkdirSync(screenshotsOut, { recursive: true });
if (existsSync(screenshotsSrc)) {
  cpSync(screenshotsSrc, screenshotsOut, { recursive: true });
}

const dossierBytes = buildDossier(outDir, GATE_CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossierBytes);
process.stdout.write(`wrote dossier.json (${dossierBytes.byteLength} bytes) to ${outDir}\n`);
