'use strict';
/* global module, __dirname */
var fork = require('child_process').fork;

/**
 * Issue a POST request via marionette.
 */
function post(client, url, json) {
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

function AppServer(root, marionette, port, proc) {
  this.root = root;
  this.marionette = marionette;
  this.url = 'http://localhost:' + port;
  this.process = proc;
}

AppServer.prototype = {

  /**
  issues a GET request to the server and returns the parsed body.
  */
  get: function(uri) {
    // must run in chrome so we can do cross domain xhr
    var client = this.marionette.scope({ context: 'chrome' });

    return client.executeAsyncScript(function(url) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onload = function() {
        marionetteScriptFinished(xhr.response);
      };
      xhr.send();
    }, [this.url + uri]);
  },

  /**
  Changes the root of the server.

  @param {String} path relative to the file system.
  */
  setRoot: function(path) {
    return post(this.marionette, this.url + '/settings/set_root', path);
  },

  /**
  Set the http response of a particular url.

  @param {String} path to set the response of.
  @param {Number} status code to set.
  @param {Object} headers to override.
  @param {String} body of the request.
  */
  setResponse: function(path, status, headers, body) {
    var options = {
      path: path,
      status: status,
      headers: headers || {},
      body: body
    };

    return post(this.marionette, this.url + '/settings/set_response', options);
  },

  /**
  Clear the response override set by `setResponse`
  */
  clearResponse: function(url) {
    return post(
      this.marionette, this.url + '/settings/clear_response', url
    );
  },

  /**
  Trigger a 500 error for a particular url and return an empty body.

  @param {String} url to fail (/index.html).
  */
  serverError: function(url) {
    return this.setResponse(url, 500, {}, '');
  },

  /**
  Clears the server error for a particular url.

  @param {String} url to fail (/index.html).
  */
  clearServerError: function(url) {
    return this.clearResponse();
  },

  /**
  Indicate to the server that all requests to the given url should be
  given a response with headers but then the socket should be closed shortly
  after that time.

  @param {String} url to ban (/index.html).
  */
  fail: function(url) {
    return post(this.marionette, this.url + '/settings/fail', url);
  },

  /**
  Allow requests to the given url to proceed without failure after calling
  `.fail`.

  @param {String} url to unban.
  */
  unfail: function(url) {
    return post(this.marionette, this.url + '/settings/unfail', url);
  },

  /**
  Cork the response body of the given url while allowing headers.

  @param {String} url to cork.
  */
  cork: function(url) {
    return post(this.marionette, this.url + '/settings/cork', url);
  },

  /**
  Allow the body to be sent after calling `.cork`.

  @param {String} url to uncork.
  */
  uncork: function(url) {
    return post(this.marionette, this.url + '/settings/uncork', url);
  },

  close: function(callback) {
    this.process.kill();
    this.process.once('exit', callback.bind(this, null));
  },

  get manifest() {
    return JSON.parse(this.get('/manifest.webapp'));
  },

  /**
  URI where the application zip lives this defined in child.js
  */
  get applicationZipUri() {
    return '/app.zip';
  },

  get manifestURL() {
    return this.url + '/manifest.webapp';
  },

  get packageManifestURL() {
    return this.url + '/package.manifest';
  }
};

/**
 * Create a app server for use in marionette tests.
 *
 * @param {String} appRoot path to the root of the app.
 * @param {Marionette.Client} client for marionette.
 * @param {Function} callback [Error]
 */
module.exports = function create(appRoot, client, callback) {
  var proc = fork(__dirname + '/child.js', [appRoot]);

  proc.once('error', callback);
  proc.on('message', function(msg) {
    if (msg.type !== 'started') {
      return;
    }
    proc.removeListener('error', callback);
    callback(null, new AppServer(appRoot, client, msg.port, proc));
  });
};

module.exports.AppServer;
