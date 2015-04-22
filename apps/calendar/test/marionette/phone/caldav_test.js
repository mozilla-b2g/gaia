'use strict';

var Calendar = require('../lib/calendar'),
    Radicale = require('../lib/radicale'),
    assert = require('chai').assert,
    dateFormat = require('dateformat');

var ACCOUNT_USERNAME = 'firefox-os',
    TITLE = 'Go for a dream',
    DATE_PATTERN = 'yyyymmdd"T"HHMMssZ';

marionette('configure CalDAV accounts', function() {
  var client = marionette.client({
    prefs: {
      // we need to disable the keyboard to avoid intermittent failures on
      // Travis (transitions might take longer to run and block UI)
      'dom.mozInputMethod.enabled': false,
      // Do not require the B2G-desktop app window to have focus (as per the
      // system window manager) in order for it to do focus-related things.
      'focusmanager.testmode': true,
    }
  });

  var serverHelper = new Radicale(),
      app = null;

  setup(function(done) {
    app = new Calendar(client);
    app.launch();

    serverHelper.start(function(error, port) {
      if (error) {
        return done(error);
      }

      var accountUrl = 'http://localhost:' + port + '/' + ACCOUNT_USERNAME,
          startDate = new Date(),
          endDate = new Date(),
          event = {};

      app.setupAccount({
        accountType: 'caldav',
        user: ACCOUNT_USERNAME,
        fullUrl: accountUrl
      });

      // Make sure we have a event item
      // in the top of event-list view in month view.
      startDate.setMinutes(0);
      endDate.setMinutes(59);
      event = {
        startDate: dateFormat(startDate, DATE_PATTERN),
        endDate: dateFormat(endDate, DATE_PATTERN),
        title: TITLE
      };
      serverHelper.addEvent(ACCOUNT_USERNAME, event);

      app.sync();
      // Make sure we start the server before the setup is ended.
      done();
    });
  });

  teardown(function(done) {
    // No matter how, we close the server in the end.
    try {
      serverHelper.removeAllEvents();
    } catch (error) {
      console.error(error.message);
    } finally {
      serverHelper.close(done);
    }
  });

  test('should show a event', function() {
    var event = app.monthDay.events[0];

    // Scroll so that the first one is in view and click it.
    app.monthDay.scrollToEvent(event);
    event.click();

    assertEvent(ACCOUNT_USERNAME, TITLE);
  });

  test('events from disabled calendars should not be displayed', function() {
    var events = app.monthDay.events;
    assert.equal(events.length, 1, 'at least one event');

    app.openSettingsView();
    app.settings.toggleCalendar(ACCOUNT_USERNAME);
    app.closeSettingsView();

    assert.deepEqual(app.monthDay.events, [], 'events should be removed');

    var startDate = new Date();
    var endDate = new Date();
    endDate.setHours(endDate.getHours() + 1);
    var event = {
      startDate: dateFormat(startDate, DATE_PATTERN),
      endDate: dateFormat(endDate, DATE_PATTERN),
      title: TITLE
    };
    serverHelper.addEvent(ACCOUNT_USERNAME, event);

    app.openSettingsView();
    app.settings.sync();
    app.closeSettingsView();

    assert.deepEqual(app.monthDay.events, [], 'events should not be added');
  });

  function assertEvent(username, title) {
    app.readEvent.waitForDisplay();

    assert.deepEqual(
      app.readEvent.title,
      title,
      'event should have correct title'
    );
    // Make sure the event is created in the CalDAV username.
    assert.deepEqual(
      app.readEvent.calendar,
      username,
      'event should be created by the correct user'
    );
  }
});
