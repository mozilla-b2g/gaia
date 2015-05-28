'use strict';

var Calendar = require('./lib/calendar'),
    assert = require('chai').assert;

marionette('creating events', function() {
  var app;
  var client = marionette.client({
    profile: {
      prefs: {
        // we need to disable the keyboard to avoid intermittent failures on
        // Travis (transitions might take longer to run and block UI)
        'dom.mozInputMethod.enabled': false,
        // Do not require the B2G-desktop app window to have focus (as per the
        // system window manager) in order for it to do focus-related things.
        'focusmanager.testmode': true,
      }
    }
  });

  var startDate = new Date('Sep 08 1991 12:34:56'),
      startDateNextHour = new Date(startDate),
      startDateNextDay = new Date(startDate),
      scenarios;

  startDateNextHour.setHours(startDate.getHours() + 1);
  startDateNextDay.setDate(startDate.getDate() + 1);

  scenarios = [
    {
      name: 'one day',
      allDay: false,
      startDate: startDate,
      endDate: startDateNextHour,
      reminders: ['5 minutes before'],
      verifyMonthView: function() {
        var event = app.monthDay.events[0];
        assert.equal(event.startTime, '12:34 PM', 'start time');
        assert.equal(event.endTime, '1:34 PM', 'end time');
      },
      verifyReadEventView: function() {
        var readEvent = app.readEvent;
        assert.equal(
          readEvent.durationTime,
          'Sunday, September 08, 1991\n' +
          'from 12:34 PM to 1:34 PM',
          'duration time'
        );
        assert.equal(
          readEvent.reminders[0].text(),
          '5 minutes before',
          'reminder'
        );
      }
    },
    {
      name: 'multiple day',
      allDay: false,
      startDate: startDate,
      endDate: startDateNextDay,
      reminders: ['5 minutes before'],
      verifyMonthView: function() {
        var month = app.month;
        assert.lengthOf(month.squareDots(month.daySquares[7]), 1);
        assert.lengthOf(month.squareDots(month.daySquares[8]), 1);
        assert.equal(month.busyDots.length, 2, '2 busy dots');

        var event = app.monthDay.events[0];
        assert.equal(event.startTime, '12:34 PM', 'start time');
        assert.equal(event.endTime, '12:34 PM', 'end time');
      },
      verifyReadEventView: function() {
        var readEvent = app.readEvent;
        assert.equal(
          readEvent.durationTime,
          'From 12:34 PM Sunday, September 08, 1991\n' +
          'to 12:34 PM Monday, September 09, 1991',
          'duration time'
        );
        assert.equal(
          readEvent.reminders[0].text(),
          '5 minutes before',
          'reminder'
        );
      }
    },
    {
      name: 'one all day',
      allDay: true,
      startDate: startDate,
      endDate: startDateNextHour,
      reminders: ['On day of event'],
      verifyMonthView: function() {
        var event = app.monthDay.events[0];
        assert.equal(event.allDay, 'All Day', 'event hour');
      },
      verifyReadEventView: function() {
        var readEvent = app.readEvent;
        assert.equal(
          readEvent.durationTime,
          'All day\n' +
          'Sunday, September 08, 1991',
          'duration time'
        );
        assert.equal(
          readEvent.reminders[0].text(),
          'On day of event',
          'reminder'
        );
      }
    },
    {
      name: 'multiple all day',
      allDay: true,
      startDate: startDate,
      endDate: startDateNextDay,
      reminders: ['On day of event'],
      verifyMonthView: function() {
        var month = app.month;
        assert.lengthOf(month.squareDots(month.daySquares[7]), 1);
        assert.lengthOf(month.squareDots(month.daySquares[8]), 1);
        assert.equal(month.busyDots.length, 2, '2 busy dots');
        assert.equal(
          app.monthDay.events[0].allDay,
          'All Day',
          'event hour'
        );
      },
      verifyReadEventView: function() {
        var readEvent = app.readEvent;
        assert.equal(
          readEvent.durationTime,
          'All day from Sunday, September 08, 1991\n' +
          'to Monday, September 09, 1991',
          'duration time'
        );
        assert.equal(
          readEvent.reminders[0].text(),
          'On day of event',
          'reminder'
        );
      }
    },
    {
      name: '24 hour format',
      allDay: false,
      startDate: startDate,
      endDate: startDateNextHour,
      reminders: ['5 minutes before'],
      verifyMonthView: function() {
        app.switch24HourTimeFormat();
        var event = app.monthDay.events[0];
        assert.equal(event.startTime, '12:34', 'start time');
        assert.equal(event.endTime, '13:34', 'end time');
      },
      verifyReadEventView: function() {
        app.switch24HourTimeFormat();
        var readEvent = app.readEvent;
        assert.equal(
          readEvent.durationTime,
          'Sunday, September 08, 1991\n' +
          'from 12:34 to 13:34',
          'duration time'
        );
        assert.equal(
          readEvent.reminders[0].text(),
          '5 minutes before',
          'reminder'
        );
      }
    }
  ];

  setup(function() {
    app = new Calendar(client);
    app.launch();
  });

  scenarios.forEach(function(scenario) {
    suite('creating ' + scenario.name + ' event', function() {
      setup(function() {
        // we use default title/description/location to avoid duplication but
        // allow overriding if needed
        scenario.title = scenario.title ||
          'Puppy Bowl dogefortlongtextfotestloremipsumdolorsitamet';
        scenario.description = scenario.description ||
          'lorem ipsum dolor sit amet maecennas ullamcor';
        scenario.location = scenario.location ||
          'Animal Planet reallylongwordthatshouldnotoverflowbecausewewrap';

        app.createEvent(scenario);

        app.month.waitForDisplay();
      });

      test('should display the created event in months day', function() {
        var event = app.monthDay.events[0];
        assert.equal(event.title, scenario.title, 'event title');
        assert.equal(event.address, scenario.location, 'event location');
        scenario.verifyMonthView();
      });

      suite('opening event in read view', function() {
        setup(function() {
          var event = app.monthDay.events[0];
          // Scroll so that the first one is in view and click it.
          app.monthDay.scrollToEvent(event);
          event.click();
          // Wait until the read view is displayed.
          app.readEvent.waitForDisplay();
        });

        test('should display the created event in read view', function() {
          var readEvent = app.readEvent;
          assert.equal(readEvent.title, scenario.title, 'event title');
          assert.equal(
            readEvent.description,
            scenario.description,
            'event description'
          );
          assert.equal(readEvent.location, scenario.location, 'location');
          assert.equal(readEvent.calendar, 'Offline calendar');
          assert.equal(readEvent.calendarColor, 'rgb(249, 124, 23)');
          scenario.verifyReadEventView();
        });

        test('should not overflow title, location, or description',
          function() {
          var readEvent = app.readEvent;
          app.checkOverflow(readEvent.titleContainer, 'title');
          app.checkOverflow(readEvent.descriptionContainer, 'description');
          app.checkOverflow(readEvent.locationContainer, 'location');
        });
      });
    });
  });

  test('only enable save button if title or location are set', function() {
    app.openModifyEventView();
    var editEvent = app.editEvent;
    client.waitFor(function() {
      return editEvent.saveButton.getAttribute('disabled') === 'true';
    });
    editEvent.title = 'foo';
    client.waitFor(function() {
      return editEvent.saveButton.getAttribute('disabled') === 'false';
    });
    editEvent.title = '';
    client.waitFor(function() {
      return editEvent.saveButton.getAttribute('disabled') === 'true';
    });
    editEvent.location = 'bar';
    client.waitFor(function() {
      return editEvent.saveButton.getAttribute('disabled') === 'false';
    });
  });
});
