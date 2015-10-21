'use strict';
/* global __dirname */

var Bookmark = require('../../../../apps/system/test/marionette/lib/bookmark');
var Server = require('../../../../shared/test/integration/server');

marionette('Homescreen - Bookmark Favicon Failure', function() {

  var client = marionette.client({
    profile: require(__dirname + '/client_options_bookmarks.js')
  });
  var bookmark, home, server, system;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/invalid_favicon/',
      function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  var url;
  setup(function() {
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    bookmark = new Bookmark(client, server);
    system.waitForFullyLoaded();
    home.waitForLaunch();

    url = server.url('sample.html');
    client.switchToFrame();
    bookmark.openAndSave(url);

    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());
  });

  test('Invalid icons get default icon assigned', function() {
    var icon = home.getIcon(url);
    home.waitForIconImageUrl(icon, 'default');
  });

});
