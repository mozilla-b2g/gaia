requireApp('calendar/test/unit/helper.js', function() {
  requireLib('template.js');
  requireLib('templates/calendar.js');
});

suite('templates/calendar', function() {
  var subject;

  suiteSetup(function() {
    subject = Calendar.Templates.Calendar;
  });

  function renderHTML(type, options) {
    return subject[type].render(options);
  }

  test('#item', function() {
    var model = {
      localDisplayed: true,
      _id: 1,
      name: 'cal name'
    };

    var output = renderHTML('item', model);
    assert.ok(output);

    assert.include(output, 'checked');
    assert.include(output, model.name);
    assert.include(output, 'calendar-1');

    model.localDisplayed = false;
    output = renderHTML('item', model);

    var selected = output.indexOf('checked') !== -1;
    assert.isFalse(selected);
    assert.include(output, model.name);
  });
});
