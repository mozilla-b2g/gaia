'use strict';

var Calendar = require('./lib/calendar'),
    assert = require('chai').assert;

marionette('month view', function() {
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

  setup(function() {
    app = new Calendar(client);
    app.launch();
  });

  test('#month-day-agenda scroll', function() {
    // Create a lot of events so we can scroll so fun!
    for (var i = 0; i < 5; i++) {
      app.createEvent({
        title: 'Launch the Hypermatter Reactor',
        location: 'Alderaan',
        startHour: i
      });
    }

    app.openMonthView();
    var monthDay = app.monthDay.getElement();
    var container = app.monthDay.container;
    assert.equal(
      monthDay.getAttribute('scrollTop'),
      0,
      'scroll should start at zero'
    );

    var pos = container.location();
    var x = pos.x + 30;
    var body = client.findElement('body');
    // fast vertical swipe, needs to happen on the body since we want
    // coordinates to be absolute
    app.actions
      .flick(body, x, pos.y + 10, x, 50)
      .perform();

    // this will timeout if scroll did not change
    client.waitFor(function() {
      return monthDay.getAttribute('scrollTop') > 0;
    });
  });

  test('week day headers should only have one letter', function() {
    var month = app.month;
    var weekdayHeaders = month.weekdayHeaders;
    assert.deepEqual(weekdayHeaders, ['S', 'M', 'T', 'W', 'T', 'F', 'S']);
  });

  test('day number text should be centered', function() {
    var month = app.month;
    var daySquares = month.daySquares;
    var textAlign = daySquares[0].scriptWith(function(element) {
      return window.getComputedStyle(element).textAlign;
    });

    assert.equal(textAlign, 'center');
  });

  test('should gray out numbers outside current month', function() {
    function isOutsideMonthWithGrayText(square) {
      var gray = square.scriptWith(function(element) {
        return window.getComputedStyle(element).color;
      }) === 'rgb(189, 189, 189)';

      var otherMonth = square
        .getAttribute('className')
        .indexOf('other-month') !== -1;
      return gray && otherMonth;
    }

    // Either the first or last day chronologically must be
    // outside of the current month (except for in February!).

    // Swipe to next month if it's February.
    var monthDay = app.monthDay;
    var date = monthDay.date;
    date = date.toLowerCase();
    if (date.indexOf('feb') !== -1) {
      // Swipe to another month.
      app.swipeLeft();
    }

    var month = app.month;
    var daySquares = month.daySquares;
    assert.isTrue(daySquares.some(isOutsideMonthWithGrayText));
  });

  test('should not change background outside current month', function() {
    function isOutsideMonthWithNonWhiteBackground(square) {
      var nonwhite = square.scriptWith(function(element) {
        return window.getComputedStyle(element).backgroundColor;
      }) !== 'rgb(255, 255, 255)';

      var otherMonth = square
        .getAttribute('className')
        .indexOf('other-month') !== -1;
      return nonwhite && otherMonth;
    }

    var month = app.month;
    var daySquares = month.daySquares;
    assert.isFalse(daySquares.some(isOutsideMonthWithNonWhiteBackground));
  });

  test('should show event dots', function() {
    function createEvent(startHour) {
      app.createEvent({
        title: 'Launch the Hypermatter Reactor',
        location: 'Alderaan',
        startHour: startHour
      });
    }

    var month = app.month;
    var todaySquare = month.todaySquare;

    // 1 dot.
    createEvent(1 /* startHour */);
    assert.lengthOf(month.squareDots(todaySquare), 1);

    // 2 dots.
    createEvent(2 /* startHour */);
    assert.lengthOf(month.squareDots(todaySquare), 2);

    // 3 dots.
    createEvent(3 /* startHour */);
    assert.lengthOf(month.squareDots(todaySquare), 3);

    // More dots?
    createEvent(4 /* startHour */);
    assert.lengthOf(month.squareDots(todaySquare), 3);
  });

  test('should have today date in day events section', function() {
    var today = new Date();
    var expected =
      dayName(today.getDay()).toUpperCase() + ', ' +
      monthName(today.getMonth()).toUpperCase().substring(0, 3) + ' ' +
      today.getDate();
    var monthDay = app.monthDay;
    var actual = monthDay.date;
    assert.equal(actual, expected);
  });

  test('today event', function() {
    app.createEvent({
      title: 'Launch the Hypermatter Reactor',
      location: 'Alderaan',
      startHour: 1
    });

    app.openMonthView();

    var monthDay = app.monthDay;
    var events = monthDay.events;
    var event = events[0];
    var text = event.text();

    assert.include(text, '1:00 AM', 'should show start time');
    assert.include(text, 'Launch', 'should show title');
    assert.include(event.text(), 'Alderaan', 'should show location');
  });

  test('double tap', function() {
    var month = app.month;
    month.actions.doubleTap(month.currentDay).perform();

    var editEvent = app.editEvent;
    editEvent.waitForDisplay();
    var now = new Date();
    var start = new Date(now.getTime());
    start.setHours(now.getHours() + 1, 0, 0, 0);
    var end = new Date(start.getTime());
    end.setHours(start.getHours() + 1, 0, 0, 0);
    assert.equal(editEvent.startDate, toIso(start), 'startDate');
    assert.equal(editEvent.endDate, toIso(end), 'endDate');
    assert.equal(editEvent.startTime, toTime(start), 'startTime');
    assert.equal(editEvent.endTime, toTime(end), 'endTime');
  });
});

function toIso(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' +
    pad(date.getDate());
}

function pad(num) {
  return num > 9 ? num : '0' + num;
}

function toTime(date) {
  return pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' +
    pad(date.getSeconds());
}

function dayName(num) {
  return [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ][num];
}

function monthName(num) {
  return [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ][num];
}
