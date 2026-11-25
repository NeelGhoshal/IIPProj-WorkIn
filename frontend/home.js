import { POSES, figureSVG } from './poses.js';
import { predict } from './finder.js';

const $ = (id) => document.getElementById(id);

$('picker').innerHTML = POSES.map((p) => `<li><a href="practice.html?pose=${p.id}">
  ${figureSVG(p)}<strong>${p.name}</strong><span>${p.cue}</span></a></li>`).join('');

const EXAMPLES = ['I have bad posture', 'I have low stamina', 'I have insomnia'];
$('tries').innerHTML = EXAMPLES.map((t) => `<button type="button">${t}</button>`).join('');

let model;
const ready = fetch('finder-model.json')
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then((m) => { model = m; })
  .catch(() => {});

function say(text, who) {
  const p = document.createElement('p');
  p.className = `msg ${who}`;
  p.textContent = text;
  $('log').append(p);
  $('log').scrollTop = $('log').scrollHeight;
  return p;
}

async function ask(text) {
  say(text, 'me');
  await ready;
  if (!model) return say('The pose finder did not load. Reload the page to try again.', 'bot');
  const { tag, prob, known } = predict(model, text);
  if (!known || prob <= 0.75) {
    return say('I didn\'t recognise that. Try naming one thing, like "I feel tired always" or "I have leg pain".', 'bot');
  }
  const options = model.responses[tag];
  const msg = say(options[Math.floor(Math.random() * options.length)], 'bot');
  const pose = POSES.find((p) => p.name.toLowerCase() === tag.toLowerCase());
  if (pose) {
    const a = document.createElement('a');
    a.href = `practice.html?pose=${pose.id}`;
    a.textContent = `Practise ${pose.name}`;
    msg.append(a);
  }
  $('log').scrollTop = $('log').scrollHeight;
}

$('tries').addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') ask(e.target.textContent); });
$('ask').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('q').value.trim();
  if (!text) return $('q').focus();
  $('q').value = '';
  ask(text);
});
