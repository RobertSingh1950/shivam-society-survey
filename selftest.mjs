// node selftest.mjs
// There is no build step and no browser here, so this pulls the pure logic out of the page
// and checks the parts that can silently ship broken: whether a society counts as complete,
// and what its WhatsApp message looks like. A wrong message is the expensive failure, because
// it looks sent either way.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const js = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));

// Everything from the top of the script down to the render loop: constants, question lists,
// core(), val(), plus the message builder and its helpers further down.
const grab = (re) => { const m = js.match(re); assert.ok(m, 'not found: ' + re); return m[0]; };
const src = [
  grab(/var SOCIETIES = \[[\s\S]*?\n\];/),
  grab(/var DK = [\s\S]*?\nvar CORE = \[[\s\S]*?\n\];/),
  grab(/var FLAT = \[[\s\S]*?\n\];/),
  grab(/var PLOT = \[[\s\S]*?\n\];/),
  grab(/var HR = \{[\s\S]*?\n\s*v: \[[^\]]*\] \};/),
  grab(/var EXTRA = \[[\s\S]*?\n\];/),
  grab(/function core\(soc\) \{[\s\S]*?\n\}/),
  grab(/function isDone\(soc\) \{[\s\S]*?\n\}/),
  grab(/function buildMessage\(list, tag\) \{[\s\S]*?\n\}/),
  grab(/var SHORT = \{[\s\S]*?\};\nfunction short\(id\) \{[^}]*\}/),
  'function val(soc, id) { var s = state[soc.n] || {}; return (s.a || {})[id] || ""; }',
].join('\n');

// `state` is a free variable inside the page's functions, so it goes in as a parameter and
// each call gets its own isolated world to assert against.
const load = new Function('state', src + '\nreturn { SOCIETIES, core, isDone, buildMessage, FLAT };');
const api = (s) => load(s);

// 1. A society is not done until every core question is answered.
{
  const s = {};
  const { SOCIETIES, isDone, core } = api(s);
  const cosmos = SOCIETIES.find((x) => x.n === 'Cosmos');
  assert.equal(isDone(cosmos), false, 'empty society must not count as done');
  s.Cosmos = { a: {} };
  core(cosmos).forEach((q) => { s.Cosmos.a[q.id] = 'pata nahi'; });
  assert.equal(isDone(cosmos), true, '"pata nahi" everywhere is a complete answer');
}

// 2. The flat services split is in place and the old combined question is gone.
{
  const { SOCIETIES, core } = api({});
  const ids = core(SOCIETIES.find((x) => x.n === 'Cosmos')).map((q) => q.id);
  ['water', 'backup', 'lift'].forEach((id) => assert.ok(ids.includes(id), 'missing ' + id));
  assert.ok(!ids.includes('serv'), 'the contradictory multi-select must be gone from flats');
  // Water and lift must be single-choice, which is the whole point of the split.
  const { FLAT } = api({});
  FLAT.filter((q) => ['water', 'lift', 'backup'].includes(q.id))
    .forEach((q) => assert.equal(q.t, 'one', q.id + ' must be single-choice'));
}

// 3. One society builds one message, in the pipe format the filing side reads.
{
  const s = {
    Cosmos: {
      visited: true,
      a: { maint: '₹2.25 per sq ft', mwho: 'RWA leti hai', rwa: 'registered RWA hai',
        noct: '2 hafte', nocc: 'case ke hisaab se', bank: 'SBI, HDFC',
        water: 'paani 24 ghante', backup: 'backup chalta hai', lift: 'lift theek hai',
        club: 'khula hai, chal raha hai', year: '2021-2024', loc: 'Opposite konark oasis' },
    },
  };
  const { SOCIETIES, buildMessage } = api(s);
  const msg = buildMessage([SOCIETIES.find((x) => x.n === 'Cosmos')], '  (7)');
  assert.match(msg, /\*Cosmos\* _khud gaya_/, 'the visit marker is what makes a finding tier B');
  assert.match(msg, /maint: ₹2\.25 per sq ft \| kaun: RWA leti hai/);
  assert.match(msg, /paani: paani 24 ghante \| backup: backup chalta hai \| lift: lift theek hai/);
  assert.match(msg, /khatam, 1 society/);
  assert.ok(encodeURIComponent(msg).length < 2000,
    'one society must stay far short of any wa.me limit, which is why batching was removed');
}

// 4. "pata nahi" travels as PATA NAHI, so a gap is unmistakable on the filing side.
{
  const s = { Cosmos: { a: { maint: 'pata nahi' } } };
  const { SOCIETIES, buildMessage } = api(s);
  assert.match(buildMessage([SOCIETIES.find((x) => x.n === 'Cosmos')]), /maint: PATA NAHI/);
}

console.log('selftest: 4 checks passed');
