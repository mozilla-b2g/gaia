requireApp('calendar/test/unit/helper.js', function() {
  requireLib('template.js');
  requireLib('templates/day.js');
});

suite('templates/day', function() {
  var subject;

  suiteSetup(function() {
    subject = Calendar.Templates.Day;
  });

  function a() {
    return '<a class="i am so unique"></a>';
  }

  function renderHTML(type, options) {
    return subject[type].render(options);
  }

  test('#hour', function() {
    var result = renderHTML('hour', {
      hour: 'fooz',
      items: a()
    });

    assert.ok(result);
    assert.include(result, 'fooz');
    assert.include(result, a());
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
      location: 'sos',
      attendees: a()
    });

    assert.ok(result);

    assert.include(result, 'titlez');
    assert.include(result, 'sos');
    assert.include(result, a());
  });

});

