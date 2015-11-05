/* global process, __dirname */
'use strict';

// server cli stuff
var fork = require('child_process').fork;
var fs = require('fs');
var fsPath = require('path');

function exit() {
  console.error();
  console.error.apply(console, arguments);
  commandHelp(console.error);
  process.exit(1);
}

function commandHelp(log) {
  log = log || console.log;

  log();
  log('  App server cli');
  log();
  log('   Comamnds: ');
  log();
  log('   help - Your looking at it');
  log('   interactive <directory> [port] - ' +
      'Begin an interactive session with the app server');
  log();
}

function commandInteractive(directory, port) {
  port = parseInt((port || 60234), 10);

  if (!directory) {
    return exit('Directory must be given');
  }

  directory = fsPath.resolve(directory);

  if (!fs.existsSync(directory)) {
    return exit('Given app directory "%s" does not exist', directory);
  }

  // start the server up
  console.log('Starting server...');

  function onError(e) {
    exit('server process failed to start: ', e);
  }

  var proc = fork(__dirname + '/child.js', [directory, port]);
  proc.once('error', onError);
  proc.on('message', function(msg) {
    if (msg.type !== 'started') {
      return;
    }
    proc.removeListener('error', onError);

    var interactive = require('./cli/interactive');
    interactive(proc, 'http://localhost:' + msg.port + '/');
  });
}

switch (process.argv[2]) {
  case 'interactive':
    commandInteractive(process.argv[3]);
    break;

  case 'help':
    commandHelp();
    break;

  default:
    commandHelp();
}
