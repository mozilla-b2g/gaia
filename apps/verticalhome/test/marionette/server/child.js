/* global __dirname, Buffer, process */
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

var ROOT = __dirname + '/../fixtures/';
// following slash is required for correct zip manifest paths.
var APP_ROOT = fsPath.join(ROOT, 'app/');

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
      return method(req, res);
    }

    var buffer = '';
    req.on('data', function(data) {
      buffer += data;
    });

    req.once('end', function() {
      req.body = JSON.parse(buffer);
      method(req, res);
    });
  };
}

function defaultSettings() {
  return {
    corked: false,
    fail: false
  };
}

var controller = new EventEmitter();
var requests = {};
var routes = {

  /**
  A 'corked' request will send headers but no body until 'uncork' is used.
  */
  '/settings/cork': decorateHandlerForJSON(function(req, res) {
    var url = req.body;
    requests[url] = requests[url] || defaultSettings();
    requests[url].corked = true;

    // issue a cork to the particular endpoint
    var event = 'corked ' + url;
    debug('cork event', event);
    controller.emit('corked ' + url);
    writeJSON(res, url);
  }),

  /**
  The inverse of 'cork' will uncork a uri and send the body through.
  */
  '/settings/uncork': decorateHandlerForJSON(function(req, res) {
    var url = req.body;
    requests[url] = requests[url] || defaultSettings();
    requests[url].corked = false;


    var event = 'uncorked ' + url;
    debug('uncork event', event);
    controller.emit(event);
    writeJSON(res, url);
  }),

  /**
  Fail is a combination of 'cork' and a flag which will cause the incoming http
  request to be closed after a short delay.
  */
  '/settings/fail': decorateHandlerForJSON(function(req, res) {
    var url = req.body;
    var settings = (requests[url] = requests[url] || defaultSettings());

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
    var settings = (requests[url] = requests[url] || defaultSettings());

    settings.fail = settings.corked = false;
    writeJSON(res, url);
  }),

  '/package.manifest': function(req, res) {
    var port = req.socket.address().port;
    var json = JSON.parse(fs.readFileSync(ROOT + '/app/manifest.webapp'));
    json.package_path = 'http://localhost:' + port + '/app.zip';

    var body = JSON.stringify(json, null, 2);
    res.writeHead(200, {
      'Content-Length': Buffer.byteLength(body),
      'Content-Type': 'application/x-web-app-manifest+json'
    });
    res.end(body);
  },

  '/app.zip': function(req, res) {
    var url = req.url;
    var state = requests[url];
    // always write the head we need it in all cases
    res.writeHead(200, {
      'Content-Type': 'application/zip'
    });

    function writeZip() {
      // read the entire app directory
      var files = readdirRecursive(APP_ROOT);
      var zip = archiver.create('zip');

      files.forEach(function(file) {
        var zipPath = file.replace(APP_ROOT, '');
        zip.append(fs.createReadStream(file), { name: zipPath });
      });
      zip.finalize();
      zip.pipe(res);
    }

    if (state.fail) {
      process.nextTick(function() {
        req.socket.destroy();
      });
      return;
    }

    // if we are not corked just write the zip and we are done
    if (!state.corked) {
      return writeZip();
    } else {
      controller.once('uncorked ' + url, writeZip);
    }
  },

  /**
  Catch all handler which serves up static assets.
  */
  '*': function(req, res) {
    var url = req.url;
    var state = requests[url];
    var filePath = fsPath.join(APP_ROOT, url);

    // XXX: This is not a production quality server don't use sync methods in
    //      in servers in your user facing node code.
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end();
      return;
    }

    var contentType = mime.lookup(filePath);
    var contentLength = fs.statSync(filePath).size;

    // write out the head
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': contentLength
    });

    function writeContent() {
      fs.createReadStream(filePath).pipe(res);
    }

    if (state.fail) {
      process.nextTick(function() {
        req.socket.destroy();
      });
      return;
    }

    if (!state.corked) {
      // if we are not corked just return the stream
      return writeContent();
    } else {
      // otherwise wait for the uncork
      controller.once('uncorked ' + url, writeContent);
    }
  }

};

var server = http.createServer(function(req, res) {
  // each and every request is given base settings
  requests[req.url] = requests[req.url] || defaultSettings();

  var handler = routes[req.url] || routes['*'];
  return handler(req, res);
});

server.listen(0, function() {
  process.send({ type: 'started', port: server.address().port });
});
