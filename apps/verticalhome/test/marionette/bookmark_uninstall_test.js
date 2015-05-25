'use strict';
/* global __dirname */

var assert = require('assert');

var Bookmark = require('../../../../apps/system/test/marionette/lib/bookmark');
var Server = require('../../../../shared/test/integration/server');

marionette('Vertical - Bookmark Uninstall', function() {

  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
  });
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

  test('removal of bookmark', function() {
    // select the icon in edit mode and click remove
    var icon = home.getIcon(url);
    home.moveIconToIndex(icon, 0);
    var remove = icon.findElement('.remove');
    remove.tap();
    home.confirmDialog('remove');

    // ensure the icon disappears
    client.helper.waitForElementToDisappear(icon);

    home.restart();

    // ensure bookmark is gone upon restart
    var allIconIds = home.getIconIdentifiers();
    assert.ok(allIconIds.indexOf(url) === -1, 'bookmark was removed');
  });
});
