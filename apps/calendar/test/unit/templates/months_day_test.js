define(function(require) {
'use strict';

var MonthsDay = require('templates/months_day');

suite('templates/months_day', function() {
  function renderHTML(type, options) {
    return MonthsDay[type].render(options);
  }

  suite('#event', function() {
    test('> regular event', function() {
      var result = renderHTML('event', {
        classes: 'foo-class',
        busytimeId: 55,
        calendarId: 42,
        title: 'Lorem Ipsum',
        location: 'Dolor Sit Amet',
        attendees: null,
        startTime: new Date('October 13, 2014 12:34:00'),
        endTime: new Date('October 13, 2014 16:56:00'),
        isAllDay: false
      });

      assert.include(result, 'foo-class');
      assert.include(result, 'data-id="55"');
      assert.include(result, 'calendar-id-42');
      assert.include(result, '<h5 role="presentation">Lorem Ipsum</h5>');
      assert.include(result, 'Dolor Sit Amet');
      assert.include(result, '12:34');
      assert.include(result, '16:56');
      assert.include(result, 'role="option"');
      assert.include(result, '<div class="gaia-icon icon-calendar-dot ' +
        'calendar-text-color"');
      assert.match(result, /calendar-text-color"\s+aria-hidden="true">/);
      assert.include(result, 'id="55-icon-calendar-alarm" aria-hidden="true"');
      assert.include(result, 'aria-describedby="55-icon-calendar-alarm"');
    });

    test('> all day event', function() {
      var result = renderHTML('event', {
        classes: 'foo-class',
        busytimeId: 55,
        calendarId: 42,
        title: 'Lorem Ipsum',
        location: 'Dolor Sit Amet',
        attendees: null,
        startTime: new Date('October 13, 2014 12:34:00'),
        endTime: new Date('October 13, 2014 16:56:00'),
        isAllDay: true
      });

      assert.include(result, 'foo-class');
      assert.include(result, 'data-id="55"');
      assert.include(result, 'calendar-id-42');
      assert.include(result, '<h5 role="presentation">Lorem Ipsum</h5>');
      assert.include(result, 'Dolor Sit Amet');
      assert.include(result, 'data-l10n-id="hour-allday"');
      assert.include(result, 'role="option"');
      assert.include(result, '<div class="gaia-icon icon-calendar-dot ' +
        'calendar-text-color"');
      assert.match(result, /calendar-text-color"\s+aria-hidden="true">/);
      assert.include(result, 'id="55-icon-calendar-alarm" aria-hidden="true"');
      assert.include(result, 'aria-describedby="55-icon-calendar-alarm"');
      assert.ok(result.indexOf('12:34') === -1, 'include start time');
      assert.ok(result.indexOf('16:56') === -1, 'include end time');
    });
  });
});

});
