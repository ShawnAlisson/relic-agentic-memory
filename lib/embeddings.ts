const DIM = 384;

function tokenHash(token: string): number {
  let h = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    h = Math.imul(h ^ token.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

export function embedLocal(text: string): number[] {
  const vec = new Array<number>(DIM).fill(0);
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (const token of tokens) {
    const h = tokenHash(token);
    const i = h % DIM;
    const j = (h * 17) % DIM;
    vec[i] += 1;
    vec[j] += 0.45;
    if (token.length > 4) vec[(h * 31) % DIM] += 0.25;
  }
  const mag = Math.sqrt(vec.reduce((s, n) => s + n * n, 0)) || 1;
  return vec.map((n) => n / mag);
}

export const EMBEDDING_DIM = DIM;
