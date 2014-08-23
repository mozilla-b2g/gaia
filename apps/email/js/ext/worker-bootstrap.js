var window = self;

function consoleHelper() {
  var msg = arguments[0] + ':';
  for (var i = 1; i < arguments.length; i++) {
    msg += ' ' + arguments[i];
  }
  msg += '\x1b[0m\n';
  dump(msg);
}
window.console = {
  log: consoleHelper.bind(null, '\x1b[32mWLOG'),
  error: consoleHelper.bind(null, '\x1b[31mWERR'),
  info: consoleHelper.bind(null, '\x1b[36mWINF'),
  warn: consoleHelper.bind(null, '\x1b[33mWWAR')
};

var document = { cookie: null };

// These pragmas are for r.js and tell it to remove this code section. It will
// be replaced with inline content after a build.
//>>excludeStart('buildExclude', pragmas.buildExclude);
importScripts('ext/alameda.js');
importScripts('worker-config.js');
require(['worker-setup']);
//>>excludeEnd('buildExclude');
