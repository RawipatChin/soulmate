import { compile, optimize } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const homePath = path.join(root, 'stitch_soulmate_e_commerce', 'soulmate_mobile_homepage_refined', 'code.html');
const generatedConfig = path.join(root, 'tmp', 'home-tailwind.config.cjs');
const output = path.join(root, 'public', 'home-template.css');
const html = await readFile(homePath, 'utf8');
const match = html.match(/<script id="tailwind-config" type="text\/plain">tailwind\.config\s*=\s*([\s\S]*?)<\/script>/);
if (!match) throw new Error('Homepage Tailwind configuration was not found');

await mkdir(path.dirname(generatedConfig), { recursive: true });
const config = match[1].trim().replace(/;$/, '')
  .replaceAll('["Inter"]', '["Inter", "Arial", "sans-serif"]')
  .replaceAll('["Plus Jakarta Sans"]', '["Plus Jakarta Sans", "Arial", "sans-serif"]');
await writeFile(generatedConfig, `module.exports = ${config};\n`);

try {
  const sourceFiles = [
    homePath,
    path.join(root, 'src', 'components', 'ScreenRenderer.tsx'),
    path.join(root, 'src', 'components', 'storefront', 'StorefrontProductCard.tsx'),
  ];
  const scanner = new Scanner({ sources: [] });
  const candidates = scanner.scanFiles(await Promise.all(sourceFiles.map(async (file) => ({
    content: await readFile(file, 'utf8'),
    extension: path.extname(file).slice(1),
  }))));
  console.log(`Found ${candidates.length} Tailwind class candidates`);
  const input = '@import "tailwindcss" source(none); @config "./tmp/home-tailwind.config.cjs";';
  const compiler = await compile(input, { base: root, onDependency() {} });
  const css = compiler.build(candidates);
  const optimized = optimize(css, { minify: true });
  await writeFile(output, optimized.code);
  console.log(`Generated ${path.relative(root, output)} (${Buffer.byteLength(optimized.code)} bytes)`);
} finally {
  await rm(generatedConfig, { force: true });
}
