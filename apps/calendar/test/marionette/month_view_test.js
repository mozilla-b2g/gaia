'use strict';

var Calendar = require('./calendar'),
    assert = require('chai').assert;

marionette('month view', function() {
  var app;
  var client = marionette.client();

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });
    client.waitFor(app.isMonthViewActive.bind(app));
  });

  test('week day headers should only have one letter', function() {
    // TODO(gaye): waitForElement does not find weekdayHeaders. Why?
    // assert.equal(app.waitForElement('weekdayHeaders').text().length, 7);
    assert.equal(app
      .findElement('weekdayHeaders')
      .getAttribute('textContent')
      .length, 7);
  });

  test('day number text should be centered', function() {
    assert.equal(app
      .findElement('daySquare')
      .scriptWith(function(element) {
        return window.getComputedStyle(element).textAlign;
      }), 'center');
  });

  test('should gray out numbers outside current month', function() {
    // Either the first or last day chronologically should be
    // outside of the current month.
    assert.ok(app
      .findElements('daySquare')
      .some(function(square) {
        var gray = square.scriptWith(function(element) {
          return window.getComputedStyle(element).color;
        }) === 'rgb(189, 189, 189)' /* gray */;

        var otherMonth = square
          .getAttribute('className')
          .indexOf('other-month') !== -1;
        return gray && otherMonth;
      }));
  });

  test('should not change background outside current month', function() {
    // Either the first or last day chronologically should be
    // outside of the current month.
    assert.notOk(app
      .findElements('daySquare')
      .some(function(square) {
        return square.scriptWith(function(element) {
          return window.getComputedStyle(element).backgroundColor;
        }) !== 'rgb(255, 255, 255)';
      }));
  });

  test('should show one dot for one event', function() {
    var startDate = new Date(),
        endDate = new Date();
    startDate.setHours(1);
    endDate.setHours(2);
    app.createEvent({
      title: 'Test the Hypermatter Reactor',
      location: 'Alderaan',
      startDate: startDate,
      endDate: endDate
    });

    assert.equal(app
      .waitForElement('daySquareToday')
      .text()
      .match(/•/g)
      .length, 1);
  });

  test('should show two dots for two events', function() {
    var startDate = new Date(),
        endDate = new Date();

    for (var i = 0; i < 2; i++) {
      startDate.setHours(i);
      endDate.setHours(i + 1);
      app.createEvent({
        title: 'Test the Hypermatter Reactor',
        location: 'Alderaan',
        startDate: startDate,
        endDate: endDate
      });
    }

    assert.equal(app
      .waitForElement('daySquareToday')
      .text()
      .match(/•/g)
      .length, 2);
  });

  test('should show three dots for three events', function() {
    var startDate = new Date(),
        endDate = new Date();

    for (var i = 0; i < 3; i++) {
      startDate.setHours(i);
      endDate.setHours(i + 1);
      app.createEvent({
        title: 'Test the Hypermatter Reactor',
        location: 'Alderaan',
        startDate: startDate,
        endDate: endDate
      });
    }

    assert.equal(app
      .waitForElement('daySquareToday')
      .text()
      .match(/•/g)
      .length, 3);
  });

  test('should show three dots for four events', function() {
    var startDate = new Date(),
        endDate = new Date();

    for (var i = 0; i < 4; i++) {
      startDate.setHours(i);
      endDate.setHours(i + 1);
      app.createEvent({
        title: 'Test the Hypermatter Reactor',
        location: 'Alderaan',
        startDate: startDate,
        endDate: endDate
      });
    }

    assert.equal(app
      .waitForElement('daySquareToday')
      .text()
      .match(/•/g)
      .length, 3);
  });

  test.skip('should show calendar icon with correct day number', function() {
    // TODO(gaye): Implement this once we get the icon.
  });

  test('should have today date in day events section', function() {
    var today = new Date();
    var expected =
      dayName(today.getDay()).toUpperCase() + ', ' +
      monthName(today.getMonth()).toUpperCase().substring(0, 3) + ' ' +
      today.getDate();
    var actual = app
      .waitForElement('monthViewDayDate')
      .text();
    assert.equal(actual, expected);
  });

  suite('today event', function() {
    var startDate, endDate;

    setup(function() {
      startDate = new Date();
      endDate = new Date();
      startDate.setHours(1);
      startDate.setMinutes(0);
      endDate.setHours(2);
      endDate.setMinutes(0);
      app.createEvent({
        title: 'Test the Hypermatter Reactor',
        location: 'Alderaan',
        startDate: startDate,
        endDate: endDate
      });

      app.waitForMonthView();
    });

    test('should display dot', function() {
      assert.equal(app
        .waitForElement('monthViewDayEventDot')
        .text(), '◦');
    });

    test('should display time', function() {
      assert.equal(app
        .waitForElement('monthViewDayEventTime')
        .text(), '1:00 AM');
    });

    test('should display title', function() {
      assert.ok(app
        .waitForElement('monthViewDayEventName')
        .text()
        .indexOf('Test the') !== -1);
    });

    test('should show location', function() {
      assert.equal(app
        .waitForElement('monthViewDayEventLocation')
        .text(), 'Alderaan');
    });
  });

  test('today tab should have a right border', function() {
    assert.equal(app
      .waitForElement('todayTabItem')
      .scriptWith(function(element) {
        var style = window.getComputedStyle(element);
        return [
          style.borderRightWidth,
          style.borderRightStyle,
          style.borderRightColor
        ].join(' ');
      }), '1px solid rgb(248, 248, 248)');
  });
});

function dayName(num) {
  switch (num) {
    case 0:
      return 'Sunday';
    case 1:
      return 'Monday';
    case 2:
      return 'Tuesday';
    case 3:
      return 'Wednesday';
    case 4:
      return 'Thursday';
    case 5:
      return 'Friday';
    case 6:
      return 'Saturday';
  }
}

function monthName(num) {
  switch (num) {
    case 0:
      return 'January';
    case 1:
      return 'February';
    case 2:
      return 'March';
    case 3:
      return 'April';
    case 4:
      return 'May';
    case 5:
      return 'June';
    case 6:
      return 'July';
    case 7:
      return 'August';
    case 8:
      return 'September';
    case 9:
      return 'October';
    case 10:
      return 'November';
    case 11:
      return 'December';
  }
}
