// Boot log under the glitching HOPE on the loading screen: a small terminal that prints the page
// booting. The GET lines are real: each is one of the home page's data requests, with its actual
// status, row count and time. Lines arrive in a queue and print at a readable pace.

const TIMEOUT = 2500; // a request slower than this is shown as a gateway timeout and the page uses its fallback
const TOTAL_REQUESTS = 9; // data requests main.js makes for the home page

const queue = [];
let sink = null; // set once the log is on screen; lines queue up until then
const emit = (line) => (sink ? sink(line) : queue.push(line));

const started = performance.now();
const ms = () => Math.round(performance.now() - started);

// Wrap one data request: resolves with its data, or with `fallback` if it takes longer than TIMEOUT
export function traced(path, promise, fallback, unit = 'rows') {
  const t0 = performance.now();
  let timedOut = false;
  const timer = new Promise((r) =>
    setTimeout(() => {
      timedOut = true;
      r(fallback);
    }, TIMEOUT),
  );
  return Promise.race([promise, timer]).then((data) => {
    const took = Math.round(performance.now() - t0);
    const n = Array.isArray(data) ? data.length : data && typeof data === 'object' ? Object.keys(data).length : 0;
    emit(
      timedOut
        ? { verb: 'GET', target: path, status: '504', detail: 'gateway timeout', dim: true }
        : { verb: 'GET', target: path, status: '200', detail: `${n} ${n === 1 ? unit.replace(/s$/, '') : unit}  ${took}ms` },
    );
    return data;
  });
}

// Lines that frame the requests; their facts come from the real page (host, protocol)
function preamble() {
  const local = /^(localhost|127\.|192\.168\.)/.test(location.hostname);
  return [
    { verb: 'dns', target: location.host || 'hope', status: 'ok', detail: 'resolved' },
    { verb: 'tls', target: location.protocol === 'https:' ? 'handshake' : 'skipped', status: 'ok', detail: location.protocol === 'https:' ? 'secured' : local ? 'local' : 'plain http' },
    { verb: 'api', target: 'gateway /rest/v1', status: 'ok', detail: 'passed' },
  ];
}

function row(line) {
  const li = document.createElement('li');
  li.className = `boot__line${line.dim ? ' is-dim' : ''}${line.final ? ' is-final' : ''}`;
  for (const [cls, text] of [
    ['boot__verb', line.verb],
    ['boot__target', line.target],
    ['boot__status', line.status],
    ['boot__detail', line.detail],
  ]) {
    const s = document.createElement('span');
    s.className = cls;
    s.textContent = text ?? '';
    li.append(s);
  }
  return li;
}

/**
 * Put the log on screen. Returns:
 *   step(line)     add a framing line (e.g. assets loaded)
 *   drained()      resolves once every queued line has printed
 *   finish()       print the closing 200 OK line straight away
 *   flush()        print everything still waiting, at once
 */
export function mountBootLog(box) {
  const prompt = box.querySelector('.boot__prompt');
  const list = box.querySelector('.boot__lines');
  const bar = box.querySelector('.boot__bar');
  const pending = [...preamble()];
  // preamble + data requests + assets + render + the final line
  const total = pending.length + TOTAL_REQUESTS + 3;
  let printed = 0;
  let waiters = [];
  let timer = null;

  const progress = () => {
    const done = Math.min(printed, total);
    const cells = 16;
    const full = Math.round((done / total) * cells);
    bar.textContent = `[${'█'.repeat(full)}${'░'.repeat(cells - full)}] ${String(Math.round((done / total) * 100)).padStart(3)}%  ${done}/${total}`;
  };
  const print = (line) => {
    list.append(row(line));
    // keep the newest lines in view, like a terminal scrolling up
    while (list.children.length > 7) list.firstChild.remove();
    printed++;
    progress();
  };
  const pump = () => {
    timer = null;
    if (!pending.length) {
      waiters.forEach((w) => w());
      waiters = [];
      return;
    }
    print(pending.shift());
    // a long queue prints faster so the log never holds the page up
    timer = setTimeout(pump, Math.max(70, 210 - pending.length * 25));
  };
  const enqueue = (line) => {
    pending.push(line);
    if (!timer) timer = setTimeout(pump, 60);
  };

  // Type the prompt, then start printing
  const cmd = '$ hope boot --prod';
  let i = 0;
  const type = () => {
    prompt.textContent = cmd.slice(0, ++i);
    if (i < cmd.length) setTimeout(type, 28);
    else {
      sink = enqueue;
      queue.splice(0).forEach((l) => pending.push(l));
      pump();
    }
  };
  progress();
  type();

  return {
    step: (line) => (sink ? enqueue(line) : pending.push(line)),
    drained: () => (pending.length || !sink ? new Promise((r) => waiters.push(r)) : Promise.resolve()),
    flush() {
      clearTimeout(timer);
      timer = null;
      sink ??= enqueue;
      queue.splice(0).forEach((l) => pending.push(l));
      prompt.textContent = cmd;
      while (pending.length) print(pending.shift());
      waiters.forEach((w) => w());
      waiters = [];
    },
    finish() {
      print({ verb: 'HTTP/2', target: '200 OK', status: '', detail: `HOPE is live  ${ms()}ms`, final: true });
      printed = total;
      progress();
      box.classList.add('is-done');
    },
  };
}
