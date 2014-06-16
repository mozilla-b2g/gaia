'use strict';

var assert = require('assert');

var Home2 = require('./lib/home2');
var Rocketbar = require(
  '../../../../apps/system/test/marionette/lib/rocketbar.js');
var Search = require('../../../../apps/search/test/marionette/lib/search.js');
var System = require('../../../../apps/system/test/marionette/lib/system');

marionette('Vertical - Search', function() {

  var client = marionette.client(Home2.clientOptions);
  var home, rocketbar, search, system;
  var phoneIdentifier =
    'app://communications.gaiamobile.org/manifest.webapp-dialer';

  setup(function() {
    home = new Home2(client);
    search = new Search(client);
    rocketbar = new Rocketbar(client);
    system = new System(client);
    system.waitForStartup();
    search.removeGeolocationPermission();
  });

  test('General walkthrough', function() {

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
  });

});
