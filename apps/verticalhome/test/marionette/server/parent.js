'use strict';
/* global module, __dirname */
var fork = require('child_process').fork;

/**
issue a POST request via marionette
*/
function post(client, url) {
  // must run in chrome so we can do cross domain xhr
  client = client.scope({ context: 'chrome' });
  return client.executeAsyncScript(function(url, json) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.onload = function() {
      marionetteScriptFinished(xhr.response);
    };
    xhr.send();
  }, [url]);
}

function AppServer(marionette, port, proc) {
  this.marionette = marionette;
  this.url = 'http://localhost:' + port;
  this.process = proc;
}

AppServer.prototype = {
  cork: function() {
    post(this.marionette, this.url + '/settings/cork');
  },

  uncork: function() {
    return post(this.marionette, this.url + '/settings/uncork');
  },

  close: function(callback) {
    this.process.kill();
    this.process.once('exit', callback.bind(this, null));
  },

  get manifestURL() {
    return this.url + '/webapp.manifest';
  }
};

module.exports = function create(client, callback) {
  var proc = fork(__dirname + '/child.js');

  proc.once('error', callback);
  proc.on('message', function(msg) {
    if (msg.type !== 'started') {
      return;
    }
    proc.removeListener('error', callback);
    callback(null, new AppServer(client, msg.port, proc));
  });
};

module.exports.AppServer;
