// Reference poses: per-joint medians of the training set (yoga1.json), in the
// 640x480 camera space the classifier was trained on. Order follows PoseNet's
// 17 keypoints, flattened as x, y.
//
// `limbs` lists only the limbs that were tracked consistently in training.
// Limbs that were out of frame or hidden are drawn but not checked.
//
// `tolerance` is degrees [per limb, averaged]. Tadasana and padmasana are wider
// because their training photos had bent elbows and partly hidden legs.
export const LIMBS = {
  lUpperArm: [5, 7], lForearm: [7, 9], rUpperArm: [6, 8], rForearm: [8, 10],
  lThigh: [11, 13], lShin: [13, 15], rThigh: [12, 14], rShin: [14, 16],
};

export const LIMB_LABEL = {
  lUpperArm: 'left upper arm', lForearm: 'left forearm',
  rUpperArm: 'right upper arm', rForearm: 'right forearm',
  lThigh: 'left thigh', lShin: 'left lower leg',
  rThigh: 'right thigh', rShin: 'right lower leg',
};

export const POSES = [
  {
    id: 'a', name: 'Tadasana', cue: 'Stand tall with both arms raised overhead.',
    tolerance: [55, 35],
    limbs: ['lUpperArm', 'lForearm', 'rUpperArm', 'rForearm', 'lThigh', 'rThigh'],
    points: [351, 167, 364, 158, 344, 157, 377, 166, 326, 167, 403, 211, 306, 217, 443, 146, 262, 168, 375, 94, 303, 91, 385, 401, 307, 395, 382, 548, 321, 549, 377, 558, 337, 558],
  },
  {
    id: 'b', name: 'Padmasana', cue: 'Sit cross-legged with your hands resting on your knees.',
    tolerance: [45, 30],
    limbs: ['lUpperArm', 'rUpperArm', 'rForearm', 'lThigh', 'rThigh'],
    points: [381, 114, 394, 101, 371, 103, 412, 109, 357, 111, 439, 174, 328, 172, 466, 254, 288, 243, 483, 254, 307, 303, 421, 294, 336, 294, 495, 282, 262, 283, 489, 356, 310, 358],
  },
  {
    id: 'c', name: 'Adasana', cue: 'Step your feet wide and reach both arms out to the sides.',
    tolerance: [35, 20],
    limbs: ['lUpperArm', 'lForearm', 'rUpperArm', 'rForearm', 'lThigh', 'lShin', 'rThigh', 'rShin'],
    points: [317, 73, 325, 62, 310, 65, 354, 64, 304, 71, 399, 104, 296, 126, 472, 127, 241, 118, 551, 165, 189, 115, 404, 258, 334, 264, 445, 368, 279, 337, 515, 429, 267, 433],
  },
  {
    id: 'd', name: 'Virabhadrasana', cue: 'Balance on your right leg. Reach your right arm out and up, your left arm down.',
    tolerance: [35, 20],
    limbs: ['lUpperArm', 'lForearm', 'rForearm', 'lThigh', 'rThigh', 'rShin'],
    points: [311, 48, 318, 37, 304, 42, 339, 36, 299, 49, 371, 78, 291, 88, 417, 144, 249, 76, 465, 209, 209, 54, 389, 203, 337, 220, 412, 322, 358, 324, 413, 322, 368, 437],
  },
];

export const poseById = (id) => POSES.find((p) => p.id === id);

// Draw a pose as a rounded silhouette. Mirrored, so it reads like a mirror.
export function figureSVG(pose) {
  const p = (i) => [640 - pose.points[2 * i], pose.points[2 * i + 1]];
  const all = Array.from({ length: 17 }, (_, i) => p(i));
  const xs = all.map((q) => q[0]);
  const ys = all.map((q) => q[1]);
  const pad = 46;
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  const path = (...ids) => 'M' + ids.map((i) => p(i).join(' ')).join('L');
  const [nx, ny] = p(0);
  return `<svg viewBox="${x} ${y} ${Math.max(...xs) + pad - x} ${Math.max(...ys) + pad - y}" aria-hidden="true">
    <path class="torso" d="${path(5, 6, 12, 11)}Z"/>
    <path class="limb arm" d="${path(5, 7, 9)}"/><path class="limb arm" d="${path(6, 8, 10)}"/>
    <path class="limb" d="${path(11, 13, 15)}"/><path class="limb" d="${path(12, 14, 16)}"/>
    <circle class="head" cx="${nx}" cy="${ny}" r="29"/></svg>`;
}
