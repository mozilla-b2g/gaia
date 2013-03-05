requireLib('provider/abstract.js');
requireLib('provider/local.js');

suiteGroup('Templates.Calendar', function() {
  var subject;

  suiteSetup(function() {
    subject = Calendar.Templates.Calendar;
  });

  function renderHTML(type, options) {
    return subject[type].render(options);
  }

  test('#item with local id', function() {
    var model = {
      localDisplayed: true,
      _id: Calendar.Provider.Local.calendarId,
      name: 'foo'
    };

    var output = renderHTML('item', model);
    assert.ok(output);
    assert.include(output, 'calendar-local');
  });

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

    assert.ok(
      output.indexOf('calendar-local') === -1,
      'does not include calendar-local l10n id'
    );

    model.localDisplayed = false;
    output = renderHTML('item', model);

    var selected = output.indexOf('checked') !== -1;
    assert.isFalse(selected);
    assert.include(output, model.name);
  });
});
