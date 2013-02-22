// set location of dynamically loaded layers.
require.config({
  paths: {
    mailapi: 'js/ext/mailapi'
  },
  scriptType: 'application/javascript;version=1.8',
  definePrim: 'prim'
});

// q shim for rdcommon/log, just enough for it to
// work. Just uses defer, promise, resolve and reject.
define('q', ['prim'], function (prim) {
  return {
    defer: prim
  };
});

// Trigger module resolution for backend to start.
require(['mailapi/same-frame-setup']);
