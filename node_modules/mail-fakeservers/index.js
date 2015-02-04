var spawn = require('child_process').spawn,
    ipc = require('./lib/server'),
    debug = require('debug')('xpcshell'),
    ControlServer = require('./lib/control_server'),
    ImapStack = require('./lib/imap_stack');

var PORT_ENV = 'FAKESERVER_IPC_PORT';

function setupDebug(child) {
  function watchProcess(type) {
    child[type].on('data', function(buffer) {
      debug(type, buffer.toString());
    });
  }

  if (process.env.DEBUG) {
    watchProcess('stderr');
    watchProcess('stdout');
  }
}

/**
 * Spawns a xpcshell target instance.
 *
 * @private
 * @param {Number} port of where server is running.
 * @return {ChildProcess} child process instance of xpcshell.
 */
function spawnXpcshell(port) {
  var spawnOpts = {};

  // port over the env's of the parent process
  var envs = spawnOpts.env = {};
  for (var key in process.env) {
    envs[key] = process.env[key];
  }

  // tell xpcshell where to look.
  spawnOpts.env[PORT_ENV] = port;

  var bin = __dirname + '/xpcom/bin/server.sh';

  debug('spawn', bin);

  return spawn(
    bin,
    [__dirname + '/xpcom/bin/server.js'],
    spawnOpts
  );
}

function create(callback) {
  ipc.create(function(err, ipcInterface) {
    if (err) return callback(err);

    var xpcshell = spawnXpcshell(ipcInterface.port);
    setupDebug(xpcshell);

    var controlServer = new ControlServer(xpcshell, ipcInterface);

    // wait until xpcshell connects
    ipcInterface.once('ready', function() {
      // don't fire the callback until we have the port
      controlServer.setupControlPort(function(err) {
        callback(err, controlServer);
      });
    });
  });
}

module.exports.create = create;
