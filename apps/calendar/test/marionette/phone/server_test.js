/* global require, marionette, setup, suite, teardown, test */
'use strict';

var Calendar = require('../lib/calendar'),
    Radicale = require('../lib/radicale'),
    assert = require('chai').assert,
    debug = require('debug')('marionette:server_test');

var calendarName = 'firefox-os';

marionette('interop basic', function() {
  var app, server;
  var client = marionette.client();

  var vanillaEvent = Object.freeze({
    title: 'Vanilla event',
    location: 'Baskin Robbins',
    description: 'What better a place for a vanilla event!',
    calendar: calendarName,
    startHour: 17,
    reminders: []
  });

  var allDayEvent = Object.freeze({
    title: 'All day event',
    location: 'Planet Earth',
    description: 'Except for the mars rover!',
    calendar: calendarName,
    allDay: true,
    reminders: []
  });

  var eventWithAlarms = Object.freeze({
    title: 'Event with alarms',
    location: 'Fire Station',
    description: 'Wee-Woo-Wee-Woo-Wee-Woo',
    calendar: calendarName,
    startHour: 10,
    reminders: ['5 minutes before', '1 hour before']
  });

  var vanillaElement, allDayElement, elementWithAlarms;

  function onServerUp(callback) {
    debug('Launch calendar.');
    app = new Calendar(client);
    app.launch();

    app.setupAccount({
      accountType: 'caldav',
      user: calendarName,
      fullUrl: 'http://127.0.0.1:' + server.port + '/' + calendarName
    });

    app.monthDay.events.forEach(function(event) {
      switch (event.title.trim()) {
        case vanillaEvent.title:
          vanillaElement = event;
          break;
        case allDayEvent.title:
          allDayElement = event;
          break;
        case eventWithAlarms.title:
          elementWithAlarms = event;
          break;
        default:
          break;
      }
    });

    callback();
  }

  suite('server', function() {
    setup(function(done) {
      // Start server if it's not already up.
      if (server) {
        return onServerUp(done);
      }

      server = new Radicale();
      server.start(function() {
        onServerUp(done);
      });
    });

    teardown(function() {
      debug('Delete account from calendar app.');
      app.teardownAccount(calendarName);
      // Now make sure that the account was actually deleted (see bug 1036753)
      var synced = getCalendars(app);
      assert.notInclude(synced, calendarName, 'calendar should be deleted');
    });


    /**
     * Major hack around suiteSetup not being fully supported
     * in marionette-js-runner.
     */
    test('suiteSetup', function() {
      debug('Create test data.');
      [
        vanillaEvent,
        allDayEvent,
        eventWithAlarms
      ].forEach(function(event) {
        app.createEvent(event);
      });

      debug('Sync created data.');
      app.sync();
    });


    test('should get calendar', function() {
      var synced = getCalendars(app);
      assert.include(synced, calendarName, calendarName + ' should be synced');
    });

    test('should get existing events', function() {
      var events = app.monthDay.events;
      [
        vanillaEvent,
        allDayEvent,
        eventWithAlarms
      ].forEach(function(created) {
        debug('Looking for event titled ' + created.title + '.');
        assert.ok(
          events.some(function(event) {
            app.monthDay.scrollToEvent(event);
            debug('Found ' + event.title.trim());
            return event.title.trim() === created.title;
          })
        );
      });
    });

    // TODO(gareth): Fix me!
    test.skip('event start times', function() {
      assert.strictEqual(
        vanillaElement.closestHour,
        vanillaEvent.startHour
      );
      assert.strictEqual(
        elementWithAlarms.closestHour,
        eventWithAlarms.startHour
      );
      // Make sure that we are inside an all day element.
      assert.ok(
        !!allDayElement.closestAllDay,
        'should recognize all day events'
      );
    });

    // TODO(gareth): Fix me!
    test.skip('event descriptions', function() {
      [
        { element: vanillaElement, event: vanillaEvent },
        { element: allDayElement, event: allDayEvent },
        { element: elementWithAlarms, event: eventWithAlarms }
      ].forEach(function(obj) {
        var element = obj.element,
            event = obj.event;
        app.monthDay.scrollToEvent(element);
        element.click();
        app.readEvent.waitForDisplay();
        assert.strictEqual(
          app.readEvent.description.trim(),
          event.description
        );

        app.readEvent.cancel();
        app.month.waitForDisplay();
      });
    });

    test('event locations', function() {
      assert.strictEqual(
        vanillaElement.address.trim(),
        vanillaEvent.location
      );
      assert.strictEqual(
        allDayElement.address.trim(),
        allDayEvent.location
      );
      assert.strictEqual(
        elementWithAlarms.address.trim(),
        eventWithAlarms.location
      );
    });

    test('event alarms', function() {
      assert.isFalse(vanillaElement.hasAlarms());
      assert.isFalse(allDayElement.hasAlarms());
      assert.isTrue(elementWithAlarms.hasAlarms());
    });

    test('suiteTeardown', function(done) {
      // TODO(gareth): Should be able to delete test data
      //     from within calendar app.
      debug('Delete test data.');
      /*
      var events = app.monthDay.events;
      events.forEach(function(event) {
        app.monthDay.scrollToEvent(event);
        event.click();
        app.readEvent.waitForDisplay();
        if (app.readEvent.editable) {
          app.readEvent.edit();
          app.editEvent.waitForDisplay();
          app.editEvent.delete();
        } else {
          app.readEvent.cancel();
        }

        app.monthDay.waitForDisplay();
      });

      debug('Sync deletions.');
      app.sync();
      */
      try {
        server.removeAllEvents();
      } catch (error) {
        console.error(error.toString());
      } finally {
        server.close(done);
      }
    });
  });
});

function getCalendars(app) {
  debug('Reading list of calendars from settings view.');
  app.openSettingsView();
  var synced = app.settings.calendars();
  app.closeSettingsView();
  return synced;
}
