'use strict';
/* global __dirname */

var assert = require('assert');

var Bookmark = require('./lib/bookmark');
var Browser = require('../../../../apps/browser/test/marionette/lib/browser');
var Home2 = require('./lib/home2');
var Server = require('../../../../shared/test/integration/server');
var System = require('../../../../apps/system/test/marionette/lib/system');

marionette('Vertical - Bookmark', function() {

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

  setup(function() {
    browser = new Browser(client);
    home = new Home2(client);
    system = new System(client);
    bookmark = new Bookmark(client, server);
    system.waitForStartup();

    client.apps.launch(Home2.URL);

    home.waitForLaunch();
  });

  test('Bookmarking appends to last group', function() {
    var numIcons = home.numIcons;
    var numDividers = home.numDividers;
    var url = server.url('sample.html');
    var homescreenFrame;

    bookmark.save(url, browser);
    client.switchToFrame();
    homescreenFrame = client.findElement('iframe[src*="' + Home2.URL + '"]');
    client.switchToFrame(homescreenFrame);

    client.waitFor(function() {
      return numIcons + 1 === home.numIcons;
    });
    assert.equal(numDividers, home.numDividers);
  });

});
