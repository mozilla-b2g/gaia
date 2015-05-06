'use strict';

var assert = require('assert');
var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');

marionette('Browser - Launch the same origin after navigating away',
  function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    }
  });

  var home, rocketbar, search, server1, server2, system;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server1 = _server;
    });
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server2 = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server1.stop();
    server2.stop();
  });

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    rocketbar = new Rocketbar(client);
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    system.waitForStartup();
  });

  test('opens a new sheet when navigating', function() {
    var url1 = server1.url('sample.html');
    var url2 = server2.url('darkpage.html');

    // Open the first URL in a sheet.
    rocketbar.homescreenFocus();
    rocketbar.enterText(url1 + '\uE006');

    // Switch to the app, and navigate to a different url.
    var frame = client.helper.waitForElement(
      'div[transition-state="opened"] iframe[src="' + url1 + '"]');
    client.switchToFrame(frame);
    client.executeScript(function(gotoUrl) {
      window.wrappedJSObject.location.href = gotoUrl;
    }, [url2]);

    client.switchToFrame();
    var browsingFrames = client.findElements('iframe[src*="http://localhost"]');
    assert.equal(browsingFrames.length, 1, 'should have one browser windows');

    // Try navigating to the same url again.
    client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(new CustomEvent('home'));
    });
    rocketbar.homescreenFocus();
    rocketbar.enterText(url1 + '\uE006');

    // Validate that a new sheet opens.
    browsingFrames = client.findElements('iframe[src*="http://localhost"]');
    assert.equal(browsingFrames.length, 2, 'should have two browser windows');
  });
});
