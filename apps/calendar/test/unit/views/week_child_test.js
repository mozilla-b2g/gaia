requireLib('timespan.js');

suiteGroup('Views.WeekChild', function() {
  var subject;
  var app;
  var controller;
  var events;
  var template;
  var viewDate = new Date(2012, 1, 15);
  var stubStickyFrame = document.createElement('section');

  setup(function() {
    app = testSupport.calendar.app();
    controller = app.timeController;
    events = app.store('Event');

    subject = new Calendar.Views.WeekChild({
      app: app,
      date: viewDate,
      stickyFrame: stubStickyFrame
    });

    template = Calendar.Templates.Day;
  });

  test('initialization', function() {
    assert.equal(subject.controller, controller);
    assert.instanceOf(subject, Calendar.Views.DayBased);
  });

  test('#_renderEvent', function() {
    var event = Factory('event', {
      remote: {
        title: 'UX'
      }
    });

    var busytime = Factory('busytime');

    var result = subject._renderEvent(busytime, event);

    assert.ok(result);
    assert.include(result, 'UX');
    assert.include(result, busytime._id);
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

  test('#_assignPosition', function() {
      var busy = Factory('busytime', {
        startDate: new Date(2012, 0, 1, 0, 15),
        endDate: new Date(2012, 0, 1, 3, 30)
      });
      var el = document.createElement('div');
      subject.date = new Date(2012, 0, 1);
      subject._assignPosition(busy, el);

      assert.equal(el.style.height, 'calc(325% + 1.5px)', 'height');
  });

  test('#create', function() {
    var element = subject.create();
    var html = element.innerHTML;
    assert.ok(html);
    assert.include(stubStickyFrame.innerHTML, subject._renderHeader());
  });

});

