'use strict';
/* global __dirname */

var assert = require('assert');

var Bookmark = require('./lib/bookmark');
var Browser = require('../../../../apps/browser/test/marionette/lib/browser');
var Home2 = require('./lib/home2');
var Server = require('../../../../shared/test/integration/server');
var System = require('../../../../apps/system/test/marionette/lib/system');

marionette('Vertical - Bookmark Uninstall', function() {

  var client = marionette.client(Home2.clientOptions);
  var bookmark, browser, home, server, system;

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
    browser = new Browser(client);
    home = new Home2(client);
    system = new System(client);
    bookmark = new Bookmark(client, server);
    system.waitForStartup();

    client.apps.launch(Home2.URL);
    home.waitForLaunch();

    url = server.url('sample.html');
    bookmark.save(url, browser);

    client.switchToFrame();
    system.goHome();
    client.switchToFrame(system.getHomescreenIframe());
    home.enterEditMode();
  });

  test('removal of bookmark', function() {
    // select the icon in edit mode and click remove
    var icon = home.getIcon(url);

    // XXX: work around issues where the icon is hidden by other
    //      status messages on the system app.
    icon.scriptWith(function(el) {
      // effectively scroll to the bottom of the screen.
      el.scrollIntoView(false);
    });

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
