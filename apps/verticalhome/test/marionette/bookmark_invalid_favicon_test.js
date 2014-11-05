'use strict';
/* global __dirname */

var iconSrc = require('./lib/icon_src');
var Bookmark = require('../../../../apps/system/test/marionette/lib/bookmark');
var Home2 = require('./lib/home2');
var Server = require('../../../../shared/test/integration/server');
var System = require('../../../../apps/system/test/marionette/lib/system');

marionette('Vertical - Bookmark Favicon Failure', function() {

  var client = marionette.client(Home2.clientOptions);
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

  setup(function() {
    home = new Home2(client);
    system = new System(client);
    bookmark = new Bookmark(client, server);
    system.waitForStartup();

    client.apps.launch(Home2.URL);
  });

  test('Invalid icons get default icon assigned', function() {
    system.goHome();
    client.switchToFrame(system.getHomescreenIframe());
    var url = server.url('sample.html');

    client.switchToFrame();
    bookmark.openAndSave(url);

    system.goHome();
    client.switchToFrame(system.getHomescreenIframe());

    var icon = home.getIcon(url);

    // ensure the default icon is shown
    client.waitFor(function() {
      var src = iconSrc(icon);
      return src && src.indexOf('default') !== -1;
    });
  });

});
