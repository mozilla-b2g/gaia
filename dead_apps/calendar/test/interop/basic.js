/* global __dirname, require, marionette, setup, suite, teardown, test */
'use strict';

var Calendar = require('../marionette/lib/calendar'),
    assert = require('chai').assert,
    debug = require('common/debug')('interop:basic'),
    fs = require('fs'),
    path = require('path');

// See https://bugzil.la/1011192 about Yahoo!
var providers = [
  'oracle'
];

marionette('interop basic', function() {
  var app;
  var client = marionette.client();

  providers.forEach(function(provider) {
    var config = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, provider, 'config.json')
      )
    );

    var vanillaEvent = Object.freeze({
      title: 'Vanilla event',
      location: 'Baskin Robbins',
      description: 'What better a place for a vanilla event!',
      calendar: config.calendars[0],
      startHour: 17,
      reminders: []
    });

    var allDayEvent = Object.freeze({
      title: 'All day event',
      location: 'Planet Earth',
      description: 'Except for the mars rover!',
      calendar: config.calendars[0],
      allDay: true,
      reminders: []
    });

    var eventWithAlarms = Object.freeze({
      title: 'Event with alarms',
      location: 'Fire Station',
      description: 'Wee-Woo-Wee-Woo-Wee-Woo',
      calendar: config.calendars[0],
      startHour: 10,
      reminders: ['5 minutes before', '1 hour before']
    });

    var vanillaElement, allDayElement, elementWithAlarms;

    suite(provider, function() {
      setup(function() {
        debug('Launch calendar.');
        app = new Calendar(client);
        app.launch();

        app.setupAccount(setupOptions(provider, config));

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
      });

      teardown(function() {
        debug('Delete account from calendar app.');
        app.teardownAccount(config.user);
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

        debug('Sync created data to ' + provider + '.');
        app.sync();
      });


      test('should get all calendars', function() {
        debug('Reading list of calendars from settings view.');
        app.openSettingsView();
        var synced = app.settings.calendars();
        app.closeSettingsView();
        config.calendars.forEach(function(calendar) {
          debug('Looking for ' + calendar + '.');
          assert.include(synced, calendar, calendar + ' synced');
        });
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
              return event.title.trim() === created.title;
            })
          );
        });
      });

      test('event start times', function() {
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

      test('event descriptions', function() {
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

      test('suiteTeardown', function() {
        debug('Delete test data.');
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

        debug('Sync deletions to ' + provider + '.');
        app.sync();
      });
    });
  });
});

function setupOptions(provider, config) {
  debug('Authorize ' + provider + ' account.');
  var options = {
    user: config.user,
    password: config.password,
    accountType: provider
  };
  if (provider !== 'google' && provider !== 'yahoo') {
    options.accountType = 'caldav';
  }
  if ('fullUrl' in config) {
    options.fullUrl = config.fullUrl;
  }

  return options;
}
