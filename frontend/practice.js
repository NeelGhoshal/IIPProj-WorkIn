import { POSES, LIMBS, LIMB_LABEL, poseById, figureSVG } from './poses.js';
import { loadModel, match } from './match.js';

const GOAL = 30;
const $ = (id) => document.getElementById(id);
const pose = poseById(new URLSearchParams(location.search).get('pose')) ?? POSES[0];
const next = POSES[(POSES.indexOf(pose) + 1) % POSES.length];

document.title = `${pose.name} | YogaAspire`;
$('name').textContent = pose.name;
$('cue').textContent = pose.cue;
$('target').innerHTML = figureSVG(pose);
$('goal').textContent = GOAL;
$('next').href = `practice.html?pose=${next.id}`;
$('next').textContent = `Next: ${next.name}`;

const cam = $('cam');
const ctx = $('draw').getContext('2d');
let held = 0;
let last = 0;       // time of the previous pose result
let holding = false;
let done = false;
let statusText = '';

function setState(state, text) {
  $('room').dataset.state = state;
  if (text !== statusText) $('status').textContent = statusText = text;
}

function showTime() {
  $('secs').textContent = held.toFixed(1);
  $('fill').style.transform = `scaleX(${held / GOAL})`;
}

// Joint coordinates are in camera space; the canvas is mirrored by CSS.
function drawBody(points, scores, off) {
  const styles = getComputedStyle($('room'));
  ctx.clearRect(0, 0, 640, 480);
  ctx.lineCap = 'round';
  const line = (a, b, color, width) => {
    if (scores[a] < 0.2 || scores[b] < 0.2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(points[2 * a], points[2 * a + 1]);
    ctx.lineTo(points[2 * b], points[2 * b + 1]);
    ctx.stroke();
  };
  const good = styles.getPropertyValue('--good-line');
  const bad = styles.getPropertyValue('--off-line');
  [[5, 6], [5, 11], [6, 12], [11, 12]].forEach(([a, b]) => line(a, b, 'rgba(255,255,255,.85)', 6));
  for (const [name, [a, b]] of Object.entries(LIMBS)) {
    const checked = pose.limbs.includes(name);
    line(a, b, !checked ? 'rgba(255,255,255,.6)' : off.includes(name) ? bad : good, checked ? 12 : 6);
  }
}

function onPoses(model, results) {
  const now = performance.now();
  // A long gap (hidden tab, stalled camera) must not count as held time.
  const dt = Math.min((now - last) / 1000, 0.5);
  last = now;
  if (!results.length) {
    holding = false;
    ctx.clearRect(0, 0, 640, 480);
    if (!done) setState('searching', 'Step into the frame so your whole body is visible.');
    return;
  }
  const kp = results[0].pose.keypoints;
  const points = kp.flatMap((k) => [k.position.x, k.position.y]);
  const scores = kp.map((k) => k.score);
  const r = match(model, pose, points, scores);
  drawBody(points, scores, r.off);
  if (done) return;

  if (r.ok) {
    if (holding) held = Math.min(GOAL, held + dt);
    holding = true;
    showTime();
    if (held >= GOAL) {
      done = true;
      setState('done', `${pose.name} held for ${GOAL} seconds.`);
    } else setState('holding', 'Holding. Keep still.');
    return;
  }
  holding = false;
  if (!r.visible) setState('searching', 'Step back until your arms and legs are in the frame.');
  else if (r.off.length) setState('adjust', `Adjust your ${LIMB_LABEL[r.off[0]]}.`);
  else setState('adjust', 'Almost there. Match the figure more closely.');
}

async function start() {
  $('start').disabled = true;
  $('veilText').textContent = 'Starting camera and loading the pose model.';
  let stream;
  try {
    if (!navigator.mediaDevices) throw new DOMException('', 'NotSupportedError');
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, aspectRatio: { ideal: 4 / 3 }, facingMode: 'user' },
      audio: false,
    });
    cam.srcObject = stream;
    await cam.play();
    if (!window.ml5) throw new Error('ml5');
    const model = await loadModel();
    const net = window.ml5.poseNet(cam, () => {
      $('veil').hidden = true;
      last = performance.now();
      setState('searching', 'Step into the frame so your whole body is visible.');
    });
    net.on('pose', (results) => onPoses(model, results));
  } catch (err) {
    stream?.getTracks().forEach((t) => t.stop());
    console.error(err);
    $('start').disabled = false;
    $('start').textContent = 'Try again';
    $('veilText').textContent = {
      NotAllowedError: 'Camera access is blocked. Allow it in your browser\'s site settings, then try again.',
      NotFoundError: 'No camera found. Connect one, then try again.',
      NotReadableError: 'Another app is using the camera. Close it, then try again.',
      NotSupportedError: 'This browser can\'t use the camera here. Open the site over HTTPS in a current browser.',
    }[err.name] ?? 'The pose model did not load. Check your connection, then try again.';
  }
}

$('start').addEventListener('click', start);
$('reset').addEventListener('click', () => {
  held = 0;
  done = false;
  holding = false;
  showTime();
  if (cam.srcObject) setState('searching', 'Timer restarted. Move into the pose.');
});
