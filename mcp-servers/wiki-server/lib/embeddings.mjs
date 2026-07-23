/**
 * wiki-server — Local vector embeddings via transformers.js.
 *
 * Model: Xenova/all-MiniLM-L6-v2 (384-dim, ~80MB ONNX).
 * Downloaded once from HuggingFace CDN, cached locally.
 * Zero network calls after initial model download.
 */

let pipeline = null;
let extractor = null;

/**
 * Initialize the embedding pipeline. Downloads model on first call (~80MB).
 * Subsequent calls reuse the cached model. Safe to call multiple times.
 */
export async function initEmbeddings() {
  if (extractor) return;
  const { pipeline: createPipeline } = await import("@xenova/transformers");
  extractor = await createPipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
    quantized: true, // use quantized model for smaller download
  });
}

/**
 * Compute a 384-dim embedding for the given text.
 * Returns a Float32Array (stored as BLOB in SQLite).
 */
export async function embed(text) {
  await initEmbeddings();
  // Truncate to 512 tokens (model max) — first 2000 chars is a safe proxy
  const truncated = text.slice(0, 2000);
  const output = await extractor(truncated, { pooling: "mean", normalize: true });
  return Float32Array.from(output.data);
}

/**
 * Cosine similarity between two Float32Arrays.
 * Assumes both are already normalized (from embed()).
 */
export function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // normalized vectors: dot product = cosine similarity
}

/**
 * Find the top-K most similar pages to the query embedding.
 * @param {Float32Array} queryEmb - The query embedding
 * @param {Array<{slug, title, type, embedding: Buffer}>} pages - Pages with embedding BLOBs
 * @param {number} topK - Number of results
 * @returns {Array<{slug, title, type, score}>}
 */
export function vectorSearch(queryEmb, pages, topK = 5) {
  const scored = pages
    .map((p) => {
      const emb = new Float32Array(p.embedding.buffer, p.embedding.byteOffset, p.embedding.byteLength / 4);
      return { slug: p.slug, title: p.title, type: p.type, score: cosineSimilarity(queryEmb, emb) };
    })
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/** Serialize a Float32Array to a Buffer for SQLite BLOB storage. */
export function embeddingToBuffer(emb) {
  return Buffer.from(emb.buffer, emb.byteOffset, emb.byteLength);
}
