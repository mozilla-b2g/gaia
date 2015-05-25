'use strict';

var assert = require('assert');
var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');

marionette('Private Browser - Basic Sanity Test', function() {

  var client = marionette.client();

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

  var STORAGE_KEY = 'foo';

  function getStorageValue() {
    return client.executeScript(function(STORAGE_KEY) {
      return window.wrappedJSObject.localStorage.getItem(STORAGE_KEY);
    }, [STORAGE_KEY]);
  }

  test('Should not keep personal info like localStorage',
    function() {
    // Use the home-screen search box to open up the system browser
    var url = server.url('sample.html');
    rocketbar.homescreenFocus();
    search.triggerFirstRun(rocketbar);
    rocketbar.enterText(url + '\uE006');
    system.gotoBrowser(url);
    client.executeScript(function(STORAGE_KEY) {
      window.wrappedJSObject.localStorage.setItem(STORAGE_KEY, 'bar');
    }, [STORAGE_KEY]);

    // Now navigate to another page from the same origin and verify we have
    // the correct localStorage value.
    client.switchToFrame();
    system.goHome();
    rocketbar.homescreenFocus();
    var url2 = server.url('darkpage.html');
    rocketbar.enterText(url2 + '\uE006');
    system.gotoBrowser(url2);
    assert.equal(getStorageValue(), 'bar');

    // Now open a private browsing session of the same page.
    // The localStorage value should not be set.
    client.switchToFrame();
    system.appChromeContextLink.tap();
    system.appChromeContextNewPrivate.tap();
    system.gotoBrowser('app://system.gaiamobile.org/private_browser.html');

    client.switchToFrame();
    system.appUrlbar.tap();
    rocketbar.enterText(url2 + '\uE006');
    system.gotoBrowser(url2);
    assert.equal(getStorageValue(), null);
  });
});
