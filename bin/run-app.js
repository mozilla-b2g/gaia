#!/usr/bin/env node

'use strict';

var http = require('http');
var path = require('path');
var fs = require('fs');

var union = require('union');
var ecstatic = require('ecstatic');

var appRoot = path.resolve(process.argv[2]);

if (!fs.existsSync(appRoot)) {
  throw "Directory not found";
}

var app = ecstatic({root: appRoot});
var shared = ecstatic({root: path.resolve('shared')});

var PORT = 5000;

union.createServer({
  before: [
    function (req, res) {
      if (/^\/shared\//.test(req.url)) {
        req.url = req.url.replace(/^\/shared/, '');
        shared(req, res);
      } else {
        app(req, res);
      }
    }
  ]
}).listen(PORT);

console.log('Listening on http://127.0.0.1:' + PORT);
