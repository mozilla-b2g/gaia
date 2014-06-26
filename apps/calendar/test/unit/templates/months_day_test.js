requireLib('template.js');
requireLib('templates/months_day.js');

suiteGroup('Templates.MonthsDay', function() {
  'use strict';

  var subject;

  suiteSetup(function() {
    subject = Calendar.Templates.MonthsDay;
  });

  function renderHTML(type, options) {
    return subject[type].render(options);
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
        startTime: '12:34 PM',
        endTime: '4:56 PM',
        isAllDay: false
      });

      assert.include(result, 'foo-class');
      assert.include(result, 'data-id="55"');
      assert.include(result, 'calendar-id-42');
      assert.include(result, 'Lorem Ipsum');
      assert.include(result, 'Dolor Sit Amet');
      assert.include(result, '12:34 PM');
      assert.include(result, '4:56 PM');
    });

    test('> all day event', function() {
      var result = renderHTML('event', {
        classes: 'foo-class',
        busytimeId: 55,
        calendarId: 42,
        title: 'Lorem Ipsum',
        location: 'Dolor Sit Amet',
        attendees: null,
        startTime: '12:34 PM',
        endTime: '4:56 PM',
        isAllDay: true
      });

      assert.include(result, 'foo-class');
      assert.include(result, 'data-id="55"');
      assert.include(result, 'calendar-id-42');
      assert.include(result, 'Lorem Ipsum');
      assert.include(result, 'Dolor Sit Amet');
      assert.include(result, 'data-l10n-id="hour-allday"');
      assert.ok(result.indexOf('12:34 PM') === -1, 'include start time');
      assert.ok(result.indexOf('4:56 PM') === -1, 'include end time');
    });
  });

});
