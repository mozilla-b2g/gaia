'use strict';
/* global __dirname, require, marionette, suiteSetup, suiteTeardown */
/* global   setup, test */

var Bookmark = require('../../../../apps/system/test/marionette/lib/bookmark');
var Server = require('../../../../shared/test/integration/server');

marionette('Bookmark -', function() {
  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
  });
  var bookmark, server, system;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    system = client.loader.getAppClass('system');
    bookmark = new Bookmark(client, server);
    system.waitForStartup();
  });

  test('Install app from page', function() {

    var url = server.url('app.html');

    client.switchToFrame();
    bookmark.openAndInstall(url, 'My App Shortname', '/favicon.ico');

  });

});
