'use strict';

var Calendar = require('./lib/calendar'),
    assert = require('chai').assert;

marionette('creating events', function() {
  var app;
  var client = marionette.client();

  var title = 'Puppy Bowl dogefortlongtextfotestloremipsumdolorsitamet',
      description = 'lorem ipsum dolor sit amet maecennas ullamcor',
      location = 'Animal Planet ' +
                 'reallylongwordthatshouldnotoverflowbecausewewrap',
      startDate = new Date('Sep 08 1991 12:34:56'),
      startDateNextHour = new Date(startDate),
      startDateNextDay = new Date(startDate),
      scenarios;

  startDateNextHour.setHours(startDate.getHours() + 1);
  startDateNextDay.setDate(startDate.getDate() + 1);

  scenarios = [
    {
      name: 'one day',
      params: {
        allDay: false,
        startDate: startDate,
        endDate: startDateNextHour,
        reminders: ['5 minutes before']
      },
      /**
       * @param {MonthDayEvent} event The
       * event item listed on the month day view.
       */
      verifyMonthDayView: function(event) {
        assert.equal(event.startTime, '12:34 PM');
        assert.equal(event.endTime, '1:34 PM');
      },
      /**
       * @param {ReadEvent} readEvent The
       * read event view.
       */
      verifyReadEventView: function(readEvent) {
        assert.equal(
          readEvent.durationTime,
          'Sunday, September 08, 1991\n' +
          'from 12:34 PM to 1:34 PM'
        );
        assert.equal(
          readEvent.reminders[0].text(),
          '5 minutes before'
        );
      }
    },
    {
      name: 'multiple day',
      params: {
        allDay: false,
        startDate: startDate,
        endDate: startDateNextDay,
        reminders: ['5 minutes before']
      },
      verifyMonthDayView: function(event) {
        assert.equal(event.startTime, '12:34 PM');
        assert.equal(event.endTime, '12:34 PM');
      },
      verifyReadEventView: function(readEvent) {
        assert.equal(
          readEvent.durationTime,
          'From 12:34 PM Sunday, September 08, 1991\n' +
          'to 12:34 PM Monday, September 09, 1991'
        );
        assert.equal(
          readEvent.reminders[0].text(),
          '5 minutes before'
        );
      }
    },
    {
      name: 'one all day',
      params: {
        allDay: true,
        startDate: startDate,
        endDate: startDateNextHour,
        reminders: ['On day of event']
      },
      verifyMonthDayView: function(event) {
        assert.equal(event.allDay, 'All Day');
      },
      verifyReadEventView: function(readEvent) {
        assert.equal(
          readEvent.durationTime,
          'All day\n' +
          'Sunday, September 08, 1991'
        );
        assert.equal(
          readEvent.reminders[0].text(),
          'On day of event'
        );
      }
    },
    {
      name: 'multiple all day',
      params: {
        allDay: true,
        startDate: startDate,
        endDate: startDateNextDay,
        reminders: ['On day of event']
      },
      verifyMonthDayView: function(event) {
        assert.equal(event.allDay, 'All Day');
      },
      verifyReadEventView: function(readEvent) {
        assert.equal(
          readEvent.durationTime,
          'All day from Sunday, September 08, 1991\n' +
          'to Monday, September 09, 1991'
        );
        assert.equal(
          readEvent.reminders[0].text(),
          'On day of event'
        );
      }
    }
  ];

  scenarios.forEach(function(scenario) {
    suite('creating ' + scenario.name + ' event', function() {
      setup(function() {
        var params = scenario.params;
        params.title = title;
        params.description = description;
        params.location = location;

        app = new Calendar(client);
        app.launch({ hideSwipeHint: true });
        app.createEvent(params);

        app.month.waitForDisplay();
      });

      test('should display the created event in months day', function() {
        var event = app.monthDay.events[0];
        assert.equal(event.title, title);
        assert.equal(event.address, location);
        scenario.verifyMonthDayView(event);
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
          assert.equal(readEvent.title, title);
          assert.equal(readEvent.description, description);
          assert.equal(readEvent.location, location);
          assert.equal(readEvent.calendar, 'Offline calendar');
          assert.equal(readEvent.calendarColor, 'rgb(249, 124, 23)');
          scenario.verifyReadEventView(readEvent);
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
});
