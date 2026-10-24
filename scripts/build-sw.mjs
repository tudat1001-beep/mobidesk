import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const assets = [
  "/",
  "/index.html",
  "/icon.svg",
  "/manifest.webmanifest",
  ...(await readdir("dist/assets"))
    .filter((f) => /\.(js|css)$/.test(f))
    .map((f) => `/assets/${f}`),
];
const version = createHash("sha256")
  .update(await readFile("dist/index.html"))
  .update(await readFile(new URL(import.meta.url)))
  .digest("hex")
  .slice(0, 12);
await writeFile(
  "dist/sw.js",
  `const NAME='mobidesk-${version}';const FILES=${JSON.stringify(assets)};
self.addEventListener('install', e=>e.waitUntil(caches.open(NAME).then(c=>c.addAll(FILES))));
self.addEventListener('activate', e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('mobidesk-')&&k!==NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;const cached=p=>caches.open(NAME).then(c=>c.match(p,{ignoreVary:true}));if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>cached('/index.html')));return;}if(FILES.includes(u.pathname)){e.respondWith(cached(e.request).then(v=>v||fetch(e.request)));}});
`,
);
const migrations = (await readdir("supabase/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort();
await writeFile(
  "dist/supabase-setup.sql",
  (
    await Promise.all(
      migrations.map((f) => readFile("supabase/migrations/" + f, "utf8")),
    )
  ).join("\n\n"),
);
