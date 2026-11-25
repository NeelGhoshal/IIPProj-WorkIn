import { LIMBS } from './poses.js';

// The trained network always picks one of four poses, even for someone just
// standing there. A hold counts only when the network AND limb angles agree.
const MIN_CONFIDENCE = 0.75;
const MIN_JOINT_SCORE = 0.2;

export function parseModel(buffer, meta) {
  const w = new Float32Array(buffer);
  let o = 0;
  const take = (n) => w.slice(o, (o += n));
  return { k1: take(34 * 16), b1: take(16), k2: take(16 * 4), b2: take(4), inputs: meta.inputs };
}

export async function loadModel(base = 'model/') {
  const get = async (f) => {
    const r = await fetch(base + f);
    if (!r.ok) throw new Error(`Could not load ${f} (${r.status})`);
    return r;
  };
  const [bin, meta] = await Promise.all([get('model.weights.bin'), get('model_meta.json')]);
  return parseModel(await bin.arrayBuffer(), await meta.json());
}

// Returns probabilities for [a, b, c, d].
export function classify(model, points) {
  const x = points.map((v, i) => (v - model.inputs[i].min) / (model.inputs[i].max - model.inputs[i].min));
  const h = [...model.b1].map((b, j) => Math.max(0, x.reduce((s, v, i) => s + v * model.k1[i * 16 + j], b)));
  const z = [...model.b2].map((b, j) => h.reduce((s, v, i) => s + v * model.k2[i * 4 + j], b));
  const top = Math.max(...z);
  const e = z.map((v) => Math.exp(v - top));
  const sum = e.reduce((a, b) => a + b);
  return e.map((v) => v / sum);
}

const mid = (p, a, b) => [(p[2 * a] + p[2 * b]) / 2, (p[2 * a + 1] + p[2 * b + 1]) / 2];

// Move and scale a body so its torso sits on the reference torso. The network
// was trained on raw pixels, so without this it only works at one spot.
export function align(points, ref) {
  const s = mid(points, 5, 6);
  const h = mid(points, 11, 12);
  const rs = mid(ref, 5, 6);
  const rh = mid(ref, 11, 12);
  const len = Math.hypot(s[0] - h[0], s[1] - h[1]);
  if (len < 10) return null;
  const k = Math.hypot(rs[0] - rh[0], rs[1] - rh[1]) / len;
  return points.map((v, i) => (v - h[i % 2]) * k + rh[i % 2]);
}

const angle = (p, [a, b]) => Math.atan2(p[2 * b + 1] - p[2 * a + 1], p[2 * b] - p[2 * a]);

export function angleError(p, ref, limb) {
  const d = Math.abs(angle(p, limb) - angle(ref, limb)) % (2 * Math.PI);
  return (Math.min(d, 2 * Math.PI - d) * 180) / Math.PI;
}

export function match(model, pose, points, scores) {
  const need = new Set([5, 6, 11, 12, ...pose.limbs.flatMap((l) => LIMBS[l])]);
  const hidden = scores && [...need].some((i) => scores[i] < MIN_JOINT_SCORE);
  const aligned = hidden ? null : align(points, pose.points);
  if (!aligned) return { visible: false, ok: false, off: [] };
  const errors = pose.limbs.map((l) => [l, angleError(points, pose.points, LIMBS[l])]);
  const off = errors.filter(([, e]) => e > pose.tolerance[0]).sort((x, y) => y[1] - x[1]).map(([l]) => l);
  const mean = errors.reduce((s, [, e]) => s + e, 0) / errors.length;
  const confidence = classify(model, aligned)['abcd'.indexOf(pose.id)];
  const ok = !off.length && mean <= pose.tolerance[1] && confidence >= MIN_CONFIDENCE;
  return { visible: true, ok, off, mean, confidence };
}
