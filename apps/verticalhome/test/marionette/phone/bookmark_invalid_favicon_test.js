'use strict';
/* global __dirname */

var iconSrc = require('./lib/icon_src');
var Bookmark = require(
  '../../../../../apps/system/test/marionette/lib/bookmark');
var Server = require('../../../../../shared/test/integration/server');

marionette('Vertical - Bookmark Favicon Failure', function() {

  var client = marionette.client(require(__dirname + '/client_options.js'));
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
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    bookmark = new Bookmark(client, server);
    system.waitForStartup();

    client.apps.launch(home.URL);
  });

  test('Invalid icons get default icon assigned', function() {
    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());
    var url = server.url('sample.html');

    client.switchToFrame();
    bookmark.openAndSave(url);

    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());

    var icon = home.getIcon(url);

    // ensure the default icon is shown
    client.waitFor(function() {
      var src = iconSrc(icon);
      return src && src.indexOf('default') !== -1;
    });
  });

});
