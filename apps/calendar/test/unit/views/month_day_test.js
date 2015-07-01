define(function(require) {
'use strict';

var MonthDay = require('views/month_day');

suite('Views.MonthDay', function() {
  var container;
  var subject;

  setup(function() {
    container = document.createElement('div');
    subject = new MonthDay({
      container: container,
      date: new Date(2014, 6, 23),
      month: new Date(2014, 6, 1)
    });
  });

  teardown(function() {
    subject.destroy();
    container.innerHTML = '';
  });

  suite('#create', function() {
    test('same month', function() {
      subject.create();
      var id = 'month-view-day-d-2014-6-23';

      var li = subject.element;
      assert.equal(li.getAttribute('role'), 'gridcell');
      assert.equal(li.tabindex, '0');
      assert.equal(
        li.getAttribute('aria-describedby'),
        `${id}-busy-indicator ${id}-description`
      );
      assert.equal(li.dataset.date, 'd-2014-6-23');

      var day = li.querySelector('.day');
      assert.equal(day.getAttribute('role'), 'button');
      assert.equal(day.textContent.trim(), '23');

      var busy = li.querySelector('.busy-indicator');
      assert.equal(busy.id, `${id}-busy-indicator`);
      assert.equal(busy.getAttribute('aria-hidden'), 'true');

      var description = li.querySelector(`#${id}-description`);
      assert.equal(description.getAttribute('aria-hidden'), 'true');
      assert.equal(description.getAttribute('data-l10n-id'), '');
    });

    test('past-other-month', function() {
      subject.date = new Date(2014, 5, 30);
      subject.create();
      assert.include(
        subject.element.outerHTML,
        'data-l10n-id="past-other-month-description"'
      );
    });

    test('future-other-month', function() {
      var future = new Date();
      future.setFullYear(future.getFullYear() + 2);
      subject.date = future;
      subject.create();
      assert.include(
        subject.element.outerHTML,
        'data-l10n-id="future-other-month-description"'
      );
    });
  });

  suite('#_updateBusyCount', function() {
    var busy;

    setup(function() {
      subject.create();
      busy = subject.element.querySelector('.busy-indicator');
    });

    test('add', function() {
      subject._updateBusyCount({ amount: 2 });
      assert.lengthOf(busy.childNodes, 2);
      subject._updateBusyCount({ amount: 5 });
      assert.lengthOf(busy.childNodes, 3);
    });

    test('remove', function() {
      subject._updateBusyCount({ amount: 5 });
      assert.lengthOf(busy.childNodes, 3);
      subject._updateBusyCount({ amount: 3 });
      assert.lengthOf(busy.childNodes, 3);
      subject._updateBusyCount({ amount: 2 });
      assert.lengthOf(busy.childNodes, 2);
      subject._updateBusyCount({ amount: 0 });
      assert.lengthOf(busy.childNodes, 0);
    });
  });

});

});
