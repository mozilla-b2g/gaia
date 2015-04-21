'use strict';

var Calendar = require('../lib/calendar'),
    assert = require('chai').assert;

var SHARED_PATH = __dirname + '/../../../../../shared/test/integration';

marionette('alarm', function() {
  var app;
  var client = marionette.client({
    prefs: {
      // we need to disable the keyboard to avoid intermittent failures on
      // Travis (transitions might take longer to run and block UI)
      'dom.mozInputMethod.enabled': false,
      // Do not require the B2G-desktop app window to have focus (as per the
      // system window manager) in order for it to do focus-related things.
      'focusmanager.testmode': true
    }
  });

  suite(' > with alarm mocks', function() {

    setup(function() {
      app = new Calendar(client);
      client.contentScript.inject(SHARED_PATH +
        '/mock_navigator_mozalarms.js');
      client.contentScript.inject(SHARED_PATH +
        '/mock_navigator_moz_set_message_handler.js');
      app.launch();
    });

    suite('create event with a single reminder', function() {
      setup(function() {
        createEventWithReminders(app, ['5 minutes before']);
        app.monthDay.scrollToEvent();
      });

      test('should display reminder in read-only event view', function() {
        var reminders = getEventReminders(app);
        assert.equal(reminders.length, 1);
        assert.include(reminders, '5 minutes before');
      });

      test('should add alarm to alarms api', function() {
        var alarms = getMozAlarms(client);
        assert.equal(alarms.length, 1);
      });
    });

    suite('create an event with two valid reminders', function() {
      setup(function() {
        createEventWithReminders(app, ['5 minutes before',
                                       '15 minutes before']);
        app.monthDay.scrollToEvent();
      });

      test('should display both reminders in read-only view', function() {
        var reminders = getEventReminders(app);
        assert.equal(reminders.length, 2);
        assert.include(reminders, '5 minutes before');
        assert.include(reminders, '15 minutes before');
      });

      test('should only fire one alarm', function() {
        var alarms = getMozAlarms(client);
        assert.equal(alarms.length, 1);
      });
    });
  });

  suite('> without alarm mocks', function() {
    setup(function() {
      app = new Calendar(client);
      app.launch();
    });

    suite('create two events with simultaneous reminders', function() {
      setup(function() {
        var startTime = Date.now() + 5000; // 5 seconds in future
        app.createEvent({
          title: 'First Event',
          startDate: new Date(startTime),
          reminders: ['At time of event']
        });
        app.createEvent({
          title: 'Second Event',
          startDate: new Date(startTime),
          reminders: ['At time of event']
        });
      });

      test('both events trigger notifications', function() {
        client.switchToFrame();
        client.waitFor(function() {
          var notificationSelector = '#desktop-notifications-container > div';
          return client.findElements(notificationSelector).length > 1;
        });
      });
    });
  });
});

function createEventWithReminders(app, reminders) {
  app.createEvent({
    title: 'Panic!',
    location: 'The Disco',
    startDate: new Date(),
    reminders: reminders
  });
}

function getEventReminders(app) {
  var event = app.monthDay.events[0];
  event.click();

  app.readEvent.waitForDisplay();
  return app.readEvent.alarms;
}

function getMozAlarms(client) {
  var alarms;
  client.waitFor(function() {
    alarms = client.executeScript(function() {
      return window.wrappedJSObject.navigator.__mozFakeAlarms;
    });

    return alarms && alarms.length;
  });

  return alarms;
}
