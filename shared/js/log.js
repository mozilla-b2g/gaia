
'use strict';

(function logjs() {
  // The following variables can be defined directly in the src attribute of
  // the script tag used to load log.js.
  //
  // <script src="shared/js/log.js?name=FOO"> will add a FOO in every output
  // strings.
  //
  // <script src="shared/js/log.js?silent=1"> will disable all outputs. It make
  // it easy to keep some debugging code in production and to enable it back by
  // just switching '1' to '0'.
  //
  // It can be defined multiple variables by using the standard syntax:
  // <script src="shared/js/log.js?name=FOO&silent=1">
  //
  var name = '';
  var silent = 0;

  // Parse the url set vi <script src=""> and set variables accordingly.
  var scripts = document.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; i++) {
    var url = scripts[i].src;
    if (url.indexOf('log.js?') == -1)
      continue;

    var args = url.match(/([a-z0-9]+=[a-z0-9]+)/gi);
    if (!args)
      continue;

    args.forEach(function readArg(arg) {
      var arg = arg.split('=');
      switch (arg[0]) {
        case 'name':
          name = arg[1];
          break;
        case 'silent':
          silent = arg[1];
          break;
      }
    });
  }

  // Some platforms support colored outputs.
  if (navigator.platform.indexOf('Linux') != -1 ||
      navigator.platform == '' /* this is empty on Gonk - bug 801614 */) {
    var DEFAULT = '\x1B[00m';

    var RED = '\x1B[31m';
    var BOLD_RED = '\x1B[1;31m';
    var GREEN = '\x1B[32m';
    var BOLD_GREEN = '\x1B[1;32m';
    var YELLOW = '\x1B[33m';
    var BOLD_YELLOW = '\x1B[1;33m';
    var GREY = '\x1B[37m';
    var BOLD_GREY = '\x1B[1;37m';
  } else { // I have no idea about other platforms...
    var DEFAULT = '';

    var RED = '';
    var BOLD_RED = '';
    var GREEN = '';
    var BOLD_GREEN = '';
    var YELLOW = '';
    var BOLD_YELLOW = '';
  }

  // This method output the target string both on the shell and on the console.
  // Currently console.* is visible on logcat so there is a 2 lines for the
  // same debugging strings. But console.* will not be visible anymore once
  // bug 795691 lands.
  function log(str, type) {
    if (silent === '1') {
      return;
    }

    if (typeof str === 'object') {
      str = JSON.stringify(str);
    }

    switch (type) {
      case 'error':
        dump(RED + 'Error' + (name ? ' (' + name + '): ' : ': ') +
             BOLD_RED + str + DEFAULT + '\n');
        console.error(name ? name + ': ' + str : str);
        break;

      case 'success':
        dump(GREEN + 'Success' + (name ? ' (' + name + '): ' : ': ') +
             BOLD_GREEN + str + DEFAULT + '\n');
        console.log(name ? name + ': ' + str : str);
        break;

      case 'warn':
        dump(YELLOW + 'Warn' + (name ? ' (' + name + '): ' : ': ') +
             BOLD_YELLOW + str + DEFAULT + '\n');
        console.warn(name ? name + ': ' + str : str);
        break;

      case 'info':
        dump(GREY + 'Info' + (name ? ' (' + name + '): ' : ': ') +
             BOLD_GREY + str + DEFAULT + '\n');
        console.info(name ? name + ': ' + str : str);
        break;
    }
  }

  window.error = function(str) { log(str, 'error') };
  window.success = function(str) { log(str, 'success') };
  window.warn = function(str) { log(str, 'warn') };
  window.info = function(str) { log(str, 'info') };
})();

