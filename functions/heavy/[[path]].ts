// SPDX-License-Identifier: AGPL-3.0-or-later
// Pages Function: `o-inclusionista.jrocha.dev.br/heavy/*` → R2 bucket `the-inclusionist-lfs`.
//
// 🔴 ONE FUNCTION SERVES EVERY GAME ON THE ORIGIN (ADR-0117). `/heavy/*` lives at the DOMAIN ROOT, not
// under `/<slug>/`, because games put `<base href="/" />` in their `index.html` so `document.baseURI`
// falls on the root. With `baseURI` at `/`, the engine's `new URL('heavy/<host><path>', doc.baseURI)`
// resolves to `/heavy/<host><path>` — the same URL for every game, and the browser's HTTP cache shares
// by URL. The engine's own `CacheStorage('incl-pesados-v2')` already keys by upstream URL
// (`platform/heavy.deliveryCacheKey`), so the named cache shares too; now the browser cache shares as
// well. Two levels of dedup.
//
// 📌 2048 DECLINES EVERY HEAVY PORT (H3's `declines.noNeuralVoice: true`, D5's `uses: undefined`), so
// this game produces NO `/heavy/*` requests at run time. The function lands anyway for parity with the
// catalogue's shape — a game that turns `uses.neuralVoice` on later needs no new file.
//
// ⚠️ THE BUCKET LAYOUT IS LFS-SHAPED (`vosk-models/...`, `kokoro-82m-v1.0-onnx/onnx/...`,
// `mediapipe-tasks-vision-1.0.1/models/...`), NOT the delivery's `heavy/<host><path>`. The engine has
// the translation table in `platform/heavy-mirror.MIRROR_FOLDERS`; copied here rather than imported for
// three reasons spelled out in the pasted guide:
//
//   1. Pages Functions run in the Workers runtime; `esbuild` under Pages treats
//      `@the-inclusionist/engine/platform/heavy-mirror.js` as external by default, and the import would
//      fail at run time.
//   2. The table is small and moves once per engine release.
//   3. A deploy that drifted it would 404 a whole class of files with a red line in the Pages log — a
//      silent `null` would be worse.
//
// 📌 TO KEEP IN SYNC: on every engine bump, run
//     node -p "require('@the-inclusionist/engine/platform/heavy-mirror.js').MIRROR_FOLDERS"
// and diff against the table below. The forward gate `tests/deploy-config.node.test.ts` holds this check
// as source-reads: engine's table vs ours. Measured against 11.0.0.

/** Upstream prefix → folder in the LFS bucket. Copied from `@the-inclusionist/engine/platform/
 *  heavy-mirror.js` of version 11.0.0. No trailing slash, exactly as there. */
const MIRROR_FOLDERS: ReadonlyArray<readonly [string, string]> = [
  ['https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main', 'kokoro-82m-v1.0-onnx'],
  ['https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1', 'mediapipe-tasks-vision-1.0.1/tasks-vision@1.0.1'],
  ['https://storage.googleapis.com/mediapipe-models', 'mediapipe-tasks-vision-1.0.1/models'],
  ['https://lfs-oinclusionista.jrocha.dev.br/whisper-small-onnx', 'whisper-small-onnx'],
  ['https://lfs-oinclusionista.jrocha.dev.br/moonshine-streaming-small-onnx', 'moonshine-streaming-small-onnx'],
  ['https://lfs-oinclusionista.jrocha.dev.br/moonshine-streaming-small-es-onnx', 'moonshine-streaming-small-es-onnx'],
  ['https://lfs-oinclusionista.jrocha.dev.br/vosk-browser-dynamic-execution-0', 'vosk-browser-dynamic-execution-0'],
  ['https://lfs-oinclusionista.jrocha.dev.br/vosk-models', 'vosk-models'],
  ['https://lfs-oinclusionista.jrocha.dev.br/espeak-ng-530bf0a', 'espeak-ng-530bf0a'],
  ['https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0', 'onnxruntime-web-1.27.0'],
  ['https://lfs-oinclusionista.jrocha.dev.br/fonts', 'fonts'],
];

/** `heavy/<host><path>` → folder in the LFS bucket, or `null` if the request maps nowhere. */
function mirrorKey(heavyPath: string): string | null {
  // `heavyPath` arrives as e.g.: `huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/model.onnx`.
  // Rebuild the upstream URL and look it up in the table. The `?sha256=...` the engine puts on the URL stays
  // with the cache; it is not the pathname and never reaches R2.
  const upstream = 'https://' + heavyPath;
  for (const [prefix, folder] of MIRROR_FOLDERS) {
    if (upstream.startsWith(prefix + '/')) return folder + upstream.slice(prefix.length);
  }
  return null;
}

interface Env {
  readonly LFS: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, request, env }) => {
  const parts = Array.isArray(params.path) ? params.path : [params.path ?? ''];
  const heavyPath = parts.filter(Boolean).join('/');
  if (!heavyPath) return new Response('heavy: no path', { status: 400 });

  const key = mirrorKey(heavyPath);
  if (!key) {
    // A request outside the catalogue (unknown host): do not serve the bucket. Clear 404 so the engine
    // marks the subsystem as `sem-fonte` without guessing.
    return new Response(`heavy: ${heavyPath} is not in the mirror catalogue`, { status: 404 });
  }

  /*
   * ⚠️ `onlyIf: etagMatches` READS THE REQUEST ETAG to answer 304 if the child already has the latest.
   * The engine's checked cache uses `?sha256=<hash>` as a cache-buster, so `heavy/*` are immutable: two
   * different bodies never share a URL, and a 200 is good forever.
   */
  const inm = request.headers.get('if-none-match');
  const etagClean = inm?.replace(/^W\//, '').replace(/^"|"$/g, '');
  const obj = await env.LFS.get(key, etagClean ? { onlyIf: { etagMatches: etagClean } } : undefined);
  if (!obj) {
    if (etagClean) return new Response(null, { status: 304 });
    return new Response(`heavy: ${key} not in bucket`, { status: 404 });
  }

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  // 📌 IMMUTABLE because the engine arrives with `?sha256=<hash>` on the URL (`platform/heavy.js:284`).
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  // CORS: port left open on purpose. Today the platform and the bucket live on the same served origin;
  // keeping it open lets a mirror from another origin serve the same files during an outage.
  headers.set('access-control-allow-origin', '*');
  return new Response(obj.body, { headers });
};
