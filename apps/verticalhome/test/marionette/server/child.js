/* global __dirname, Buffer, process */
'use strict';

/**
App server for fixtures. Serves up packaged apps.
*/

var http = require('http');
var root = __dirname + '/../fixtures/';
var fs = require('fs');
var fsPath = require('path');

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

var controller = new EventEmitter();

var model = {
  /**
  When corked the archive will not respond with a body.
  */
  corked: false
};

function writeJSON(res, object) {
  var json = JSON.stringify(object);
  res.writeHead(200, {
    'Content-Length': Buffer.byteLength(json),
    'Content-Type': 'application/json'
  });
  res.end(json);
}

var routes = {
  '/settings/cork': function(req, res) {
    model.corked = true;
    controller.emit('corked');
    writeJSON(res, true);
  },

  '/settings/uncork': function(req, res) {
    model.corked = false;
    controller.emit('uncorked');
    writeJSON(res, true);
  },

  '/webapp.manifest': function(req, res) {
    var port = req.socket.address().port;
    var json = JSON.parse(fs.readFileSync(root + '/app/manifest.webapp'));
    json.package_path = 'http://localhost:' + port + '/app.zip';

    var body = JSON.stringify(json, null, 2);
    res.writeHead(200, {
      'Content-Length': Buffer.byteLength(body),
      'Content-Type': 'application/x-web-app-manifest+json'
    });
    res.end(body);
  },

  '/app.zip': function(req, res) {
    // always write the head we need it in all cases
    res.writeHead(200, {
      'Content-Type': 'application/zip'
    });

    function writeZip() {
      // slash vs no slash differently...
      var appRoot = fsPath.join(root, 'app/');

      // read the entire app directory
      var files = readdirRecursive(appRoot);
      var zip = archiver.create('zip');

      files.forEach(function(file) {
        var zipPath = file.replace(appRoot, '');
        zip.append(fs.createReadStream(file), { name: zipPath });
      });
      zip.finalize();
      zip.pipe(res);
    }

    // if we are not corked just write the zip and we are done
    if (!model.corked) {
      return writeZip();
    }

    // uncorked we need to hold of on sending the body until uncork is sent
    controller.once('uncorked', function() {
      writeZip();
    });
  }
};

var server = http.createServer(function(req, res) {
  if (routes[req.url]) {
    return routes[req.url](req, res);
  }
  res.writeHead(404);
  res.end();
});

server.listen(0, function() {
  process.send({ type: 'started', port: server.address().port });
});
