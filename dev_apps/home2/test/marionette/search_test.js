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

  setup(function() {
    home = new Home2(client);
    search = new Search(client);
    rocketbar = new Rocketbar(client);
    system = new System(client);
    system.waitForStartup();
  });

  test('Search for app', function() {
    home.waitForLaunch();
    client.helper.waitForElement(Home2.Selectors.search).tap();
    client.switchToFrame();

    rocketbar.enterText('Phone');
    search.goToResults();
    search.checkResult('firstApp', 'Phone');
    search.goToApp('app://communications.gaiamobile.org', 'dialer');
  });

  test('Home button returns to homescreen', function() {
    home.waitForLaunch();
    client.helper.waitForElement(Home2.Selectors.search).tap();
    client.switchToFrame();
    rocketbar.enterText('Phone');
    search.goToResults();

    client.switchToFrame();
    home.pressHomeButton();

    client.apps.switchToApp(Home2.URL);
    var firstIcon = client.helper.waitForElement(Home2.Selectors.firstIcon);
    assert.ok(firstIcon.displayed());
  });

});
