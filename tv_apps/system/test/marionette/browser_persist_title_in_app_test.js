'use strict';

var Home = require(
  '../../../../apps/verticalhome/test/marionette/lib/home2');
var Search = require(
  '../../../../apps/search/test/marionette/lib/search');
var System = require('./lib/system');
var Rocketbar = require('./lib/rocketbar');

marionette('Browser Chrome - Title content', function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  var home, rocketbar, search, system;

  setup(function() {
    home = new Home(client);
    rocketbar = new Rocketbar(client);
    search = new Search(client);
    system = new System(client);
    system.waitForStartup();

    search.removeGeolocationPermission();
  });

  test('Launching rocketbar from an app persists the search term', function() {
    // Use the home-screen search box to open up the system browser
    rocketbar.homescreenFocus();
    search.triggerFirstRun(rocketbar);
    rocketbar.enterText('cal');

    search.goToResults();
    var calendarUrl = 'app://calendar.gaiamobile.org';
    var result = search.checkResult(calendarUrl, 'Calendar');
    result.tap();
    client.switchToFrame();
    client.apps.switchToApp(calendarUrl);
    client.helper.waitForElement('body');
    client.switchToFrame();

    system.appUrlbar.tap();
    client.waitFor(function() {
      return rocketbar.input.getAttribute('value') === 'cal';
    });
  });
});
