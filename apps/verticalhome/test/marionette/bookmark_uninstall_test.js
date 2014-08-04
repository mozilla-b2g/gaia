'use strict';
/* global __dirname */

var assert = require('assert');

var Bookmark = require('./lib/bookmark');
var Browser = require('../../../../apps/browser/test/marionette/lib/browser');
var Home2 = require('./lib/home2');
var Server = require('../../../../shared/test/integration/server');
var System = require('../../../../apps/system/test/marionette/lib/system');

marionette('Vertical - Bookmark Uninstall', function() {

  // Bug 1007352 - homescreen URL is hard-coded so we run this test with the
  // old homescreen, then launch the new homescreen as an app. This is only
  // needed because we lauch other applications.
  var options = JSON.parse(JSON.stringify(Home2.clientOptions));
  delete options.settings['homescreen.manifestURL'];

  var client = marionette.client(options);
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
    var remove = icon.findElement('.remove');
    remove.click();
    home.confirmDialog('remove');

    // ensure the icon disappears
    client.helper.waitForElementToDisappear(icon);

    home.restart();

    // ensure bookmark is gone upon restart
    var allIconIds = home.getIconIdentifiers();
    assert.ok(allIconIds.indexOf(url) === -1, 'bookmark was removed');
  });
});
