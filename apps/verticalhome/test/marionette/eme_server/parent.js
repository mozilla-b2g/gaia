'use strict';
/* global module, __dirname */
var fork = require('child_process').fork;

function EmeServer(root, marionette, port, proc) {
  this.root = root;
  this.marionette = marionette;
  this.url = 'http://localhost:' + port;
  this.process = proc;
}

EmeServer.prototype = {
  close: function(callback) {
    this.process.kill();
    this.process.once('exit', callback.bind(this, null));
  }
};

/**
 * Create an everything.me server for use in marionette tests.
 *
 * @param {String} stubRoot path to a folder of stub responses.
 * @param {Marionette.Client} client for marionette.
 * @param {Function} callback [Error]
 */
module.exports = function create(stubRoot, client, callback) {
  var proc = fork(__dirname + '/child.js', [stubRoot]);

  proc.once('error', callback);
  proc.on('message', function(msg) {
    if (msg.type !== 'started') {
      return;
    }
    proc.removeListener('error', callback);
    callback(null, new EmeServer(stubRoot, client, msg.port, proc));
  });
};

module.exports.EmeServer;
