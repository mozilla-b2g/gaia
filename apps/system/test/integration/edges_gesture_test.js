marionette('Edges gesture >', function() {
  var assert = require('assert');
  var Actions = require('marionette-client').Actions;
  var System = require('./lib/system.js');

  var SETTINGS_APP = 'app://settings.gaiamobile.org';
  var SMS_APP = 'app://sms.gaiamobile.org';
  var CALENDAR_APP = 'app://calendar.gaiamobile.org';

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false,
      'edgesgesture.debug': true,
      'edgesgesture.enabled': true
    }
  });
  var sys = new System(client);
  var actions = new Actions(client);

  var settings, sms, calendar;

  var halfWidth, halfHeight;

  setup(function() {
    settings = sys.waitForLaunch(SETTINGS_APP);
    sms = sys.waitForLaunch(SMS_APP);
    calendar = sys.waitForLaunch(CALENDAR_APP);

    // Making sure the opening transition for the calendar app is over.
    client.waitFor(function() {
      return calendar.displayed() && !sms.displayed();
    });

    var width = client.executeScript(function() {
      return window.innerWidth;
    });
    halfWidth = width / 2;

    var height = client.executeScript(function() {
      return window.innerHeight;
    });
    halfHeight = height / 2;
  });

  function edgeSwipeToApp(panel, x1, x2, from, to) {
    actions.flick(panel, x1, halfHeight, x2, halfHeight, 100).perform();

    if (!from || !to) {
      return;
    }

    client.waitFor(function() {
      return !from.displayed() && to.displayed();
    });
  }

  test('Swiping between apps left to right', function() {
    assert(calendar.displayed(), 'calendar is visible');
    assert(!sms.displayed(), 'sms is invisible');

    edgeSwipeToApp(sys.leftPanel, 0, halfWidth, calendar, sms);
    assert(true, 'swiped to sms');

    edgeSwipeToApp(sys.leftPanel, 0, halfWidth, sms, settings);
    assert(true, 'swiped to settings');

    // Overflow swipe
    edgeSwipeToApp(sys.leftPanel, 0, halfWidth);
    assert(settings.displayed(), 'settings is still visible');
  });

  test('Swiping between apps right to left', function() {
    // Going to the beginning of the stack first
    edgeSwipeToApp(sys.leftPanel, 0, halfWidth, calendar, sms);
    edgeSwipeToApp(sys.leftPanel, 0, halfWidth, sms, settings);

    assert(settings.displayed(), 'settings is visible');
    assert(!sms.displayed(), 'sms is invisible');

    edgeSwipeToApp(sys.rightPanel, 5, -1 * halfWidth, settings, sms);
    assert(true, 'swiped to sms');

    edgeSwipeToApp(sys.rightPanel, 5, -1 * halfWidth, sms, calendar);
    assert(true, 'swiped to calendar');

    // Overflow swipe
    edgeSwipeToApp(sys.rightPanel, 5, -1 * halfWidth);
    assert(calendar.displayed(), 'calendar is still visible');
  });

  // Blocked by bug 959242
  test.skip('Swiping vertically', function() {
    // Going to the settings app first
    edgeSwipeToApp(sys.leftPanel, 0, halfWidth, calendar, sms);
    edgeSwipeToApp(sys.leftPanel, 0, halfWidth, sms, settings);

    assert(settings.displayed(), 'settings is visible');
    actions.flick(sys.leftPanel, 10, halfHeight, 10, 0, 300).perform();
    assert(settings.displayed(), 'settings is still visible');

    // Checking that the settings app scrolled
    client.apps.switchToApp(SETTINGS_APP);
    var scrollY = client.executeScript(function() {
      return document.querySelector('#root > div').scrollTop;
    });
    assert(scrollY > 40, 'the settings app scrolled');
  });

  test('Swiping below the threshold', function() {
    assert(calendar.displayed(), 'calendar is visible');
    edgeSwipeToApp(sys.leftPanel, 0, 20);

    // Waiting for iframes to settle down
    client.waitFor(function() {
      return !sms.displayed();
    });
    assert(calendar.displayed(), 'calendar is still visible');
  });
});
