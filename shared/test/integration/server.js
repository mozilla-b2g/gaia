'use strict';

function Server(root, port, child) {
  this.root = root;
  this.port = port;
  this.child = child;
}

Server.prototype = {
  /**
   * Formats given input with localhost and port.
   *
   * @param {String} path part of url.
   * @return {String} url of location.
   */
  url: function(path) {
    return 'http://localhost:' + this.port + '/' + path;
  },

  /**
   * Sends signal to stop child process and stop server.
   */
  stop: function() {
    this.child.send('stop');
    this.child.kill();
  }
};

/**
 * Spawn the child process where the http server lives.
 *
 * @param {Function} callback [Error err, Server server].
 */
Server.create = function(root, callback) {
  var fork = require('child_process').fork;
  var child = fork(__dirname + '/server_child.js', [root]);

  // wait for start message ['start', PORT_NUMBER].
  child.on('message', function(data) {
    if (Array.isArray(data) && data[0] === 'start') {
      callback(null, new Server(root, data[1], child));
    }
  });
};

module.exports = Server;
