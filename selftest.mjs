// node selftest.mjs
// There is no build step and no browser here, so this pulls the pure logic out of the page
// and checks the parts that can silently ship broken: whether a society counts as complete,
// and what its WhatsApp message looks like. A wrong message is the expensive failure, because
// it looks sent either way.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const js = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));

// 0. Parse the WHOLE page script before testing any of it. The checks below extract
// individual functions by regex, so a syntax error anywhere outside those functions used to
// pass every test and still leave a page that does nothing in a browser. That happened on
// 18 August 2026: a newline escape was lost inside a mailto body, every function under test
// stayed valid, and the page would not have run at all. `new Function` throws on a parse
// error, which is exactly the signal wanted here.
try {
  new Function(js);
} catch (e) {
  assert.fail('page script does not parse: ' + e.message);
}

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
  grab(/function baseCore\(soc\) \{[\s\S]*?\n\}/),
  grab(/function newQs\(soc\) \{[\s\S]*?\n\}/),
  grab(/function newPending\(soc\) \{[\s\S]*?\n\}/),
  grab(/function isDone\(soc\) \{[\s\S]*?\n\}/),
  grab(/function buildMessage\(list, tag\) \{[\s\S]*?\n\}/),
  grab(/var SHORT = \{[\s\S]*?\};\nfunction short\(id\) \{[^}]*\}/),
  grab(/function csvCell\(v\) \{[\s\S]*?\n\}/),
  grab(/function buildCSV\(list\) \{[\s\S]*?\n\}/),
  'function val(soc, id) { var s = state[soc.n] || {}; return (s.a || {})[id] || ""; }',
].join('\n');

// `state` is a free variable inside the page's functions, so it goes in as a parameter and
// each call gets its own isolated world to assert against.
const load = new Function('state', src + '\nreturn { SOCIETIES, core, isDone, buildMessage, FLAT, buildCSV, csvCell, baseCore, newQs, newPending };');
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

// 5. The eleven societies we do not sell in (added 17 August 2026) are ordinary rows, not a
// special case. They carry `x` only so the card can say "nayi" and skip the "what we already
// have" note, and a flag that the message builder silently ignored would mean a whole round
// of answers arriving unlabelled.
{
  const { SOCIETIES } = api({});
  const fresh = SOCIETIES.filter((x) => x.x);
  assert.equal(fresh.length, 11, 'eleven societies were added on 17 Aug 2026');
  assert.ok(fresh.every((x) => x.k === 'flat' || x.k === 'plot'),
    'every society needs a kind, or core() hands it the wrong question set');
  assert.ok(fresh.every((x) => !x.r),
    'a new society has no prior data, so a "what we already have" note would be a lie');

  const names = SOCIETIES.map((x) => x.n);
  assert.equal(new Set(names).size, names.length, 'a duplicate name would overwrite its twin in state');

  // It has to survive the round trip, exactly like a society we do sell in.
  const s = { 'Nimai Greens': { visited: true, a: { maint: '₹2 per sq ft', rwa: 'pata nahi' } } };
  const api2 = api(s);
  const msg = api2.buildMessage([api2.SOCIETIES.find((x) => x.n === 'Nimai Greens')]);
  assert.match(msg, /\*Nimai Greens\*/, 'a new society must appear in the message by name');
  assert.match(msg, /maint: ₹2 per sq ft/);
  assert.match(msg, /RWA: PATA NAHI/, 'an unknown on a new society is still a first-class answer');
}



// 6. The CSV is the path that carries a whole survey at once, so a broken one loses
// everything rather than one message. Header and row must line up, and a comma or a quote
// inside a free-text answer must not shift a column.
{
  const s = {};
  const { SOCIETIES, buildCSV, csvCell } = api(s);
  const soc = SOCIETIES[0];
  s[soc.n] = { visited: true, a: { loc: 'Sector 4, "main" road' } };
  const csv = buildCSV([soc]);
  const lines = csv.split('\n');
  assert.ok(lines[0].startsWith('Society,Zone,'), 'header must start with the fixed columns');

  // A quoted field can legally contain the delimiter, so count columns by parsing rather
  // than by splitting on commas, which is exactly the bug this guards against.
  const cells = (line) => {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out;
  };
  assert.equal(cells(lines[1]).length, cells(lines[0]).length,
    'row must have exactly as many columns as the header');
  assert.ok(cells(lines[1]).includes('Sector 4, "main" road'),
    'a comma and quotes inside an answer must survive a round trip');
  assert.equal(csvCell('plain'), 'plain', 'a plain value must not be quoted');
  assert.equal(csvCell('a,b'), '"a,b"', 'a value with a comma must be quoted');
}

// 7. Questions added mid-survey must be asked without invalidating finished work. This is
// the contract that replaced the CORE-versus-EXTRA trade: they ride along in core() so they
// reach the message and the CSV, they are excluded from isDone so nothing reopens, and they
// are still counted so they get chased.
{
  const s = {};
  const { SOCIETIES, core, baseCore, newQs, newPending, isDone } = api(s);
  const soc = SOCIETIES[0];
  const ids = core(soc).map((q) => q.id);
  assert.ok(ids.includes('nocw') && ids.includes('nocx'),
    'the charge questions must be in core, so they reach the message and the CSV');

  const newIds = newQs(soc).map((q) => q.id);
  assert.deepEqual(newIds.sort(), ['nocw', 'nocx'], 'exactly the charge questions are new');
  assert.ok(!baseCore(soc).some((q) => q.since), 'baseCore must contain no since-flagged question');

  // A society answered before the new questions existed must still read as done.
  const a = {};
  baseCore(soc).forEach((q) => { a[q.id] = 'x'; });
  s[soc.n] = { a };
  assert.equal(isDone(soc), true, 'a society finished before the new questions must stay done');
  assert.equal(newPending(soc), 2, 'both new questions must still be counted as pending');

  a.nocw = 'bechne wala deta hai';
  assert.equal(newPending(soc), 1, 'answering one new question must drop the pending count');
}

console.log('selftest: 8 checks passed, page script parses');
