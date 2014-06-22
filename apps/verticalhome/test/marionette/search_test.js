/* global __dirname */

'use strict';

var assert = require('assert');

var Home2 = require('./lib/home2');
var Rocketbar = require(
  '../../../../apps/system/test/marionette/lib/rocketbar.js');
var Search = require('../../../../apps/search/test/marionette/lib/search.js');
var System = require('../../../../apps/system/test/marionette/lib/system');
var Browser = require('../../../../apps/browser/test/marionette/lib/browser');
var Server = require('../../../../shared/test/integration/server');

marionette('Vertical - Search', function() {

  var client = marionette.client(Home2.clientOptions);
  var home, rocketbar, search, system, browser, server;
  var phoneIdentifier =
    'app://communications.gaiamobile.org/manifest.webapp-dialer';

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
    system = new System(client);
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    home = new Home2(client);
    search = new Search(client);
    rocketbar = new Rocketbar(client);
    system = new System(client);
    browser = new Browser(client);
    system.waitForStartup();
    search.removeGeolocationPermission();
  });

  test('Search notification', function() {

    var searchUrl = server.url('search.html') + '?q={searchTerms}';
    client.settings.set('search.urlTemplate', searchUrl);

    home.waitForLaunch();
    home.focusRocketBar();

    var confirmSelector = Search.Selectors.firstRunConfirm;
    // Notice should not be displayed if we type < 3 characters
    rocketbar.enterText('ab');
    rocketbar.enterText('cd');
    search.goToResults();
    assert.ok(!client.findElement(confirmSelector).displayed());

    // Notice should be displayed if we show > 3 characters
    client.switchToFrame();
    rocketbar.enterText('abc');
    search.goToResults();
    assert.ok(client.findElement(confirmSelector).displayed());

    // Notice should be dismissed if we press enter
    client.switchToFrame();
    rocketbar.enterText('abc\uE006');
    client.apps.switchToApp(Browser.URL);
    client.switchToFrame();
    home.pressHomeButton();
    client.apps.switchToApp(Home2.URL);
    home.focusRocketBar();
    search.goToResults();
    assert.ok(!client.findElement(confirmSelector).displayed());
  });

  test('General walkthrough', function() {

    var searchUrl = server.url('search.html') + '?q={searchTerms}';
    client.settings.set('search.urlTemplate', searchUrl);

    // Lauch the rocketbar and trigger its first run notice
    home.waitForLaunch();
    home.focusRocketBar();
    search.triggerFirstRun(rocketbar);

    // Clear button shouldnt be visible when no text entered
    assert.ok(!rocketbar.clear.displayed());

    // Search for an app ane make sure it exists
    rocketbar.enterText('Phone');
    search.goToResults();
    search.checkAppResult(phoneIdentifier, 'Phone');

    // Press rocketbar close button, ensure the homescreen is
    // now displayed
    client.switchToFrame();
    rocketbar.cancel.click();
    client.apps.switchToApp(Home2.URL);
    var firstIcon = client.helper.waitForElement(Home2.Selectors.firstIcon);
    assert.ok(firstIcon.displayed());

    // When we previously pressed close, when rocketbar reopens value
    // should be empty
    home.focusRocketBar();
    assert.equal(rocketbar.input.getAttribute('value'), '');

    // Search for an app again, this time press close after searching
    rocketbar.enterText('Phone');
    home.pressHomeButton();

    client.apps.switchToApp(Home2.URL);
    firstIcon = client.helper.waitForElement(Home2.Selectors.firstIcon);
    assert.ok(firstIcon.displayed());

    // If we press home button during a search, next time we focus the rocketbar
    // previous result should be displayed
    home.focusRocketBar();
    search.goToResults();
    search.checkAppResult(phoneIdentifier, 'Phone');

    // Clear button should be visible when text entered
    client.switchToFrame();
    assert.ok(rocketbar.clear.displayed());

    // Press clear button, input
    rocketbar.clear.click();
    assert.equal(rocketbar.input.getAttribute('value'), '');
    assert.ok(!rocketbar.clear.displayed());

    // Perform a search
    rocketbar.enterText('a test\uE006');
    client.apps.switchToApp(Browser.URL);
    var frame = browser.currentTabFrame();
    assert.equal(frame.getAttribute('src'),
                 server.url('search.html') + '?q=a%20test');
  });

});
