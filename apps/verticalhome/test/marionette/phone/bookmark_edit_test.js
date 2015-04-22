'use strict';
/* global __dirname */

var Bookmark = require(
  '../../../../../apps/system/test/marionette/lib/bookmark');
var Server = require('../../../../../shared/test/integration/server');

marionette('Vertical - Bookmark EDIT', function() {
  var client = marionette.client(require(__dirname + '/client_options.js'));
  var bookmark, home, server, system;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  var url;
  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    bookmark = new Bookmark(client, server);
    system.waitForStartup();

    client.apps.launch(home.URL);

    url = server.url('sample.html');
    bookmark.openAndSave(url);

    system.goHome();
    client.switchToFrame(system.getHomescreenIframe());
    home.enterEditMode();
  });

  test('pressing enter after editing the bookmark', function() {
    // select the icon in edit mode and click remove
    var icon = home.getIcon(url);
    home.moveIconToIndex(icon, 0);
    icon.tap();

    client.switchToFrame();
    bookmark.renameAndPressEnter('renamed');
    client.switchToFrame(system.getHomescreenIframe());

    client.waitFor(function() {
      var icon = home.getIcon(url);
      return icon.text() === 'renamed';
    });
  });
});
