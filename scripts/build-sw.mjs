import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const assets = [
  "/",
  "/index.html",
  "/icon.svg",
  "/manifest.webmanifest",
  "/huong-dan-su-dung.md",
  ...(await readdir("dist/assets"))
    .filter((f) => /\.(js|css)$/.test(f))
    .map((f) => `/assets/${f}`),
];
const version = createHash("sha256")
  .update(await readFile("dist/index.html"))
  .update(await readFile(new URL(import.meta.url)))
  .digest("hex")
  .slice(0, 12);
const guide = JSON.parse(await readFile("src/content/user-guide.json", "utf8"));
if (
  !guide.sections.length ||
  new Set(guide.sections.map((s) => s.id)).size !== guide.sections.length ||
  guide.sections.some(
    (s) => !/^[a-z0-9-]+$/.test(s.id) || !s.title || !s.steps.length,
  )
)
  throw new Error("Hướng dẫn cần mã mục duy nhất, tiêu đề và các bước đầy đủ.");
const markdown =
  `# ${guide.title}\n\nCập nhật: ${guide.version}\n\n${guide.intro}\n\n## Mục lục\n\n` +
  guide.sections.map((s) => `- [${s.title}](#${s.id})`).join("\n") +
  "\n\n" +
  guide.sections
    .map(
      (s) =>
        `<a name="${s.id}"></a>\n\n## ${s.title}\n\n${s.intro}\n\n${s.steps.map((step, i) => `${i + 1}. ${step}`).join("\n\n")}\n\n${s.example ? `> ${s.example}\n\n` : ""}### Cần nhớ\n\n${s.notes.map((note) => `- ${note}`).join("\n\n")}\n`,
    )
    .join("\n");
await writeFile("dist/huong-dan-su-dung.md", markdown);
await writeFile("docs/HUONG-DAN-SU-DUNG.md", markdown);
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
