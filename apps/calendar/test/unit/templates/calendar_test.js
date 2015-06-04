define(function(require) {
'use strict';

var Calendar = require('templates/calendar');
var localCalendarId = require('common/constants').localCalendarId;

suite('Templates.Calendar', function() {
  var subject;

  suiteSetup(function() {
    subject = Calendar;
  });

  function renderHTML(type, options) {
    return subject[type].render(options);
  }

  test('#item with local id', function() {
    var model = {
      localDisplayed: true,
      _id: localCalendarId,
      name: 'foo',
      color: '#BADA55'
    };

    var output = renderHTML('item', model);
    assert.ok(output);
    assert.match(output, /calendar-local-first"\s+role="presentation"/);
    assert.match(output,
      /icon-calendar-dot"\s+style="color:#BADA55"\s+aria-hidden="true"/);
    assert.match(output,
      /class="pack-checkbox" role="option" aria-selected="true"/);
    assert.include(output, 'calendar-local');
  });

  test('#item not local displayed', function() {
    var model = {
      localDisplayed: false,
      _id: localCalendarId,
      name: 'foo'
    };

    var output = renderHTML('item', model);
    assert.ok(output);
    assert.match(output, /class="pack-checkbox" role="option" >/);
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

});
