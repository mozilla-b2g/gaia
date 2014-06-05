'use strict';
/* global module, __dirname */
var fork = require('child_process').fork;

function AppServer(port, proc) {
  this.url = 'http://localhost:' + port;
  this.process = proc;
}

AppServer.prototype = {
  close: function(callback) {
    this.process.kill();
    this.process.once('exit', callback.bind(this, null));
  },

  get manifestURL() {
    return this.url + '/webapp.manifest';
  }
};

module.exports = function create(callback) {
  var proc = fork(__dirname + '/child.js');

  proc.once('error', callback);
  proc.on('message', function(msg) {
    if (msg.type !== 'started') {
      return;
    }
    proc.removeListener('error', callback);
    callback(null, new AppServer(msg.port, proc));
  });
};

module.exports.AppServer;
