define(function(require) {
'use strict';

var intl = require('intl');

var MonthDayAgenda = require('templates/month_day_agenda');

suite('templates/month_day_agenda', function() {
  function renderHTML(type, options) {
    return MonthDayAgenda[type].render(options);
  }

  suiteSetup(function() {
    intl.init();
  });

  suite('#event', function() {
    test('> regular event', function() {
      var result = renderHTML('event', {
        hasAlarms: true,
        busytimeId: 55,
        calendarId: 42,
        title: 'Lorem Ipsum',
        location: 'Dolor Sit Amet',
        attendees: null,
        startTime: new Date('October 13, 2014 12:34:00'),
        endTime: new Date('October 13, 2014 16:56:00'),
        isAllDay: false,
        color: '#0000ff'
      });

      assert.include(result, 'has-alarms');
      assert.include(result, 'href="/event/show/55/"');
      assert.include(result,
        '<h5 role="presentation" dir="auto">Lorem Ipsum</h5>');
      assert.include(result, 'Dolor Sit Amet');
      assert.include(result, '12:34');
      assert.include(result, '16:56');
      assert.include(result, 'role="option"');
      assert.include(result, '<div class="gaia-icon icon-calendar-dot" ' +
        'style="color:#0000ff"');
      assert.match(result,
        /icon-calendar-dot" style="color:#0000ff"\s+aria-hidden="true">/);
      assert.match(result, /id="55-icon-calendar-alarm"\s+aria-hidden="true"/);
      assert.include(result, 'aria-describedby="55-icon-calendar-alarm"');
    });

    test('> all day event', function() {
      var result = renderHTML('event', {
        hasAlarms: false,
        busytimeId: 55,
        calendarId: 42,
        title: 'Lorem Ipsum',
        location: 'Dolor Sit Amet',
        attendees: null,
        startTime: new Date('October 13, 2014 12:34:00'),
        endTime: new Date('October 13, 2014 16:56:00'),
        isAllDay: true,
        color: '#ff0033'
      });

      assert.equal(result.indexOf('has-alarms'), -1, 'no alarm');
      assert.include(result, 'href="/event/show/55/"');
      assert.include(result,
        '<h5 role="presentation" dir="auto">Lorem Ipsum</h5>');
      assert.include(result, 'Dolor Sit Amet');
      assert.include(result, 'data-l10n-id="hour-allday"');
      assert.include(result, 'role="option"');
      assert.include(result, '<div class="gaia-icon icon-calendar-dot" ' +
        'style="color:#ff0033"');
      assert.match(result,
        /icon-calendar-dot" style="color:#ff0033"\s+aria-hidden="true">/);
      assert.include(result, 'id="55-icon-calendar-alarm" aria-hidden="true"');
      assert.include(result, 'aria-describedby="55-icon-calendar-alarm"');
      assert.ok(result.indexOf('12:34') === -1, 'include start time');
      assert.ok(result.indexOf('16:56') === -1, 'include end time');
    });
  });
});

});
