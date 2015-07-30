'use strict';

var Rocketbar = require('./lib/rocketbar');

marionette('Browser Chrome - Title content', function() {

  var client = marionette.client();

  var home, rocketbar, search, system;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    home = client.loader.getAppClass('verticalhome');
    rocketbar = new Rocketbar(client);
    search = client.loader.getAppClass('search');
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
