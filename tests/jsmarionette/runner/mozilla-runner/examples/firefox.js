'use strict';
/**
 * This is a demo of using multiple mozilla-* projects with mozilla-runner.
 *
 *  - downloads firefox
 *  - creates a profile
 *  - launches firefox (with a custom profile) to a given url
 *  - outputs the "dump'ed" content to stdout
 */
var mozdown = require('mozilla-download'),
    mozprofile = require('mozilla-profile-builder'),
    mozrun = require('../index'),
    Static = require('node-static'),
    fs = require('fs');

var PORT = 60034;
var FIREFOX_PATH = __dirname + '/firefox';
var PREFS = {
  'browser.dom.window.dump.enabled': true
};

function download(callback) {
  console.log('---*(-)- Downloading Firefox -----');
  // download firefox if its missing
  mozdown.download('firefox', FIREFOX_PATH, function(err) {
    if (err) return console.error(err);
    callback();
  });
}

function startServer() {
  // start static server
  var file = new(Static.Server)(__dirname + '/public');
  require('http').createServer(function(request, response) {
      request.addListener('end', function() {
          file.serve(request, response);
      }).resume();
  }).listen(PORT);
}

function profile(product, path, options, callback) {
  mozprofile.firefox.profile({ userPrefs: PREFS }, function(err, path) {
    callback(err, path);
  });
}

function demo() {
  // invoke the server
  startServer();

  var options = {
    profile: profile,
    url: 'http://localhost:' + PORT + '/index.html'
  };

  mozrun.run('firefox', FIREFOX_PATH, options, function(err, child) {
    child.stdout.on('data', function(content) {
      console.log('[firefox] %s', content.toString());
    });
  });
}

if (!fs.existsSync(FIREFOX_PATH)) {
  download(demo);
} else {
  demo();
}

