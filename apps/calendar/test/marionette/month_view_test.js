'use strict';

var Calendar = require('./calendar'),
    assert = require('chai').assert;

marionette('month view', function() {
  var app;
  var client = marionette.client();

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });
  });

  test('#months-day-view scroll', function() {
    app.createEvent({
      title: 'Long Event',
      location: 'Dolor Amet',
      startHour: 0,
      duration: 16
    });

    app.openMonthView();
    var container = app.monthDay.container;
    assert.equal(
      container.getAttribute('scrollTop'),
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
      return container.getAttribute('scrollTop') > 0;
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
    // outside of the current month.
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

  test('should show one dot for one event', function() {
    app.createEvent({
      title: 'Launch the Hypermatter Reactor',
      location: 'Alderaan',
      startHour: 1
    });

    var month = app.month;
    var todaySquare = month.todaySquare;
    var text = todaySquare.text();
    assert.lengthOf(text.match(/•/g), 1);
  });

  test('should show two dots for two events', function() {
    for (var i = 0; i < 2; i++) {
      app.createEvent({
        title: 'Launch the Hypermatter Reactor',
        location: 'Alderaan',
        startHour: i + 1
      });
    }

    var month = app.month;
    var todaySquare = month.todaySquare;
    var text = todaySquare.text();
    assert.lengthOf(text.match(/•/g), 2);
  });

  test('should show three dots for three events', function() {
    for (var i = 0; i < 3; i++) {
      app.createEvent({
        title: 'Launch the Hypermatter Reactor',
        location: 'Alderaan',
        startHour: i + 1
      });
    }

    var month = app.month;
    var todaySquare = month.todaySquare;
    var text = todaySquare.text();
    assert.lengthOf(text.match(/•/g), 3);
  });

  test('should show three dots for four events', function() {
    for (var i = 0; i < 4; i++) {
      app.createEvent({
        title: 'Launch the Hypermatter Reactor',
        location: 'Alderaan',
        startHour: i + 1
      });
    }

    var month = app.month;
    var todaySquare = month.todaySquare;
    var text = todaySquare.text();
    assert.lengthOf(text.match(/•/g), 3);
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

    assert.include(text, '◦', 'should show dot');
    assert.include(text, '1:00 AM', 'should show start time');
    assert.include(text, 'Launch', 'should show title');
    assert.include(event.text(), 'Alderaan', 'should show location');
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
