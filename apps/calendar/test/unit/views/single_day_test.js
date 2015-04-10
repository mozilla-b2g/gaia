define(function(require) {
'use strict';

var Calc = require('calc');
var SingleDay = require('views/single_day');
var dayObserver = require('day_observer');

suite('Views.SingleDay', function() {
  var alldaysHolder;
  var allDayIcon;
  var app;
  var date;
  var dayId;
  var daysHolder;
  var subject;

  setup(function(done) {
    app = testSupport.calendar.app();
    daysHolder = document.createElement('div');
    alldaysHolder = document.createElement('div');
    allDayIcon = document.createElement('span');
    allDayIcon.id = 'all-day-icon';
    date = new Date(2014, 6, 23);
    dayId = Calc.getDayId(date);

    subject = new SingleDay({
      date: date,
      daysHolder: daysHolder,
      alldaysHolder: alldaysHolder,
      hourHeight: 50,
      allDayIcon: allDayIcon,
      oneDayLabelFormat: 'event-one-day-duration'
    });

    this.sinon.spy(dayObserver, 'on');
    this.sinon.spy(dayObserver, 'off');
    this.sinon.spy(window, 'addEventListener');
    this.sinon.spy(window, 'removeEventListener');
    this.sinon.spy(subject, 'onactive');
    this.sinon.spy(subject, 'oninactive');
    app.db.open(done);
  });

  teardown(function() {
    dayObserver.on.restore();
    dayObserver.off.restore();
    window.addEventListener.restore();
    window.removeEventListener.restore();
    subject.onactive.restore();
    subject.oninactive.restore();
    subject.destroy();
    app.db.close();
  });

  test('#setup', function() {
    subject.setup();
    assert.ok(
      subject.onactive.calledOnce,
      'activated'
    );
  });

  test('#onactive', function() {
    subject.setup();
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
    subject.setup();
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
      '<div data-date="' + d + '" class="md__day"></div>',
      'should add day node'
    );

    assert.equal(
      alldaysHolder.innerHTML,
      '<div data-date="' + d + '" class="md__allday">' +
        '<h1 id="md__day-name-' + subject._instanceID + '" aria-level="2" ' +
          'class="md__day-name">Wed 23</h1>' +
        '<div aria-describedby="md__day-name-4" ' +
          'data-l10n-id="create-all-day-event" role="button" ' +
          'class="md__allday-events"></div>' +
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

    var data = {
      amount: 3,
      basic: [
        makeRecord('Dolor Amet', '4:00', '6:00', 1),
        makeRecord('Lorem Ipsum', '5:00', '6:00')
      ],
      allday: [
        makeAlldayRecord('Curabitur')
      ]
    };
    var makeFirstEventID = makeID.bind(this, subject, data.basic[0]);
    var makeSecondEventID = makeID.bind(this, subject, data.basic[1]);
    var makeAllDayEventID = makeID.bind(this, subject, data.allday[0]);

    // notice that we are testing the method indirectly (the important thing to
    // check is if the view updates when the dayObserver emits events)
    dayObserver.emitter.emit(dayId, data);

    // testing the whole markup is enough to check if position and overlaps are
    // handled properly and also makes sure all the data is passed to the
    // templates, a drawback is that if we change the markup we need to update
    // the tests (might catch differences that are not regressions)

    var days = daysHolder.querySelectorAll('.md__day');
    assert.lengthOf(days, 1, 'single day');
    assert.equal(days[0].dataset.date, date.toString(), '[data-date]');

    var busytimes = days[0].querySelectorAll('.md__event');
    assert.lengthOf(busytimes, 2, 'busytimes');

    // busytime #1
    var busy = busytimes[0];

    // position/size is enough to test overlaps
    assert.equal(busy.style.height, '99.9px', '1: height');
    assert.equal(busy.style.top, '200px', '1: top');
    assert.equal(busy.style.width, '50%', '1: width');
    assert.equal(busy.style.left, '0%', '1: left');
    assert.include(
      busy.href, '/event/show/' + data.basic[0].busytime._id, '1: href');

    var labels = busy.getAttribute('aria-labelledby');
    assert.include(labels, makeFirstEventID('title'), '1: label title');
    assert.include(labels, makeFirstEventID('location'), '1: label location');
    assert.include(labels, makeFirstEventID('icon'), '1: label icon');
    assert.include(labels, makeFirstEventID('description'), '1: label desc');

    assert.include(busy.className, 'has-alarms', '1: class');
    assert.include(busy.className, 'has-overlaps', '1: class');

    var remote = data.basic[0].event.remote;

    var title = busy.querySelector('#' + makeFirstEventID('title'));
    assert.equal(title.textContent, remote.title, '1: title');

    var location = busy.querySelector('#' + makeFirstEventID('location'));
    assert.equal(location.textContent, remote.location, '1: location');

    var icon = busy.querySelector('#' + makeFirstEventID('icon'));
    assert.include(icon.className, 'icon-calendar-alarm', '1: icon');
    assert.equal(icon.getAttribute('aria-hidden'), 'true', '1: icon hidden');

    var description = busy.querySelector('#' + makeFirstEventID('description'));
    assert.equal(
      description.getAttribute('aria-hidden'), 'true', '1: desc hidden');
    assert.equal(
      description.dataset.l10nId, 'event-one-day-duration', '1: desc l10nId'
    );
    assert.equal(
      description.dataset.l10nArgs,
      '{"startDate":"Wednesday, July 23, 2014","startTime":"04:00",' +
      '"endDate":"Wednesday, July 23, 2014","endTime":"06:00"}',
      '1: desc l10nArgs'
    );

    // busytime #2
    busy = busytimes[1];

    // position/size is enough to test overlaps
    assert.equal(busy.style.height, '49.9px', '2: height');
    assert.equal(busy.style.top, '250px', '2: top');
    assert.equal(busy.style.width, '50%', '2: width');
    assert.equal(busy.style.left, '50%', '2: left');
    assert.include(
      busy.href, '/event/show/' + data.basic[1].busytime._id, '2: href');

    labels = busy.getAttribute('aria-labelledby');
    assert.include(labels, makeSecondEventID('title'), '2: label title');
    assert.include(labels, makeSecondEventID('location'), '2: label location');
    assert.include(labels, makeSecondEventID('description'), '2: label desc');

    assert.include(busy.className, 'has-overlaps', '2: class');

    remote = data.basic[1].event.remote;

    title = busy.querySelector('#' + makeSecondEventID('title'));
    assert.equal(title.textContent, remote.title, '2: title');

    location = busy.querySelector('#' + makeSecondEventID('location'));
    assert.equal(location.textContent, remote.location, '2: location');

    icon = busy.querySelector('#' + makeSecondEventID('icon'));
    assert.isNull(icon, '2: icon');

    description = busy.querySelector('#' + makeSecondEventID('description'));
    assert.equal(
      description.getAttribute('aria-hidden'), 'true', '2: desc hidden');
    assert.equal(
      description.dataset.l10nId, 'event-one-day-duration', '2: desc l10nId'
    );
    assert.equal(
      description.dataset.l10nArgs,
      '{"startDate":"Wednesday, July 23, 2014","startTime":"05:00",' +
      '"endDate":"Wednesday, July 23, 2014","endTime":"06:00"}',
      '2: desc l10nArgs'
    );

    var id = subject._instanceID;

    assert.equal(
      alldaysHolder.innerHTML,
      '<div data-date="' + date.toString() + '" class="md__allday">' +
        '<h1 id="md__day-name-' + id + '" aria-level="2" ' +
          'class="md__day-name">Wed 23</h1>' +
        '<div aria-labelledby="all-day-icon md__day-name-' + id + '" ' +
          'aria-describedby="md__day-name-' + id + '" ' +
          'data-l10n-id="create-all-day-event" role="listbox" ' +
          'class="md__allday-events">' +
        '<a role="option" aria-labelledby="' + makeAllDayEventID('title') +
        ' ' + makeAllDayEventID('location') + '" ' +
        'style="border-color: rgb(0, 255, 204); background-color: ' +
        'rgba(0, 255, 204, 0.2);" ' +
          'class="md__event is-allday" ' +
          'href="/event/show/Curabitur-0-00-0-00">' +
        '<bdi id="' + makeAllDayEventID('title') + '" ' +
          'class="md__event-title">Curabitur</bdi>' +
        '<bdi id="' + makeAllDayEventID('location') + '" ' +
          'class="md__event-location">Mars</bdi>' +
        '</a></div></div>',
      'alldays: first render'
    );

    data = {
      amount: 2,
      basic: [
        makeRecord('Lorem Ipsum', '5:00', '6:00'),
        makeRecord('Maecennas', '6:00', '17:00', 1)
      ],
      allday: []
    };
    makeFirstEventID = makeID.bind(this, subject, data.basic[0]);
    makeSecondEventID = makeID.bind(this, subject, data.basic[1]);
    // we always send all the events for that day and redraw whole view
    dayObserver.emitter.emit(dayId, data);

    assert.equal(
      daysHolder.innerHTML,
      '<div data-date="' + date.toString() +'" class="md__day">' +
      '<a aria-labelledby="' + makeFirstEventID('title') + ' ' +
        makeFirstEventID('location') + ' ' +
        makeFirstEventID('description') + '" ' +
        'style="border-color: rgb(0, 255, 204); background-color: ' +
        'rgba(0, 255, 204, 0.2); height: 49.9px; top: 250px; width: 100%; ' +
        'left: 0%;" ' +
        'class="md__event" href="/event/show/Lorem-Ipsum-5-00-6-00">' +
        '<bdi id="' + makeFirstEventID('title') + '" ' +
          'class="md__event-title">Lorem Ipsum</bdi>' +
        '<bdi id="' + makeFirstEventID('location') + '" ' +
          'class="md__event-location">Mars</bdi>' +
        '<span data-l10n-args="{&quot;startDate&quot;:&quot;Wednesday, July ' +
          '23, 2014&quot;,&quot;startTime&quot;:&quot;05:00&quot;,&quot;' +
          'endDate&quot;:&quot;Wednesday, July 23, 2014&quot;,&quot;endTime' +
          '&quot;:&quot;06:00&quot;}" data-l10n-id="event-one-day-duration" ' +
          'aria-hidden="true" id="' + makeFirstEventID('description') + '">' +
        '</span>' +
      '</a>' +
      '<a aria-labelledby="' + makeSecondEventID('title') + ' ' +
        makeSecondEventID('location') + ' ' +
        makeSecondEventID('icon') + ' ' +
        makeSecondEventID('description') + '" ' +
        'style="border-color: rgb(0, 255, 204); background-color: ' +
        'rgba(0, 255, 204, 0.2); height: 549.9px; top: 300px; width: 100%; ' +
        'left: 0%;" ' +
        'class="md__event has-alarms" ' +
        'href="/event/show/Maecennas-6-00-17-00">' +
        '<bdi id="' + makeSecondEventID('title') + '" ' +
          'class="md__event-title">Maecennas</bdi>' +
        '<bdi id="' + makeSecondEventID('location') + '" ' +
          'class="md__event-location">Mars</bdi>' +
        '<i data-l10n-id="icon-calendar-alarm" id="' +
          makeSecondEventID('icon') + '" aria-hidden="true" ' +
          'style="color: rgb(0, 255, 204);" ' +
          'class="gaia-icon icon-calendar-alarm"></i>' +
        '<span data-l10n-args="{&quot;startDate&quot;:&quot;Wednesday, July ' +
          '23, 2014&quot;,&quot;startTime&quot;:&quot;06:00&quot;,&quot;' +
          'endDate&quot;:&quot;Wednesday, July 23, 2014&quot;,&quot;endTime' +
          '&quot;:&quot;17:00&quot;}" data-l10n-id="event-one-day-duration" ' +
          'aria-hidden="true" id="' + makeSecondEventID('description') + '">' +
        '</span>' +
      '</a></div>',
      'second render'
    );

    assert.equal(
      alldaysHolder.innerHTML,
      '<div data-date="' + date.toString() + '" class="md__allday">' +
        '<h1 id="md__day-name-' + subject._instanceID + '" aria-level="2" ' +
          'class="md__day-name">Wed 23</h1>' +
        '<div aria-labelledby="all-day-icon md__day-name-' + id + '" ' +
          'aria-describedby="md__day-name-' + subject._instanceID + '" ' +
          'data-l10n-id="create-all-day-event" role="button" ' +
          'class="md__allday-events"></div></div>',
      'alldays: second render'
    );
  });

  test('#_render > partial hour', function() {
    subject.setup();
    subject.append();

    dayObserver.emitter.emit(dayId, {
      amount: 4,
      basic: [
        makeRecord('Lorem Ipsum', '5:00', '5:15'),
        makeRecord('Maecennas', '6:00', '6:25'),
        makeRecord('Dolor', '6:30', '7:00'),
        makeRecord('Amet', '7:00', '7:50')
      ],
      allday: []
    });

    assert.include(
      daysHolder.innerHTML,
      'is-partial is-partial-micro',
      'smaller than 18min'
    );

    assert.include(
      daysHolder.innerHTML,
      'is-partial is-partial-tiny',
      'between 18-30min'
    );

    assert.include(
      daysHolder.innerHTML,
      'is-partial is-partial-small',
      'between 30-45min'
    );

    assert.include(
      daysHolder.innerHTML,
      'is-partial"',
      'longer than 45min'
    );
  });

  function makeID(subject, event, postfix) {
    return ['md__event', event.busytime._id, postfix, subject._instanceID]
      .join('-').replace(/\s+/g, '-');
  }

  function makeRecord(title, startTime, endTime, alarmsLength) {
    var startDate = new Date(date);
    var [startHour, startMinutes] = startTime.split(':');
    startDate.setHours(startHour, startMinutes);

    var endDate = new Date(date);
    var [endHour, endMinutes] = endTime.split(':');
    endDate.setHours(endHour, endMinutes);

    return {
      color: '#00ffcc',
      busytime: {
        _id: (title + '-' + startTime + '-' + endTime).replace(/[\s:]+/g, '-'),
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

});
