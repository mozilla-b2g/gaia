/* global Buffer, process */
'use strict';

/**
 * Everything.me server for fixtures. Serves stubbed Everything.me responses.
 */

var http = require('http');
var fs = require('fs');
var fsPath = require('path');

var EventEmitter = require('events').EventEmitter;

function writeJSON(res, object) {
  object = object || {};
  var json = JSON.stringify(object);
  res.writeHead(200, {
    'Content-Length': Buffer.byteLength(json),
    'Content-Type': 'application/json'
  });
  res.end(json);
}

/**
 * @param {String} root directory where content is.@
 * @param {Object} routes for the server.
 * @constructor
 */
function EmeServer(root, routes) {
  EventEmitter.call(this);

  // ensure we always have the slash suffix
  if (root[root.length - 1] !== '/') {
    root += '/';
  }

  this.root = root;
  this.routes = routes;
  this._settings = {};
  this.fail = false;
}

EmeServer.prototype = {
  __proto__: EventEmitter.prototype,

  requestHandler: function() {
    var routes = this.routes;
    return function(req, res) {
      // Fail requests
      if (req.url.indexOf('/settings') !== 0 && this.fail) {
        process.nextTick(function() {
          req.socket.destroy();
        });
        return;
      }

      var handler = routes[req.url] || routes['*'];
      // routes are always invoked with the context of the server.
      return handler.call(this, req, res);
    }.bind(this);
  },
};

var emeServer = new EmeServer(process.argv[2], {

  '/Categories/list': function(req, res) {
    var json = JSON.parse(fs.readFileSync(this.root + 'categories_list.json'));
    writeJSON(res, json);
  },

  '/Apps/nativeInfo': function(req, res) {
    var json = JSON.parse(fs.readFileSync(this.root + 'apps_nativeinfo.json'));
    writeJSON(res, json);
  },

  '/Apps/search': function(req, res) {
    var json = JSON.parse(fs.readFileSync(this.root + 'apps_search.json'));
    writeJSON(res, json);
  },

  '/Search/bgimage': function(req, res) {
    var json = JSON.parse(fs.readFileSync(this.root + 'search_bgimage.json'));
    writeJSON(res, json);
  },

  '/settings/failAll': function(req, res) {
    this.fail = true;
    writeJSON(res);
  },

  '/settings/unfailAll': function(req, res) {
    this.fail = false;
    writeJSON(res);
  },

  /**
   * Catch all handler which serves up static assets.
   */
  '*': function(req, res) {
    var url = req.url;
    var filePath = fsPath.join(this.root, url);
    console.log('Uncaught request: ', url, filePath);

    res.writeHead(404);
    res.end();
    return;
  }
});

var server = http.createServer(emeServer.requestHandler());

server.listen(0, function() {
  process.send({ type: 'started', port: server.address().port });
});
