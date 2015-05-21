'use strict';
var Static = require('node-static'),
    http = require('http'),
    emptyPort = require('empty-port');

var Server = {
  /**
   * Http server running in this process.
   */
  http: null,

  stop: function() {
    if (this.http) {
      this.http.kill();
    }
  },

  start: function(port) {
    // using node-static for now we can do fancy stuff in the future.
    var file = new Static.Server(__dirname + '/../fixtures/');
    this.http = http.createServer(function(req, res) {
      req.addListener('end', function() {
        // hand off request to node-static
        file.serve(req, res);
      }).resume();
    }).listen(port);
  }
};

// figure out which port we are on
emptyPort({}, function(err, port) {
  Server.start(port);
  process.send(['start', port]);
});

// handle process messages
process.on('message', function(data) {
  switch (data) {
    case 'stop':
      Server.stop();
      break;
  }
});
