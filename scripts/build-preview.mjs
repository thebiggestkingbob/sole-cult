import { build } from "esbuild";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const model = (await readFile("public/models/preview-sneaker.glb")).toString(
  "base64",
);
const images = await Promise.all(
  Array.from(
    { length: 7 },
    async (_, i) =>
      "data:image/png;base64," +
      (await readFile(`public/shoes/preview-${i + 1}.png`)).toString("base64"),
  ),
);
const source = `import React from 'react';import {createRoot} from 'react-dom/client';import Storefront from './components/storefront';import About from './components/about';import {demoProducts} from './data/demo-products';
const bytes=Uint8Array.from(atob(${JSON.stringify(model)}),c=>c.charCodeAt(0));const model=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));const images=${JSON.stringify(images)};demoProducts.forEach((p,i)=>{p.model=model;p.image=images[i]});
const root=createRoot(document.getElementById('root'));function render(){root.render(location.hash==='#about'?<About preview/>:<Storefront demo/>)}addEventListener('hashchange',render);render();`;
const result = await build({
  stdin: {
    contents: source,
    resolveDir: root,
    sourcefile: "preview-entry.tsx",
    loader: "tsx",
  },
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  target: "es2022",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  alias: {
    "next/link": path.join(root, "scripts/preview-shims/link.tsx"),
    "next/dynamic": path.join(root, "scripts/preview-shims/dynamic.tsx"),
  },
  logLevel: "warning",
});
const script = result.outputFiles[0].text.replaceAll("</script", "<\\/script");
const css = await readFile("app/globals.css", "utf8");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>SOLE CULT — Interactive design preview</title><style>${css}</style></head><body><div id="root"></div><script>${script}</script></body></html>`;
await mkdir("artifacts", { recursive: true });
await writeFile("artifacts/sole-cult-preview.html", html);
console.log(
  "Created self-contained offline preview:",
  (Buffer.byteLength(html) / 1024 / 1024).toFixed(1),
  "MB",
);
