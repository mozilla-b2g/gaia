'use strict';

var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');
var assert = require('assert');

marionette('Browser Chrome - Back/Forward button', function() {

  var client = marionette.client({
    profile: {
      apps: {
        'fakechromenavapp.gaiamobile.org':
          __dirname + '/../apps/fakechromenavapp',
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  var actions, rocketbar, search, server, system;

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
    actions = client.loader.getActions();
    rocketbar = new Rocketbar(client);
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  function waitForTitle(text, url) {
    system.gotoBrowser(url);
    client.waitFor(function() {
      var title = client.findElement('h1');
      return title && title.text() === text;
    });
  }

  test('navigation back and forward', function() {
    // Use the home-screen search box to open up the system browser
    var url = server.url('sample.html');
    rocketbar.goToURL(url);
    waitForTitle('Mozilla Sample', url);

    client.findElement('a').click();
    waitForTitle('Mozilla Darkpage', url);

    system.goBack();
    waitForTitle('Mozilla Sample', url);

    system.goForward();
    waitForTitle('Mozilla Darkpage', url);
  });

  test('browsing a 2nd website should display back icon', function() {
    // Use the home-screen search box to open up the system browser
    var url = server.url('sample.html');
    rocketbar.homescreenFocus();
    rocketbar.enterText(url, true);

    // open url in browser
    var frame = client.helper.waitForElement(
      'div[transition-state="opened"] iframe[src="' + url + '"]');
    client.switchToFrame(frame);

    client.switchToFrame();
    system.appChromeContextLink.tap();
    system.appChromeContextNewPrivate.tap();
    system.gotoBrowser(search.privateBrowserUrl);

    // enter private mode
    client.switchToFrame();
    system.appUrlbar.tap();
    rocketbar.enterText(url, true);
    system.gotoBrowser(url);

    client.switchToFrame();
    system.appUrlbar.tap();

    // navigate to 2nd url
    var url2 = server.url('darkpage.html');
    rocketbar.enterText(url2, true);
    system.gotoBrowser(url2);
    client.switchToFrame();

    client.waitFor(function() {
      return system.appChromeBack.displayed();
    });

    // check back btn backgroudn-image exists
    assert.notEqual(system.appChromeBack.cssProperty('background-image'),
                    'none',
                    'back button image should exist');
  });
});
