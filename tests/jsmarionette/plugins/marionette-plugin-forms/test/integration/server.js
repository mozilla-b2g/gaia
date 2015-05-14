'use strict';
var Static = require('node-static');
var file = new(Static.Server)(__dirname + '/fixtures/');

// shamelessly copy/pasted from node-static README.md
require('http').createServer(function(request, response) {
  request.addListener('end', function() {
    //
    // Serve files!
    //
    file.serve(request, response);
  }).resume();
}).listen(process.env.PORT);
