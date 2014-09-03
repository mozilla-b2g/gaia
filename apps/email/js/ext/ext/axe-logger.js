/**
 * Shim for 'axe-logger' as required by the email.js libs.
 */
define(function() {
  // For now, silence debug/log, and forward warn/error to the
  // console just in case.
  return {
    debug: function() { /* shh */ },
    log: function() { /* shh */ },
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  };
});
