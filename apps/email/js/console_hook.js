// when running in B2G, send output to the console, ANSI-style
if ('mozTCPSocket' in window.navigator) {
  function consoleHelper() {
    var msg = arguments[0] + ':';
    for (var i = 1; i < arguments.length; i++) {
      msg += ' ' + arguments[i];
    }
    msg += '\x1b[0m\n';
    dump(msg);
  }
  window.console = {
    log: consoleHelper.bind(null, '\x1b[32mLOG'),
    error: consoleHelper.bind(null, '\x1b[31mERR'),
    info: consoleHelper.bind(null, '\x1b[36mINF'),
    warn: consoleHelper.bind(null, '\x1b[33mWAR')
  };
}
window.onerror = function errHandler(msg, url, line) {
  console.error('onerror reporting:', msg, '@', url, ':', line);
  return false;
};

