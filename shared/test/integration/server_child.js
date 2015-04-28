'use strict';

var http = require('http');
var emptyPort = require('empty-port');
var nodeStatic = require('node-static');

var EventEmitter = require('events').EventEmitter;

var root = process.argv[2];

var server;

function Server() {
  EventEmitter.call(this);
}

Server.prototype = {
  __proto__: EventEmitter.prototype,


  /**
   * Http server running in this process.
   */
  http: null,

  /**
   * A map of corked URLs.
   */
  corkedUrls: {},

  /**
   * A map of protected URLs.
   */
  authUrls: {},

  stop: function() {
    if (this.http) {
      this.http.kill();
    }
  },

  start: function(port) {
    // using node-static for now we can do fancy stuff in the future.
    var file = new nodeStatic.Server(root);
    this.http = http.createServer(function(req, res) {
      req.addListener('end', function() {

        // Handle corked urls.
        var fullUrl = 'http://' + req.headers.host + req.url;
        if (server.corkedUrls[fullUrl]) {
          server.once('uncorked ' + fullUrl, file.serve.bind(file, req, res));
          return;
        }

        // Handle protected URLs.
        // Users can login with 'username' and 'password'
        if (server.authUrls[fullUrl] &&
            req.headers.authorization !== 'Basic dXNlcm5hbWU6cGFzc3dvcmQ=') {
          res.writeHead(401, {
            'WWW-Authenticate': 'Basic realm="login required"'
          });
          res.end();
          return;
        }

        // hand off request to node-static
        file.serve(req, res);
      }).resume();
    }).listen(port);
  },

  cork: function(url) {
    this.corkedUrls[url] = true;
  },

  uncork: function(url) {
    delete this.corkedUrls[url];
    this.emit('uncorked ' + url);
  },

  protect: function(url) {
    this.authUrls[url] = true;
  },

  unprotect: function(url) {
    delete this.authUrls[url];
  }
};

server = new Server();

// figure out which port we are on
emptyPort({}, function(err, port) {
  server.start(port);
  process.send(['start', port]);
});

// handle process messages
process.on('message', function(data) {
  switch (data.action) {
    case 'cork':
      server.cork(data.args);
      break;
    case 'uncork':
      server.uncork(data.args);
      break;
    case 'protect':
      server.protect(data.args);
      break;
    case 'unprotect':
      server.unprotect(data.args);
      break;
    case 'stop':
      server.stop();
      break;
  }
});
