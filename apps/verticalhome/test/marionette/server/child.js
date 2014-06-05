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

var routes = {
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

    res.writeHead(200, {
      'Content-Type': 'application/zip'
    });

    zip.pipe(res);
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
