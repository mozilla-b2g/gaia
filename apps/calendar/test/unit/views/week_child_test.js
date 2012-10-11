requireApp('calendar/test/unit/helper.js', function() {
  requireLib('timespan.js');
  requireLib('ordered_map.js');
  requireLib('templates/day.js');
  requireLib('templates/week.js');
  requireLib('views/day_based.js');
  requireLib('views/week_child.js');
});

suite('views/week_child', function() {
  var subject;
  var app;
  var controller;
  var events;
  var template;
  var viewDate = new Date(2012, 1, 15);

  setup(function() {
    app = testSupport.calendar.app();
    controller = app.timeController;
    events = app.store('Event');

    subject = new Calendar.Views.WeekChild({
      app: app,
      date: viewDate
    });

    template = Calendar.Templates.Day;
  });

  test('initialization', function() {
    assert.equal(subject.controller, controller);
    assert.instanceOf(subject, Calendar.Views.DayBased);
  });

  test('#_renderEvent', function() {
    var data = Factory('event', {
      remote: {
        title: 'UX'
      }
    });

    var result = subject._renderEvent(data);
    assert.ok(result);

    assert.include(result, 'UX');
  });

  test('#_renderHeader', function() {
    var format = app.dateFormat.localeFormat(
      subject.date,
      '%a %e'
    );

    var out = subject._renderHeader();
    assert.ok(out, 'html');
    assert.include(out, format, 'has format');
  });

  test('#create', function() {
    var element = subject.create();
    var html = element.innerHTML;
    assert.ok(html);
    assert.include(html, subject._renderHeader());
  });

});

