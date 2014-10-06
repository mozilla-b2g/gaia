'use strict';

requireLib('timespan.js');
requireLib('utils/overlap.js');
requireLib('day_observer.js');
requireLib('views/single_day.js');

suiteGroup('Views.SingleDay', function() {

  var alldaysHolder;
  var app;
  var date;
  var dayId;
  var dayObserver = Calendar.dayObserver;
  var daysHolder;
  var subject;

  suiteSetup(function() {
    app = testSupport.calendar.app();
  });

  setup(function() {
    daysHolder = document.createElement('div');
    alldaysHolder = document.createElement('div');
    date = new Date(2014, 6, 23);
    dayId = Calendar.Calc.getDayId(date);

    subject = new Calendar.Views.SingleDay({
      date: date,
      daysHolder: daysHolder,
      alldaysHolder: alldaysHolder,
      hourHeight: 50
    });

    dayObserver.timeController = app.timeController;

    this.sinon.spy(dayObserver, 'on');
    this.sinon.spy(dayObserver, 'off');
    this.sinon.spy(window, 'addEventListener');
    this.sinon.spy(window, 'removeEventListener');
    this.sinon.spy(subject, 'onactive');
    this.sinon.spy(subject, 'oninactive');
  });

  teardown(function() {
    dayObserver.on.restore();
    dayObserver.off.restore();
    window.addEventListener.restore();
    window.removeEventListener.restore();
    subject.onactive.restore();
    subject.oninactive.restore();
    subject.destroy();
  });

  test('#setup', function() {
    subject.setup();
    assert.ok(
      subject.onactive.calledOnce,
      'activated'
    );
  });

  test('#onactive', function() {
    subject.onactive();
    subject.onactive();
    assert.ok(
      dayObserver.on.calledOnce,
      'should add listener only once'
    );
    assert.ok(
      dayObserver.on.calledWithExactly(date, subject._render),
      'observing day events'
    );
    assert.ok(
      window.addEventListener.calledWithExactly('localized', subject),
      'observing localized event'
    );
  });

  test('#oninactive > when inactive', function() {
    subject.oninactive();
    subject.oninactive();
    assert.ok(
      !dayObserver.off.called,
      'should not execute if not active'
    );
    assert.ok(
      !window.removeEventListener.called,
      'localized'
    );
  });

  test('#oninactive > after onactive', function() {
    subject.onactive();
    subject.oninactive();
    subject.oninactive();
    assert.ok(
      dayObserver.off.calledOnce,
      'should stop listening for date'
    );
    assert.ok(
      dayObserver.off.calledWithExactly(date, subject._render),
      'wont render anymore'
    );
    assert.ok(
      window.removeEventListener.calledWithExactly('localized', subject),
      'localized'
    );
  });

  test('#append', function() {
    subject.setup();
    subject.append();

    var d = date.toString();

    assert.equal(
      daysHolder.innerHTML,
      '<div data-date="' + d + '" class="day"></div>',
      'should add day node'
    );

    assert.equal(
      alldaysHolder.innerHTML,
      '<div data-date="' + d + '" class="allday">' +
        '<h1 class="day-name">Wed 23</h1>' +
        '<div class="allday-events"></div>' +
      '</div>'
    );
  });

  test('#handleEvent', function() {
    subject._dayName = { textContent: 'foo' };
    subject.handleEvent({type: 'localized'});
    assert.equal(subject._dayName.textContent, 'Wed 23');
  });

  test('#destroy', function() {
    // it should remove element from DOM and stop listening busytimes
    subject.setup();
    subject.append();
    subject.destroy();
    assert.equal(daysHolder.innerHTML, '');
    assert.equal(alldaysHolder.innerHTML, '');
    assert.ok(
      subject.oninactive.calledOnce,
      'should deactivate'
    );
  });

  test('#_render', function() {
    subject.setup();
    subject.append();

    // notice that we are testing the method indirectly (the important thing to
    // check is if the view updates when the dayObserver emits events)
    dayObserver.emitter.emit(dayId, [
      makeRecord('Lorem Ipsum', '5:00', '6:00'),
      makeRecord('Dolor Amet', '4:00', '6:00', 1),
      makeAlldayRecord('Curabitur')
    ]);

    // testing the whole markup is enough to check if position and overlaps are
    // handled properly and also makes sure all the data is passed to the
    // templates, a drawback is that if we change the markup we need to update
    // the tests (might catch differences that are not regressions)
    assert.equal(
      daysHolder.innerHTML,
      '<div data-date="' + date.toString() +'" class="day">' +
      '<a style="height: 49.9px; top: 250px; width: 50%; left: 50%;" ' +
        'class="event calendar-id-local-first calendar-border-color ' +
        'calendar-bg-color has-overlaps" ' +
        'href="/event/show/Lorem Ipsum-5:00-6:00">' +
        '<span class="event-title">Lorem Ipsum</span>' +
        '<span class="event-location">Mars</span>' +
      '</a>' +
      '<a style="height: 99.9px; top: 200px; width: 50%; left: 0%;" ' +
        'class="event calendar-id-local-first calendar-border-color ' +
        'calendar-bg-color has-alarms has-overlaps" ' +
        'href="/event/show/Dolor Amet-4:00-6:00">' +
        '<span class="event-title">Dolor Amet</span>' +
        '<span class="event-location">Mars</span>' +
        '<i class="gaia-icon icon-calendar-alarm calendar-text-color"></i>' +
      '</a></div>',
      'days: first render'
    );

    assert.equal(
      alldaysHolder.innerHTML,
      '<div data-date="' + date.toString() + '" class="allday">' +
        '<h1 class="day-name">Wed 23</h1>' +
        '<div class="allday-events">' +
        '<a class="event calendar-id-local-first calendar-border-color ' +
        'calendar-bg-color is-allday" href="/event/show/Curabitur-0:00-0:00">' +
        '<span class="event-title">Curabitur</span>' +
        '<span class="event-location">Mars</span>' +
        '</a></div></div>',
      'alldays: first render'
    );

    // we always send all the events for that day and redraw whole view
    dayObserver.emitter.emit(dayId, [
      makeRecord('Lorem Ipsum', '5:00', '6:00'),
      makeRecord('Maecennas', '6:00', '17:00', 1)
    ]);

    assert.equal(
      daysHolder.innerHTML,
      '<div data-date="' + date.toString() +'" class="day">' +
      '<a style="height: 49.9px; top: 250px;" ' +
        'class="event calendar-id-local-first calendar-border-color ' +
        'calendar-bg-color" href="/event/show/Lorem Ipsum-5:00-6:00">' +
        '<span class="event-title">Lorem Ipsum</span>' +
        '<span class="event-location">Mars</span>' +
      '</a>' +
      '<a style="height: 549.9px; top: 300px;" ' +
        'class="event calendar-id-local-first calendar-border-color ' +
        'calendar-bg-color has-alarms" ' +
        'href="/event/show/Maecennas-6:00-17:00">' +
        '<span class="event-title">Maecennas</span>' +
        '<span class="event-location">Mars</span>' +
        '<i class="gaia-icon icon-calendar-alarm calendar-text-color"></i>' +
      '</a></div>',
      'second render'
    );

    assert.equal(
      alldaysHolder.innerHTML,
      '<div data-date="' + date.toString() + '" class="allday">' +
        '<h1 class="day-name">Wed 23</h1>' +
        '<div class="allday-events"></div></div>',
      'alldays: second render'
    );
  });

  test('#_render > partial hour', function() {
    subject.setup();
    subject.append();

    dayObserver.emitter.emit(dayId, [
      makeRecord('Lorem Ipsum', '5:00', '5:15'),
      makeRecord('Maecennas', '6:00', '6:25'),
      makeRecord('Dolor', '6:30', '7:00'),
      makeRecord('Amet', '7:00', '7:50')
    ]);

    assert.include(
      daysHolder.innerHTML,
      'partial-hour partial-hour-micro',
      'smaller than 18min'
    );

    assert.include(
      daysHolder.innerHTML,
      'partial-hour partial-hour-tiny',
      'between 18-30min'
    );

    assert.include(
      daysHolder.innerHTML,
      'partial-hour partial-hour-small',
      'between 30-45min'
    );

    assert.include(
      daysHolder.innerHTML,
      'partial-hour"',
      'longer than 45min'
    );
  });

  function makeRecord(title, startTime, endTime, alarmsLength) {
    var startDate = new Date(date);
    var [startHour, startMinutes] = startTime.split(':');
    startDate.setHours(startHour, startMinutes);

    var endDate = new Date(date);
    var [endHour, endMinutes] = endTime.split(':');
    endDate.setHours(endHour, endMinutes);

    return {
      busytime: {
        _id: title + '-' + startTime + '-' + endTime,
        startDate: startDate,
        endDate: endDate
      },
      event: {
        calendarId: 'local-first',
        remote: {
          title: title,
          location: 'Mars',
          alarms: new Array(alarmsLength || 0)
        }
      }
    };
  }

  function makeAlldayRecord(title, alarmsLength) {
    var record = makeRecord(title, '0:00', '0:00', alarmsLength);
    var endDate = record.busytime.endDate;
    endDate.setDate(endDate.getDate() + 1);
    return record;
  }

});
