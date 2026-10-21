// HOPE terminal: press ` (backtick) or the footer button. Type commands to jump around the site.
import { getEvents, getBatches, formatDate, formatTime } from '../lib/data.js';

const onHome = () => location.pathname === '/' || location.pathname.endsWith('/index.html');

export function setupTerminal({ go } = {}) {
  if (document.querySelector('.term')) return;

  const term = document.createElement('div');
  term.className = 'term';
  term.hidden = true;
  term.setAttribute('role', 'dialog');
  term.setAttribute('aria-label', 'HOPE terminal');
  term.innerHTML = `
    <div class="term__bar"><span class="term__dots" aria-hidden="true"><i></i><i></i><i></i></span><span>hope@lab: ~</span>
      <button type="button" class="term__close" aria-label="Close terminal">esc</button></div>
    <div class="term__out" aria-live="polite"></div>
    <form class="term__line"><label for="term-input" class="term__prompt">hope@lab:~$</label>
      <input id="term-input" class="term__input" autocomplete="off" autocapitalize="off" spellcheck="false" /></form>`;
  document.body.append(term);

  const out = term.querySelector('.term__out');
  const input = term.querySelector('.term__input');
  const history = [];
  let cursor = 0;

  const print = (text, cls = '') => {
    const p = document.createElement('p');
    if (cls) p.className = cls;
    p.textContent = text;
    out.append(p);
    out.scrollTop = out.scrollHeight;
  };

  // Jump to a home-page section (smoothly when already on the home page)
  const jump = (id) => {
    close();
    if (onHome() && go) return go(id);
    location.href = `/#${id}`;
  };

  const commands = {
    help: () => {
      print('Commands:');
      [
        ['events', 'upcoming and past events'],
        ['next', 'when the next event starts'],
        ['tracks', 'what you learn at HOPE'],
        ['batch', 'the next batch: dates and where'],
        ['batches [name]', 'see a batch, e.g. batches elite'],
        ['alumni', 'where HOPE alumni work'],
        ['mentors', 'meet the mentors'],
        ['home', 'back to the top'],
        ['whoami', ''],
        ['clear', 'clear the screen'],
        ['exit', 'close the terminal'],
      ].forEach(([c, d]) => print(`  ${c.padEnd(16)}${d}`, 'term__help'));
    },
    events: () => jump('events'),
    tracks: () => jump('tracks'),
    mentors: () => jump('mentors'),
    batch: () => jump('batch'),
    home: () => (onHome() ? jump('top') : (location.href = '/')),
    alumni: () => (location.href = '/alumni/'),
    batches: async (arg) => {
      if (!arg) return (location.href = '/batches/');
      const batches = await getBatches();
      const b = batches.find((x) => x.slug === arg.toLowerCase() || x.name.toLowerCase() === arg.toLowerCase());
      if (!b) return print(`No batch called "${arg}". Try: ${batches.map((x) => x.slug).join(', ')}`, 'term__err');
      location.href = `/batches/?b=${b.slug}`;
    },
    next: async () => {
      const now = Date.now();
      const e = (await getEvents()).find((x) => new Date(x.ends_at || x.starts_at).getTime() >= now);
      if (!e) return print('Nothing scheduled yet. Check back soon.');
      print(`${e.title}: ${formatDate(e.starts_at)}, ${formatTime(e.starts_at)}${e.venue ? `, ${e.venue}` : ''}`);
    },
    whoami: () => print('a future engineer.'),
    ls: () => print('home/  batches/  alumni/  events  mentors  tracks'),
    date: () => print(new Date().toString()),
    sudo: () => print('Permission denied. Nice try though.', 'term__err'),
    hello: () => print('Hello, world.'),
    clear: () => out.replaceChildren(),
    exit: () => close(),
  };
  commands.cd = (arg) => (arg ? (commands[arg.replace(/\/$/, '')] || (() => print(`cd: ${arg}: no such place`, 'term__err')))() : commands.home());
  commands.echo = (arg) => print(arg || '');

  term.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const line = input.value.trim();
    input.value = '';
    if (!line) return;
    history.push(line);
    cursor = history.length;
    print(`$ ${line}`, 'term__cmd');
    const [name, ...rest] = line.split(/\s+/);
    const fn = commands[name.toLowerCase()];
    if (!fn) return print(`${name}: command not found. Type help.`, 'term__err');
    await fn(rest.join(' '));
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      cursor = Math.max(0, Math.min(history.length, cursor + (e.key === 'ArrowUp' ? -1 : 1)));
      input.value = history[cursor] || '';
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const match = Object.keys(commands).filter((c) => c.startsWith(input.value.toLowerCase()));
      if (match.length === 1) input.value = match[0] + ' ';
      else if (match.length > 1) print(match.join('  '), 'term__help');
    }
  });

  let opener = null;
  function open() {
    opener = document.activeElement;
    term.hidden = false;
    requestAnimationFrame(() => term.classList.add('is-open'));
    if (!out.childElementCount) {
      print('HOPE terminal. Type help to see what you can do.', 'term__help');
    }
    input.focus();
  }
  function close() {
    term.classList.remove('is-open');
    setTimeout(() => (term.hidden = true), 250);
    opener?.focus?.();
  }

  term.querySelector('.term__close').addEventListener('click', close);
  document.querySelectorAll('.term-open').forEach((b) => b.addEventListener('click', open));
  addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if (e.key === '`' && !typing) {
      e.preventDefault();
      term.hidden ? open() : close();
    } else if (e.key === 'Escape' && !term.hidden) {
      close();
    } else if (e.key === '`' && document.activeElement === input) {
      e.preventDefault();
      close();
    }
  });
}
