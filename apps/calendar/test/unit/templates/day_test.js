requireLib('template.js');
requireLib('templates/date_span.js');
requireLib('templates/day.js');

suite('Templates.Day', function() {
  'use strict';

  var subject;
  var dynamicClass = 'happy-class';

  setup(function() {
    subject = Calendar.Templates.Day;
  });

  function a() {
    return '<a class="i am so unique"></a>';
  }

  function renderHTML(type, options) {
    return subject[type].render(options);
  }

  test('> hour', function() {
    var date = new Date();
    date.setHours(1, 0, 0, 0);

    var result = renderHTML('hour', {
      hour: 1,
      items: a()
    });

    assert.ok(result);
    assert.include(result, a());
    assert.include(result, 'data-l10n-date-format="hour-format24"');
    assert.include(result, 'data-date="' + date + '"');
    assert.include(result, 'data-hour="1"');
  });

  test('> all day', function() {
    var result = renderHTML('hour', {
      hour: Calendar.Calc.ALLDAY,
      items: a()
    });

    assert.ok(result);
    assert.include(result, a());
    assert.include(result, 'data-l10n-id="hour-allday"');
    assert.include(result, 'data-hour="allday"');
  });

  test('#attendee', function() {
    var result = renderHTML('attendee', {
      value: 'fooz'
    });

    assert.ok(result);
    assert.include(result, 'fooz');
  });

  test('event', function() {
    var result = renderHTML('event', {
      title: 'titlez',
      location: 'sos'
    });

    assert.ok(result);

    assert.ok(result.indexOf(dynamicClass) === -1);
    assert.include(result, 'titlez');
    assert.include(result, 'sos');
  });

  test('event with classes', function() {
    var result = renderHTML('event', {
      classes: dynamicClass
    });

    assert.ok(result);
    assert.include(result, dynamicClass);
  });
});
