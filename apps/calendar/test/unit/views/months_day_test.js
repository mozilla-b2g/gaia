requireLib('timespan.js');

suiteGroup('Views.MonthsDay', function() {
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

  test('bug 803934', function() {
    // verify flag is false
    assert.isFalse(subject.renderAllHours);
  });


  suite('#handleEvent', function() {

/*
// This test is currently failing and has been temporarily disabled as per
// Bug 838993. It should be fixed and re-enabled as soon as possible as per
// Bug 840489.
// This test appears to make incorrect assumptions about localization details
// (it does not fail on systems configured for US English).
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
      };

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
*/
  });

/*
// This test is currently failing and has been temporarily disabled as per
// Bug 838993. It should be fixed and re-enabled as soon as possible as per
// Bug 840489.
// This test appears to make incorrect assumptions about localization details
// (it does not fail on systems configured for US English).
  test('#render', function() {
    var date = new Date();
    var span = Calendar.Calc.spanOfDay(date);


    subject.render();
    assert.deepEqual(subject.timespan, span);

    assert.ok(subject.allDayElement, 'has all day');
    assert.ok(subject.events, 'has events');

    var html = subject.header.outerHTML;
    assert.ok(html);
    assert.include(html, date.toLocaleFormat('%A'));
  });
*/

  test('#onfirstseen', function() {
    assert.equal(subject.onfirstseen, subject.render);
  });

});
