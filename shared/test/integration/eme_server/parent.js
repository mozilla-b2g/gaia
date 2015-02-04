'use strict';
/* global module, __dirname */
var fork = require('child_process').fork;

/**
 * Issue a POST request via marionette.
 */
function post(client, url, json) {
  json = json || {};
  // must run in chrome so we can do cross domain xhr
  client = client.scope({ context: 'chrome' });
  return client.executeAsyncScript(function(url, json) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
      marionetteScriptFinished(xhr.response);
    };
    xhr.send(json);
  }, [url, JSON.stringify(json)]);
}

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
  },

  /**
   * Indicate to the server that all requests should be given a response with
   * headers but then the socket should be closed shortly after that time.
   */
  failAll: function() {
    return post(this.marionette, this.url + '/settings/failAll');
  },

  /**
   * Allow requests to to proceed without failure after calling `.failAll`.
  */
  unfailAll: function() {
    return post(this.marionette, this.url + '/settings/unfailAll');
  },
};

/**
 * Create an everything.me server for use in marionette tests.
 *
 * @param {Marionette.Client} client for marionette.
 * @param {Function} callback [Error]
 */
module.exports = function create(client, callback) {
  var stubRoot = __dirname + '/fixtures';
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

/**
 * Updates the everything.me API setting.
 * @param {Object} client The marionette client.
 * @param {Object} server An everything.me server instance.
 */
module.exports.setServerURL = function(client, server) {
  var chrome = client.scope({ context: 'chrome' });
  chrome.executeAsyncScript(function(url) {
    var request = navigator.mozSettings.createLock().set({
      'appsearch.url': url
    });
    request.onsuccess = function() {
      marionetteScriptFinished();
    };
  }, [server.url + '/{resource}']);
};
