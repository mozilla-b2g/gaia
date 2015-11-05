'use strict';

function Server(child) {
  this.child = child;
}

Server.prototype = {
  /**
   * Sends signal to stop child process and stop server.
   *
   * TODO: Bug 1056186:
   * [FxA] Create unit tests for Firefox Accounts mock server process
   */
  stop: function() {
    this.child.kill('SIGTERM');
  }
};

/**
 * Spawn the child process where the FxA mock server lives.
 *
 * @param args - [ host, port, path ]
 * @param callback
 */
function create(args, callback) {
  var child = require('child_process')
    .fork(__dirname + '/server_mock_fxa.js', args)
    .on('message', function(data) {
      if (Array.isArray(data) && data[0] === 'start') {
        callback(null, new Server(child));
      }
    })
    .on('error', function (err) {
      callback(err);
    });
}

Server.create = create;
module.exports = Server;
