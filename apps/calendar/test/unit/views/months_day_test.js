requireApp('calendar/test/unit/helper.js', function() {
  requireLib('timespan.js');
  requireLib('ordered_map.js');
  requireLib('templates/day.js');
  requireLib('views/day_based.js');
  requireLib('views/day_child.js');
  requireLib('views/months_day.js');
});

suite('views/months_day', function() {
  var subject,
      app,
      controller,
      events,
      template,
      busytimes;

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });

  setup(function() {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div id="months-day-view">',
        '<div class="day-title"></div>',
        '<div class="day-events"></div>',
      '</div>'
    ].join(' ');

    document.body.appendChild(div);

    app = testSupport.calendar.app();
    controller = app.timeController;
    events = app.store('Event');
    busytimes = app.store('Busytime');

    subject = new Calendar.Views.MonthsDay({
      app: app
    });

    template = Calendar.Templates.Day;
  });

  test('initializer', function() {
    assert.instanceOf(subject, Calendar.Views.DayChild);
  });


  suite('#handleEvent', function() {

    test('selectedDayChange', function() {
      var date = new Date(2012, 1, 1);
      var calledWith;

      // start with different date...
      subject.date = new Date(2012, 1, 27);

      // initialize events
      subject.render();

      subject.changeDate = function() {
        Calendar.Views.MonthsDay.prototype.changeDate.apply(
          this, arguments
        );

        calledWith = arguments;
      }

      subject.controller.selectedDay = date;
      assert.equal(
        calledWith[0],
        date,
        'should change date in view when controller changes'
      );

      assert.deepEqual(
        subject.date,
        date
      );

      var html = subject.header.outerHTML;
      assert.ok(html);
      assert.include(html, date.toLocaleFormat('%A'));
    });
  });

  test('#_updateHeader', function() {
    var date = new Date(2012, 4, 11);
    var el = subject.header;
    subject.date = date;
    subject._updateHeader();

    var month = date.toLocaleFormat('%B');
    var day = date.toLocaleFormat('%A');

    assert.include(el.innerHTML, '11');
    assert.include(el.innerHTML, month);
    assert.include(el.innerHTML, day);
  });

  test('#header', function() {
    assert.ok(subject.header);
  });

  test('#render', function() {
    var date = new Date();
    var span = Calendar.Calc.spanOfDay(date);

    subject.render();
    assert.deepEqual(subject.timespan, span);

    var html = subject.header.outerHTML;
    assert.ok(html);
    assert.include(html, date.toLocaleFormat('%A'));
  });

  test('#onfirstseen', function() {
    assert.equal(subject.onfirstseen, subject.render);
  });

});
