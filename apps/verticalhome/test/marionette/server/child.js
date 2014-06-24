/* global Buffer, process */
'use strict';

/**
App server for fixtures. Serves up packaged apps.
*/


var debug = require('debug')('appserver:child');
var http = require('http');
var fs = require('fs');
var fsPath = require('path');
var mime = require('mime');
var archiver = require('archiver');

var EventEmitter = require('events').EventEmitter;

function readdirRecursive(dir) {
  dir = fsPath.join(dir, '/');
  var results = [];
  var files = fs.readdirSync(dir);

  var file;
  while((file = files.shift())) {
    file = fsPath.join(dir, file);
    var stat = fs.statSync(file);
    if (stat.isDirectory()) {
      results = results.concat(readdirRecursive(file));
    } else {
      results.push(file);
    }
  }

  return results;
}

function writeJSON(res, object) {
  var json = JSON.stringify(object);
  res.writeHead(200, {
    'Content-Length': Buffer.byteLength(json),
    'Content-Type': 'application/json'
  });
  res.end(json);
}

function decorateHandlerForJSON(method) {
  return function(req, res) {
    // if it is not json just skip it
    var type = req.headers['content-type'];
    if (!type || type.indexOf('json') === -1) {
      return method.call(this, req, res);
    }

    var buffer = '';
    req.on('data', function(data) {
      buffer += data;
    });

    req.once('end', function() {
      req.body = JSON.parse(buffer);
      method.call(this, req, res);
    }.bind(this));
  };
}

function defaultSettings() {
  return {
    corked: false,
    fail: false
  };
}

/**
 * @param {String} root directory where content is.@
 * @param {Object} routes for the app server.
 * @constructor
 */
function AppServer(root, routes) {
  EventEmitter.call(this);

  // ensure we always have the slash suffix
  if (root[root.length - 1] !== '/') {
    root += '/';
  }

  this.root = root;
  this.routes = routes;
  this._settings = {};
}

AppServer.prototype = {
  __proto__: EventEmitter.prototype,

  /**
   * @return {Object} default settings for a given url.
   */
  settings: function(url) {
    return (this._settings[url] = this._settings[url] || defaultSettings());
  },

  requestHandler: function() {
    var routes = this.routes;
    return function(req, res) {
      debug('request', req.method, req.url);
      var handler = routes[req.url] || routes['*'];
      var settings = this.settings(req.url);

      // If this url has a http error on it just return without calling the
      // handler.
      if (settings.response) {
        res.writeHead(settings.response.status, settings.response.headers);
        res.end(settings.response.body);
        return;
      }

      // routes are always invoked with the context of the app server.
      return handler.call(this, req, res);
    }.bind(this);
  },
};

var routes = {

  /**
  Change the root serving directory for this server.
  */
  '/settings/set_root': decorateHandlerForJSON(function(req, res) {
    this.root = req.body;
    writeJSON(res, req.body);
  }),

  /**
  Override or set the response of a particular url.
  */
  '/settings/set_response': decorateHandlerForJSON(function(req, res) {
    var options = req.body;
    var settings = this.settings(options.path);

    settings.response = options;
    writeJSON(res, options.path);
  }),

  /**
  Clear the response override.
  */
 '/settings/clear_response': decorateHandlerForJSON(function(req, res) {
    var url = req.body;
    var settings = this.settings(url);
    delete settings.response;
    writeJSON(res, url);
 }),

  /**
  A 'corked' request will send headers but no body until 'uncork' is used.
  */
  '/settings/cork': decorateHandlerForJSON(function(req, res) {
    var url = req.body;
    var settings = this.settings(url);
    settings.corked = true;

    // issue a cork to the particular endpoint
    var event = 'corked ' + url;
    debug('cork event', event);
    this.emit('corked ' + url);
    writeJSON(res, url);
  }),

  /**
  The inverse of 'cork' will uncork a uri and send the body through.
  */
  '/settings/uncork': decorateHandlerForJSON(function(req, res) {
    var url = req.body;
    var settings = this.settings(url);
    settings.corked = false;

    var event = 'uncorked ' + url;
    debug('uncork event', event);
    this.emit(event);
    writeJSON(res, url);
  }),

  /**
  Fail is a combination of 'cork' and a flag which will cause the incoming http
  request to be closed after a short delay.
  */
  '/settings/fail': decorateHandlerForJSON(function(req, res) {
    var url = req.body;
    var settings = this.settings(url);

    // must be corked to ensure we don't send the body
    settings.corked = true;
    settings.fail = true;
    writeJSON(res, url);
  }),

  /**
  The inverse to fail but unlike uncork this cannot be called in the middle of
  a request (for obvious reasons).
  */
  '/settings/unfail': decorateHandlerForJSON(function(req, res) {
    var url = req.body;
    var settings = this.settings(url);

    settings.fail = settings.corked = false;
    writeJSON(res, url);
  }),

  '/package.manifest': function(req, res) {
    var json = JSON.parse(fs.readFileSync(this.root + '/manifest.webapp'));
    json.package_path = 'http://' + req.headers.host + '/app.zip';
    // TODO: Remove this once we add the ability to override requests
    delete json.role;

    var body = JSON.stringify(json, null, 2);
    res.writeHead(200, {
      'Content-Length': Buffer.byteLength(body),
      'Content-Type': 'application/x-web-app-manifest+json'
    });
    res.end(body);
  },

  '/app.zip': function(req, res) {
    var url = req.url;
    var settings = this.settings(url);
    // always write the head we need it in all cases
    res.writeHead(200, {
      'Content-Type': 'application/zip'
    });

    var root = this.root;
    function writeZip() {
      // read the entire app directory
      var files = readdirRecursive(root);
      var zip = archiver.create('zip');

      files.forEach(function(file) {
        debug('packaged app zip file', file);
        var zipPath = file.replace(root, '');
        zip.append(fs.createReadStream(file), { name: zipPath });
      });
      zip.finalize();
      zip.pipe(res);
    }

    if (settings.fail) {
      process.nextTick(function() {
        req.socket.destroy();
      });
      return;
    }

    // if we are not corked just write the zip and we are done
    if (!settings.corked) {
      return writeZip();
    } else {
      this.once('uncorked ' + url, writeZip);
    }
  },

  /**
  Catch all handler which serves up static assets.
  */
  '*': function(req, res) {
    var url = req.url;
    var settings = this.settings(url);
    var filePath = fsPath.join(this.root, url);

    // XXX: This is not a production quality server don't use sync methods in
    //      in servers in your user facing node code.
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end();
      return;
    }

    var contentType = mime.lookup(filePath);
    var contentLength = fs.statSync(filePath).size;
    debug('static asset', filePath, contentType, contentLength);

    // write out the head
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': contentLength
    });

    function writeContent() {
      fs.createReadStream(filePath).pipe(res);
    }

    if (settings.fail) {
      process.nextTick(function() {
        req.socket.destroy();
      });
      return;
    }

    if (!settings.corked) {
      // if we are not corked just return the stream
      return writeContent();
    } else {
      // otherwise wait for the uncork
      this.once('uncorked ' + url, writeContent);
    }
  }
};

var port = parseInt((process.argv[3] || 0), 10);
var appServer = new AppServer(process.argv[2], routes);
var server = http.createServer(appServer.requestHandler());

server.listen(port, function() {
  if (process.send) {
    process.send({ type: 'started', port: server.address().port });
  }
});
