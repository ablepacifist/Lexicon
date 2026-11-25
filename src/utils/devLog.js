// Diagnostics that help while developing and are noise (or worse) in production.
//
// A visitor's console is not a debugging channel: the site used to print the signed-in
// user object on every render, whole media lists, and the login response with its
// mobile token. Anything worth keeping goes through here and vanishes from production
// builds; genuine failures still use console.error.
const enabled = process.env.NODE_ENV !== 'production';

export function devLog(...args) {
  if (enabled) console.log(...args);
}

export default devLog;
