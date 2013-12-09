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

  setup(function() {
    settings = sys.waitForLaunch(SETTINGS_APP);
    sms = sys.waitForLaunch(SMS_APP);
    calendar = sys.waitForLaunch(CALENDAR_APP);

    // Making sure the opening transition for the calendar app is over.
    client.waitFor(function() {
      return calendar.displayed() && !sms.displayed();
    });
  });

  function edgeSwipeToApp(panel, x1, x2, iframe) {
    actions.flick(panel, x1, 120, x2, 120, 100).perform();

    if (!iframe) {
      return;
    }

    client.waitFor(function() {
      return iframe.displayed();
    });
  }

  test('Swiping between apps left to right', function() {
    assert(calendar.displayed(), 'calendar is visible');
    assert(!sms.displayed(), 'sms is invisible');

    edgeSwipeToApp(sys.leftPanel, 0, 250, sms);
    assert(sms.displayed(), 'sms is visible');
    assert(!calendar.displayed(), 'calendar is invisible');

    edgeSwipeToApp(sys.leftPanel, 0, 250, settings);
    assert(settings.displayed(), 'settings is visible');
    assert(!sms.displayed(), 'sms is invisible');

    // Overflow swipe
    edgeSwipeToApp(sys.leftPanel, 0, 250);
    assert(settings.displayed(), 'settings is still visible');
  });

  test('Swiping between apps right to left', function() {
    // Going to the beginning of the stack first
    edgeSwipeToApp(sys.leftPanel, 0, 250, sms);
    edgeSwipeToApp(sys.leftPanel, 0, 250, settings);

    assert(settings.displayed(), 'settings is visible');
    assert(!sms.displayed(), 'sms is invisible');

    edgeSwipeToApp(sys.rightPanel, 5, -255, sms);
    assert(sms.displayed(), 'sms is visible');
    assert(!settings.displayed(), 'settings is invisible');

    edgeSwipeToApp(sys.rightPanel, 5, -255, calendar);
    assert(calendar.displayed(), 'calendar is visible');
    assert(!sms.displayed(), 'sms is invisible');

    // Overflow swipe
    edgeSwipeToApp(sys.rightPanel, 5, -255);
    assert(calendar.displayed(), 'calendar is still visible');
  });

  test('Swiping vertically', function() {
    // Going to the settings app first
    edgeSwipeToApp(sys.leftPanel, 0, 250, sms);
    edgeSwipeToApp(sys.leftPanel, 0, 250, settings);

    assert(settings.displayed(), 'settings is visible');
    actions.flick(sys.leftPanel, 10, 120, 10, 80, 300).perform();
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
