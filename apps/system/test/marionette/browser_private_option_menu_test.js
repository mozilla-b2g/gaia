'use strict';

var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');
var assert = require('chai').assert;

marionette('Private Browser - option menu', function() {

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true,
      'dom.w3c_touch_events.enabled': 1
    }
  });

  var home, rocketbar, search, server, system;

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
    rocketbar = new Rocketbar(client);
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    system.waitForStartup();
  });

  test('Open option menu from app chrome bar of private browsers', function() {
    // Use the home-screen search box to open up the system browser
    var url = server.url('sample.html');
    rocketbar.homescreenFocus();
    search.triggerFirstRun(rocketbar);
    rocketbar.enterText(url + '\uE006');
    system.gotoBrowser(url);

    client.switchToFrame();
    system.appChromeContextLink.tap();
    system.appChromeContextNewPrivate.tap();
    system.gotoBrowser('app://system.gaiamobile.org/private_browser.html');

    client.switchToFrame();
    client.findElement('.active.private .menu-button').click();

    var selectorCancel = '.active.private #ctx-cancel-button';
    // // Cancel the context menu
    var cancel = client.helper.waitForElement(selectorCancel);

    assert.isTrue(client.findElement('#windows').scriptWith(function(el) {
      return el.scrollTop === 0;
    }), 'scroll top should be zero while context menu is focused.');

    // click cancel to hide it
    cancel.click();
    client.helper.waitForElementToDisappear(cancel);
  });
});
