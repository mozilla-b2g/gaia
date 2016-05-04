'use strict';
/* global __dirname */

var assert = require('assert');

var Bookmark = require('../../../../apps/system/test/marionette/lib/bookmark');
var Server = require('../../../../shared/test/integration/server');

marionette('Vertical - Bookmark', function() {
  var options = require(__dirname + '/client_options.js');
  options.settings['dev.gaia.pinning_the_web'] = false;
  var client = marionette.client({
    profile: options,
    desiredCapabilities: { raisesAccessibilityExceptions: false }
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

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    bookmark = new Bookmark(client, server);
    system.waitForFullyLoaded();

    client.apps.launch(home.URL);
  });

  test('Bookmarking appends to last group', function() {
    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());

    var numIcons = home.numIcons;
    var numDividers = home.numDividers;
    var url = server.url('sample.html');

    client.switchToFrame();
    bookmark.openAndSave(url);

    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());

    client.waitFor(function() {
      return numIcons + 1 === home.numIcons;
    });
    assert.equal(numDividers, home.numDividers);
  });

});
