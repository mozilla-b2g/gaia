suiteGroup('Templates.Day', function() {
  var subject;
  var dynamicClass = 'happy-class';

  suiteSetup(function() {
    subject = Calendar.Templates.Day;
  });

  function renderHTML(type, options) {
    return subject[type].render(options);
  }

  test('#hour', function() {
    var result = renderHTML('hour', {
      hour: 'fooz'
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
