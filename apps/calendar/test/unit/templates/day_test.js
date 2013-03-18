suiteGroup('Templates.Day', function() {
  var subject;
  var dynamicClass = 'happy-class';

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

    assert.ok(result.indexOf(dynamicClass) === -1);
    assert.include(result, 'titlez');
    assert.include(result, 'sos');
    assert.include(result, a());
  });

  test('event with classes', function() {
    var result = renderHTML('event', {
      classes: dynamicClass
    });

    assert.ok(result);
    assert.include(result, dynamicClass);
  });
});
