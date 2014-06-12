/* global process, Buffer, module */
'use strict';
var http = require('http');
var url = require('url');

function Interactive(serverProc, url, commands) {
  this.server = serverProc;
  this.url = url;
  this.stream = process.stdin;
  this.commands = commands;
}

Interactive.prototype = {

  help: function() {
    console.log(' Commands: ');
    console.log();
    Object.keys(this.commands).forEach(function(command) {
      var desc = this.commands[command].description;
      console.log('  %s - %s', command, desc);
    }, this);
    console.log();
  },

  get: function(uri) {
    var req = http.get(this.url + uri);
    console.log('>> GET ' + uri);

    req.once('response', function(res) {
      console.log(' response %s [%s]', uri, res.statusCode);
      for (var key in res.headers) {
        console.log(' response header %s : %s', key, res.headers[key]);
      }
    }.bind(this));
  },

  post: function(uri, body, callback) {
    var json = JSON.stringify(body);

    var options = url.parse(this.url + uri);
    options.method = 'POST';
    var req = http.request(options);
    req.setHeader('Content-Length', Buffer.byteLength(json));
    req.setHeader('Content-Type', 'application/json');

    req.once('response', function(res) {
      var data = '';
      res.on('data', function(buffer) {
        data += buffer;
      });

      res.once('end', function() {
        callback(null, JSON.parse(data));
      });
    });

    req.end(json);
  },

  onReadable: function() {
    var stream = this.stream;

    var content = stream.read();
    // noting to read return...
    if (!content) {
      return;
    }

    // read until we have a newline
    if (content.indexOf('\n') === -1) {
      stream.unshift(content);
      return;
    }

    // ignore blank lines
    if (content.trim() === '') {
      return;
    }

    // the first word is the command parse it out...
    var commandParts = content.split(' ').map(function(part) {
      return part.trim();
    });

    var commandName = commandParts.shift();
    var command = this.commands[commandName];

    if (!command) {
      console.error(commandName, ' is not a recognized command');
      return this.help();
    }

    command.handler.apply(this, commandParts);
  },

  start: function() {
    // don't stop reading from stdin
    this.stream.setEncoding('utf8');
    this.stream.on('readable', this.onReadable.bind(this));
  },

};

var commands = {
  help: {
    description: 'Shows all commands',
    handler: function() { this.help(); }
  },

  cork: {
    description: '<uri> Cork a particular url',
    handler: function(uri) {
      // leading slash for consistency with get
      this.post('settings/cork', '/' + uri, function(err, body) {
        console.log('corked : %s', body);
      });
    }
  },

  uncork: {
    description: '<uri> uncork a particular uri',
    handler: function(uri) {
      // leading slash for consistency with get
      this.post('settings/uncork', '/' + uri, function(err, body) {
        console.log('uncorked : %s', body);
      });
    }
  },

  fail: {
    description: '<uri> Cause a particular url to fail',
    handler: function(uri) {
      // leading slash for consistency with get
      this.post('settings/fail', '/' + uri, function(err, body) {
        console.log('failed: %s', body);
      });
    }
  },

  unfail: {
    description: '<uri> remove failng status from particular url',
    handler: function(uri) {
      // leading slash for consistency with get
      this.post('settings/unfail', '/' + uri, function(err, body) {
        console.log('unfail: %s', body);
      });
    }
  },

  get: {
    description: '<uri> Issue a http get an show the body',
    handler: function(uri) {
      this.get(uri);
    }
  },

  url: {
    description: 'display the server url',
    handler: function() {
      console.log(this.url);
    },
  }
};

function main(process, url) {
  var handler = new Interactive(process, url, commands);
  handler.start();

  process.once('SIGINT', function() {
    process.stderr.write('Shutting down...\n');
    process.exit();
  });
}

module.exports = main;
