requireApp('calendar/js/gesture_detector.js');

requireApp('calendar/test/unit/helper.js', function() {

  requireApp('calendar/js/gesture_detector.js');
  requireCalendarController();
  requireApp('calendar/js/templates/day.js');
  requireApp('calendar/js/views/months_day.js');

});

suite('views/months_day', function() {
  var subject,
      controller,
      events;

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });

  setup(function() {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div class="dayHeader"></div>',
      '<div class="eventList"></div>'
    ].join(' ');

    document.body.appendChild(div);

    controller = createController();
    events = controller.eventList;


    subject = new Calendar.Views.MonthsDay({
      controller: controller,
      headerSelector: '#test .dayHeader',
      eventsSelector: '#test .eventList'
    });
  });

  test('initialization', function() {
    assert.equal(subject.headerSelector, '#test .dayHeader');
    assert.equal(subject.controller, controller);
  });

  test('#_renderDay', function() {
    var date1 = new Date(2012, 1, 1, 1);
    var date2 = new Date(2012, 1, 1, 4);

    events.add(date1, '1', {
      name: 'UX1',
      location: 'Paris'
    });

    events.add(date1, '2', {
      name: 'UX2',
      location: 'Paris'
    });

    events.add(date2, '3', {
      name: 'UX3',
      location: 'Paris'
    });

    var result = subject._renderDay(new Date(2012, 1, 1));

    assert.include(
      result,
      'UX1'
    );

    assert.include(
      result,
      'UX2'
    );

    assert.include(
      result,
      'UX3'
    );

  });

  test('#_renderAttendees', function() {
    var list = ['z', 'y'],
        result = subject._renderAttendees(list);

    assert.include(result, '>z<');
    assert.include(result, '>y<');
  });

  test('#_renderEventDetails', function() {
    var data = {
      name: 'UX',
      location: 'Paris',
      attendees: ['zoo', 'barr']
    };

    var result = subject._renderEventDetails(data);

    assert.ok(result);

    assert.include(result, 'UX');
    assert.include(result, 'Paris');
    assert.include(result, '>zoo<');
    assert.include(result, '>barr<');
  });

  test('#_updateHeader', function() {
    var date = new Date(2012, 4, 11);
    var el = subject.headerElement();

    controller.setSelectedDay(date);

    assert.include(el.innerHTML, '11');
    assert.include(el.innerHTML, 'May');
    assert.include(el.innerHTML, 'Friday');
  });

  test('#render', function() {
    var date, day, month,
        currentTime,
        el = subject.headerElement();

    currentTime = new Date();

    date = currentTime.getDate();
    day = subject.dayNames[currentTime.getDay()];
    month = subject.monthNames[currentTime.getMonth()];

    subject.render();

    assert.include(el.innerHTML, date);
    assert.include(el.innerHTML, day);
    assert.include(el.innerHTML, month);
  });

});
