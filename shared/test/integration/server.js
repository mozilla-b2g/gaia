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
    this.child.send({
      action: 'stop'
    });
    this.child.kill();
  },

  /**
   * Cork the response body of the given url while allowing headers.
   * @param {String} url to cork
   */
  cork: function(url) {
    this.child.send({
      action: 'cork',
      args: url
    });
  },

  /**
   * Allow the body to be sent after calling `.cork`.
   * @param {String} url to uncork
   */
  uncork: function(url) {
    this.child.send({
      action: 'uncork',
      args: url
    });
  },

  /**
   * Protects a URL using HTTP authentication.
   * @param {String} url to protect
   */
  protect: function(url) {
    this.child.send({
      action: 'protect',
      args: url
    });
  },

  /**
   * Stops protecting a URL.
   * @param {String} url to protect
   */
  unprotect: function(url) {
    this.child.send({
      action: 'unprotect',
      args: url
    });
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
