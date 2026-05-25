/**
 * StreamLogger — persistent diagnostic logger for media streaming issues.
 * Stores timestamped entries in memory and exposes them for UI display.
 * Survives across component re-renders via module-level state.
 */

const MAX_ENTRIES = 200;
const entries = [];
let listeners = [];

function notify() {
  listeners.forEach(fn => fn([...entries]));
}

const StreamLogger = {
  log(level, source, message, data = null) {
    const entry = {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }),
      level, // 'info' | 'warn' | 'error' | 'success'
      source, // e.g. 'loadAndPlay', 'fetch', 'server'
      message,
      data,
    };
    entries.unshift(entry);
    if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
    notify();

    // Also output to devtools
    const prefix = `[${entry.time}] [${source}]`;
    if (level === 'error') console.error(prefix, message, data || '');
    else if (level === 'warn') console.warn(prefix, message, data || '');
    else console.log(prefix, message, data || '');
  },

  info(source, msg, data) { this.log('info', source, msg, data); },
  warn(source, msg, data) { this.log('warn', source, msg, data); },
  error(source, msg, data) { this.log('error', source, msg, data); },
  success(source, msg, data) { this.log('success', source, msg, data); },

  getEntries() { return [...entries]; },
  clear() { entries.length = 0; notify(); },

  subscribe(fn) {
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  },
};

export default StreamLogger;
