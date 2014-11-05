define(function(require) {
'use strict';

var Month = require('templates/month');

suite('Templates.Month', function() {
  var subject;

  suiteSetup(function() {
    subject = Month;
  });

  function a() {
    return '<a></a>';
  }

  function renderHTML(type, options) {
    return subject[type].render(options);
  }

  test('#busy', function() {
    var result = renderHTML('busy', {
      start: 5,
      length: 1,
      calendarId: 'cal1',
      _id: 'event1'
    });

    assert.ok(result);

    assert.include(result, 'busy-5');
    assert.include(result, 'busy-length-1');
    assert.include(result, 'calendar-id-cal1');
    assert.include(result, 'busytime-event1');
  });

  test('#weekDaysHeader', function() {
    var result = renderHTML('weekDaysHeader', a());
    assert.ok(result);
    assert.include(result, 'role="presentation"');
    assert.include(result, '<a></a>');
  });

  test('#weekDaysHeaderDay', function() {
    var result = renderHTML('weekDaysHeaderDay', {
      day: 0,
      dayName: 'Monday'
    });

    assert.ok(result);
    assert.include(result, 'role="columnheader"');
    assert.include(result, 'Monday');
  });

  test('#week', function() {
    var result = renderHTML(
      'week', a()
    );

    assert.ok(result);
    assert.include(result, '<a></a>');
  });

  test('#day', function() {
    var data = [];

    function add(item) {
      data.push(item);
      return item;
    }

    var result = renderHTML(
      'day', {
        id: add('idme'),
        dateString: add('dateStr'),
        state: add('active'),
        date: add('date1'),
        ariaDescribedby: add('aria-describedby'),
        idBusyIndicator: add('idme-busy-indicator'),
        idDescription: add('idme-description'),
        busy: a()
      }
    );

    assert.ok(result);

    assert.include(result, 'role="gridcell"');
    assert.include(result, 'role="button"');
    assert.include(result, 'tabindex="0"');
    data.forEach(function(item) {
      assert.include(result, item);
    });

  });
});

});
