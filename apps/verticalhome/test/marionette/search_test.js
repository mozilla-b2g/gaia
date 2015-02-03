/* global __dirname */

'use strict';

var assert = require('assert');

var Rocketbar = require(
  '../../../../apps/system/test/marionette/lib/rocketbar.js');
var Server = require('../../../../shared/test/integration/server');
var EmeServer = require(
  '../../../../shared/test/integration/eme_server/parent');

marionette('Vertical - Search', function() {

  var client = marionette.client(require(__dirname + '/client_options.js'));
  var home, rocketbar, search, system, server, emeServer;
  var phoneIdentifier =
    'app://communications.gaiamobile.org/manifest.webapp-dialer';

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      EmeServer(client, function(err, _server) {
        emeServer = _server;
        done(err);
      });
    });
  });

  suiteTeardown(function(done) {
    server.stop();
    emeServer.close(done);
  });

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    search = client.loader.getAppClass('search');
    rocketbar = new Rocketbar(client);
    system = client.loader.getAppClass('system');
    system.waitForStartup();
    EmeServer.setServerURL(client, emeServer);
  });

  test('Search notification', function() {

    var searchUrl = server.url('search.html') + '?q={searchTerms}';
    client.settings.set('search.urlTemplate', searchUrl);

    home.waitForLaunch();
    home.focusRocketBar();

    var confirmSelector = search.Selectors.firstRunConfirm;
    // Notice should not be displayed if we type < 3 characters
    rocketbar.enterText('ab');
    rocketbar.enterText('cd');
    search.goToResults();
    assert.ok(!client.findElement(confirmSelector).displayed());

    // Notice should be displayed if we show > 3 characters
    client.switchToFrame();
    rocketbar.enterText('abc');
    search.goToResults();
    client.helper.waitForElement(confirmSelector);

    // But not displayed if we clear them and type < 3 characters
    var confirm = client.findElement(confirmSelector);
    client.switchToFrame();
    rocketbar.enterText('ab');
    search.goToResults();
    client.helper.waitForElementToDisappear(confirm);

    // Should not show notice if suggestions are disabled
    client.settings.set('search.suggestions.enabled', false);
    client.switchToFrame();
    rocketbar.enterText('abc');
    search.goToResults();
    client.helper.waitForElementToDisappear(confirm);

    // Notice should be dismissed if we press enter
    client.settings.set('search.suggestions.enabled', true);
    client.switchToFrame();
    var searchText = 'abc\uE006';
    rocketbar.enterText(searchText);
    rocketbar.switchToSearchFrame(searchUrl, searchText);
    client.switchToFrame();
    home.pressHomeButton();
    client.apps.switchToApp(home.URL);
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
    search.checkResult(phoneIdentifier, 'Phone');

    // Press rocketbar close button, ensure the homescreen is
    // now displayed
    client.switchToFrame();
    rocketbar.cancel.click();
    client.apps.switchToApp(home.URL);
    var firstIcon = client.helper.waitForElement(home.Selectors.firstIcon);
    assert.ok(firstIcon.displayed());

    // When we previously pressed close, when rocketbar reopens value
    // should be empty
    home.focusRocketBar();
    assert.equal(rocketbar.input.getAttribute('value'), '');

    // Search for an app again, this time press close after searching
    rocketbar.enterText('Phone');
    home.pressHomeButton();

    client.apps.switchToApp(home.URL);
    firstIcon = client.helper.waitForElement(home.Selectors.firstIcon);
    assert.ok(firstIcon.displayed());

    // If we press home button during a search, next time we focus the rocketbar
    // previous result should be displayed
    home.focusRocketBar();
    search.goToResults();
    search.checkResult(phoneIdentifier, 'Phone');

    // Clear button should be visible when text entered
    client.switchToFrame();
    assert.ok(rocketbar.clear.displayed());

    // Press clear button, input
    rocketbar.clear.click();
    assert.equal(rocketbar.input.getAttribute('value'), '');
    assert.ok(!rocketbar.clear.displayed());

    // Perform a search
    rocketbar.enterText('a test\uE006');
    rocketbar.switchToBrowserFrame(server.url('search.html') + '?q=a%20test');
  });

});
