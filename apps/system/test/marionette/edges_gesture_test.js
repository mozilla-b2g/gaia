'use strict';

var ReflowHelper =
    require('../../../../tests/js-marionette/reflow_helper.js');

var assert = require('assert');

var SETTINGS_APP = 'app://settings.gaiamobile.org';
var CALENDAR_APP = 'app://calendar.gaiamobile.org';

marionette('Edges gesture >', function() {
  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1,
      'devtools.debugger.forbid-certified-apps': false
    },
    settings: {
      'devtools.overlay': true,
      'hud.reflows': true
    }
  });

  var sys, actions;
  var settings, calendar;
  var halfWidth, halfHeight;

  setup(function() {
    actions = client.loader.getActions();

    sys = client.loader.getAppClass('system');
    sys.waitForStartup();

    settings = sys.waitForLaunch(SETTINGS_APP);
    calendar = sys.waitForLaunch(CALENDAR_APP);

    // Making sure the opening transition for the calendar app is over.
    client.waitFor(function() {
      return calendar.displayed() && !settings.displayed();
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

  test('Swiping between apps left to right, no reflow', function() {
    var reflowHelper = new ReflowHelper(client);
    // Since the clock will cause reflows we're disabling it
    // Also disabling the developer hud because of
    // https://bugzilla.mozilla.org/show_bug.cgi?id=971008
    sys.stopDevtools();
    sys.stopClock();
    sys.stopStatusbar();

    assert(calendar.displayed(), 'calendar is visible');
    assert(!settings.displayed(), 'settings is invisible');

    reflowHelper.startTracking(sys.URL);
    edgeSwipeToApp(sys.leftPanel, 0, halfWidth, calendar, settings);
    assert(true, 'swiped to settings');

    // Overflow swipe
    edgeSwipeToApp(sys.leftPanel, 0, halfWidth);
    client.waitFor(function() {
      return settings.displayed();
    });
    assert(true, 'settings is still visible');

    var count = reflowHelper.getCount();
    assert.equal(count, 0, 'we got ' + count + ' reflows instead of 0');
    reflowHelper.stopTracking();

    assert(true, 'swiped to settings without any reflow');
  });

  test('Swiping between apps right to left', function() {
    // Going to the beginning of the stack first
    edgeSwipeToApp(sys.leftPanel, 0, halfWidth, calendar, settings);

    assert(settings.displayed(), 'settings is visible');
    assert(!calendar.displayed(), 'calendar is invisible');

    edgeSwipeToApp(sys.rightPanel, 5, -1 * halfWidth, settings, calendar);
    assert(true, 'swiped to calendar');

    // Overflow swipe
    edgeSwipeToApp(sys.rightPanel, 5, -1 * halfWidth);
    assert(calendar.displayed(), 'calendar is still visible');
  });

  test('Swiping vertically', function() {
    // Going to the settings app first
    edgeSwipeToApp(sys.leftPanel, 0, halfWidth, calendar, settings);
    assert(settings.displayed(), 'settings is visible');

    // Mostly vertical swipe starting on the edge zone
    actions.flick(sys.leftPanel, 5, halfHeight + 40, 45, 40, 50).perform();
    assert(settings.displayed(), 'settings is still visible');

    // The actual amount scrolled depends on the scrolling physics,
    // BrowserElementPanning or APZ... but we only care about the
    // view actually scrolling.
    var fuzz = 0.7;

    // Checking that the settings app scrolled
    client.apps.switchToApp(SETTINGS_APP);
    client.waitFor(function() {
      var scrollY = client.executeScript(function() {
        return document.querySelector('#root > div').scrollTop;
      });

      return scrollY >= halfHeight * fuzz;
    });
    assert(true, 'the settings app scrolled');
  });

  test('Swiping below the threshold', function() {
    assert(calendar.displayed(), 'calendar is visible');
    edgeSwipeToApp(sys.leftPanel, 0, 20);

    // Waiting for iframes to settle down
    client.waitFor(function() {
      return !settings.displayed();
    });
    assert(calendar.displayed(), 'calendar is still visible');
  });
});
