requireLib('querystring.js');
requireLib('timespan.js');
requireLib('utils/overlap.js');
requireLib('utils/ordered_map.js');
requireLib('templates/day.js');
requireLib('views/day_based.js');

suiteGroup('Views.DayBased', function() {

  var OrderedMap;

  suiteSetup(function() {
    OrderedMap = Calendar.Utils.OrderedMap;
  });

  var subject;
  var app;
  var date = new Date(2012, 1, 5);
  var id = 0;
  var hours;

  function eventHolder() {
    return { remote: {}, _id: id++ };
  }

  var controller;
  var template;

  setup(function() {
    id = 0;
    app = testSupport.calendar.app();
    controller = app.timeController;

    subject = new Calendar.Views.DayBased({
      date: date,
      app: app
    });

    template = subject.template;

    subject._renderEvent = function(busytime, event) {
      return template.event.render({
        busytimeId: busytime._id,
        calendarId: event.calendarId,
        title: event.remote.title
      });
    };

    subject._buildElement();
    hours = subject.hours;
  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.View);
    assert.equal(subject.app, app);
    assert.instanceOf(subject.timespan, Calendar.Timespan);

    var expectedSpan = Calendar.Calc.spanOfDay(date);
    assert.deepEqual(subject.timespan, expectedSpan);

    assert.instanceOf(subject.hours, OrderedMap);
    assert.instanceOf(subject.overlaps, Calendar.Utils.Overlap);
  });

  suite('#_loadRecords', function() {
    var requestCalledWith;
    var addCalledWith;
    var list = [];
    var busytimes = [];
    var start = new Date();

    setup(function() {
      list.length = 0;
      busytimes.length = 0;

      var start = new Date();
      var end = new Date();

      start.setMinutes(start.getMinutes() - 10);
      end.setHours(end.getHours() + 10);

      var i = 0;
      var busy;

      // stage busytimes so they are passed into findAssociated.
      for (; i < 2; i++) {
        busy = Factory('busytime', {
          startDate: start,
          endDate: end
        });

        busytimes.push(busy);

        list.push({
          event: Factory('event'),
          busytime: busy
        });
      }

      requestCalledWith = [];
      addCalledWith = [];

      subject.add = function() {
        addCalledWith.push(arguments);
      };

      controller.findAssociated = function() {
        requestCalledWith.push(arguments);
      };
    });

    test('when given an object', function() {
      subject._loadRecords(list[0].busytime);

      requestCalledWith[0][1](null, [list[0]]);
      assert.deepEqual(
        addCalledWith[0],
        [list[0].busytime, list[0].event]
      );
    });

    test('when token changes midway', function() {
      // increment token
      subject._loadRecords([list[0].busytime]);
      subject._changeToken++;
      subject._loadRecords(busytimes);

      assert.equal(requestCalledWith.length, 2);
      assert.equal(addCalledWith.length, 0);

      // now that token has changed
      // we don't care about this and so
      // it should do nothing...
      requestCalledWith[0][1](null, list);
      assert.equal(addCalledWith.length, 0);

      // should fire wehen the correct set of
      // changes is loaded...
      requestCalledWith[1][1](null, list);
      assert.deepEqual(
        addCalledWith[0],
        [list[0].busytime, list[0].event]
      );
    });

    test('when change token is same', function() {
      subject._loadRecords(busytimes);

      assert.ok(requestCalledWith.length);
      assert.ok(!addCalledWith.length);

      requestCalledWith[0][1](null, list);

      assert.deepEqual(
        addCalledWith[0],
        [list[0].busytime, list[0].event]
      );
      assert.deepEqual(
        addCalledWith[1],
        [list[1].busytime, list[1].event]
      );
    });
  });

  suite('#changeDate', function() {
    var startTime = new Date(2012, 1, 1);
    var calledLoadWith;

    setup(function() {
      calledLoadWith = false;

      subject._loadRecords = function() {
        calledLoadWith = arguments;
      };

      subject.events.innerHTML = 'foobar';
    });

    test('from clean state', function() {
      assert.equal(subject._changeToken, 0);
      var day = Calendar.Calc.createDay(startTime);

      assert.ok(!subject.element.dataset.date, 'does not have a date');
      subject.changeDate(startTime, true);

      assert.equal(
        subject.element.dataset.date,
        startTime.toString(),
        'sets dataset.date'
      );

      assert.equal(subject._changeToken, 1);
      assert.deepEqual(subject.date, day);
      assert.equal(subject.events.innerHTML, '');

      assert.deepEqual(subject.date, day);
      assert.ok(!calledLoadWith, 'loads records');

      assert.deepEqual(
        subject.timespan,
        Calendar.Calc.spanOfDay(day)
      );

      var eventIdx = controller.findTimeObserver(
        subject.timespan, subject
      );

      assert.ok(
        eventIdx !== -1,
        'should have busytime observer'
      );
    });

    test('from second change', function() {
      subject.changeDate(new Date(), true);
      var oldRange = subject.timespan;

      subject.changeDate(startTime);

      var eventIdx = controller.findTimeObserver(
        oldRange, subject
      );

      assert.ok(
        eventIdx === -1,
        'should remove old observers'
      );
    });

  });

  suite('#_assignPosition', function() {

    function time(hour=0, minutes=0) {
      return new Date(2012, 0, 1, hour, minutes);
    }

    function record(start, end) {
      return Factory('busytime', {
        startDate: start,
        endDate: end
      });
    };

    var el;

    setup(function() {
      el = document.createElement('div');
      subject.date = new Date(2012, 0, 1);
    });

    test('30 minutes', function() {
      var busy = record(time(0, 50), time(1, 20));
      subject._assignPosition(busy, el);

      assert.equal(el.style.top, '83.3333%', 'top');
      assert.equal(el.style.height, '50%', 'height');
      assert.match(el.className, /\bpartial-hour\b/, 'partial-hour found');
    });

    test('top of hour 1.5 hours', function() {
      var busy = record(time(), time(1, 30));
      subject._assignPosition(busy, el);

      assert.ok(!el.style.top, 'no top');
      assert.equal(el.style.height, '150%', 'height');
    });

    test('25% minutes into hour for 3.25 hours', function() {
      var busy = record(time(0, 15), time(3, 30));
      subject._assignPosition(busy, el);

      assert.equal(el.style.top, '25%', 'top');
      assert.equal(el.style.height, '325%', 'height');
    });

    test('cross the next day', function() {
      var endDate = new Date(2012, 0, 2, 11, 00);
      var busy = record(time(23, 00), endDate);
      subject._assignPosition(busy, el);

      assert.ok(!el.style.top, 'no top');
      assert.equal(el.style.height, '100%', 'height');
    });
  });

  suite('#_createRecord', function() {
    var intialHour = 5;
    var busytime;
    var event;

    setup(function() {
      var start = new Date(2012, 0, 1, intialHour);
      var end = new Date(2012, 0, 1, intialHour + 1);

      busytime = Factory('busytime', {
        startDate: start,
        endDate: end
      });

      event = Factory('event');

      subject._createRecord(intialHour, busytime, event);
    });

    test('first instance event', function() {
      var id = busytime._id;
      // find the hour
      var hour = subject.hours.get(busytime._id);
      assert.ok(hour, 'has hour record');

      // verify the flag
      var idx = hour.flags.indexOf(subject.calendarId(busytime));
      assert.ok(idx !== -1, 'has calendar id flag on hour');

      // verify its in the dom
      var elements = hour.element.querySelectorAll(
        '[data-id="' + busytime._id + '"]'
      );

      assert.length(elements, 1);

      var record = hour.records.get(id);
      assert.isTrue(record);

      // verify its in the overlaps collection
      var overlapEl = subject.overlaps.getElement(id);
      assert.equal(overlapEl, elements[0], 'has element in overlaps');
    });

    test('subsequent _createRecord calls after initial', function() {
      var max = 24 - intialHour;
      var curHour = intialHour + 1;
      var selector = '[data-id="' + busytime._id + '"]';
      var initialElement = subject.element.querySelector(
        selector
      );

      var calendarId = subject.calendarId(busytime);

      for (; curHour < max; curHour++) {
        subject._createRecord(curHour, busytime, event);

        var hour = subject.hours.get(curHour);
        // verify we didn't add another element for this hour
        var eventEl = hour.element.querySelector(selector);
        assert.ok(!eventEl, 'did not add additonal event');
        assert.include(hour.flags, calendarId);
      }
    });

    test('second event in hour', function() {
      event = Factory('event');
      busytime = Factory('busytime');

      subject._createRecord(intialHour, busytime, event);

      var hour = subject.hours.get(intialHour);
      var eventEl = hour.element.querySelector(
        '[data-id="' + busytime._id + '"]'
      );

      assert.ok(eventEl);
      assert.include(hour.flags, subject.calendarId(busytime));
    });

    test('all day events', function() {
      var type = Calendar.Calc.ALLDAY;

      event = Factory('event');
      busytime = Factory('busytime');

      subject._createRecord(type, busytime, event);

      var hour = subject.hours.get(type);

      // verify hour
      assert.ok(hour, 'has hour');

      // verify flag
      assert.ok(hour.flags, 'has flags');

      assert.include(
        hour.flags, subject.calendarId(busytime),
        'includes calendar id'
      );

      // verify dom element
      var el = hour.element.querySelector(
        '[data-id="' + busytime._id + '"]'
      );

      assert.ok(el, 'has element');

      var records = hour.records;
      var record = records.get(busytime._id);

      assert.equal(
        record.element, el,
        'allday records have element'
      );

      // verify 'allday' events are _not_ in overlap container
      assert.ok(
        !subject.overlaps.getElement(busytime),
        'in overlap'
      );
    });
  });

  suite('#remove', function() {
    function add(hour, calendarId='one') {
      var busytime = Factory('busytime');
      var event = Factory('event');

      busytime.calendarId = calendarId;
      event.calendarId = calendarId;

      subject._createRecord(hour, busytime, event);

      // find element

      var el = subject.element.querySelector(
        '[data-id="' + busytime._id + '"]'
      );

      return { busytime: busytime, event: event, element: el };
    }

    test('hour removal when renderAllHours === true', function() {
      var a = add(5);
      var b = add(5);

      var hour = subject.hours.get(5);

      assert.ok(hour.element.parentNode, 'has parent');

      subject.renderAllHours = true;

      subject.remove(a.busytime);
      subject.remove(b.busytime);

      assert.ok(hour.element.parentNode, 'does not remove parent');
    });

    test('hour removal when renderAllHours === false', function() {
      var a = add(5);
      var b = add(5);

      var hour = subject.hours.get(5);

      subject.renderAllHours = false;

      subject.remove(a.busytime);
      subject.remove(b.busytime);

      assert.ok(!hour.element.parentNode, 'remove parent');
    });

    test('remove "allday" records', function() {
      var a = add('allday');
      var b = add('allday');

      subject.remove(a.busytime);
      subject.remove(b.busytime);

      assert.ok(!a.element.parentNode, 'removed a');
      assert.ok(!b.element.parentNode, 'removed b');
    });

    test('remove hourly records', function() {
      // calendar one
      var a = add(1, 'one');
      // calendar to
      var b = add(1, 'two');
      var c = add(1, 'two');

      var hour = subject.hours.get(1);
      var hourElement = hour.element;
      var classList = hourElement.classList;
      var calendarId = subject.calendarId(b.busytime);
      var records = hour.records;

      assert.isTrue(classList.contains(calendarId), 'starts with id');
      subject.remove(c.busytime);

      assert.isTrue(
        classList.contains(calendarId),
        'does not initially remove'
      );


      //XXX: we want to verify that the class
      //id is not removed until all records
      //with the classId are removed.
      subject.remove(b.busytime);

      // now it should be removed as there are
      // no more calendar-id-1 elements
      assert.ok(
        !classList.contains(calendarId),
        'finally removes'
      );

      assert.isFalse(records.has(b.busytime._id), 'remove b');
      assert.isFalse(records.has(c.busytime._id), 'remove c');

      assert.ok(!subject.overlaps.getElement(b.busytime), 'remove overlap b');
      assert.ok(!subject.overlaps.getElement(c.busytime), 'remove overlap c');
    });
  });

  suite('#createHour', function() {
    var group;
    var children;

    setup(function() {
      subject.createHour(5);
      subject.createHour(7);
      subject.createHour(6);

      children = subject.events.children;
    });

    function hourHTML(hour) {
      return subject.template.hour.render({
        displayHour: Calendar.Calc.formatHour(hour),
        hour: hour
      });
    }

    function hasHour(number) {
      var hour = subject.hours.get(number);

      assert.ok(hour, 'should record hour: ' + number);
      assert.ok(hour.element, 'should record hours element: ' + number);
      return hour;
    }

    test('#removeHour', function() {
      var hour = hasHour(5);

      subject.removeHour(5);

      assert.ok(!hour.element.parentNode);
      assert.ok(!subject.hours.has(5));
      hour = null;
    });

    test('allday', function() {
      subject.createHour('allday');
      var parent = subject.allDayElement;
      assert.length(parent.children, 1);
    });

    test('first', function() {
      hasHour(5);

      var el = children[0];
      assert.ok(el.outerHTML);
      assert.include(el.outerHTML, hourHTML(5));
    });

    test('middle', function() {
      hasHour(6);

      var el = children[1];
      assert.ok(el.outerHTML);
      assert.include(el.outerHTML, hourHTML(6));
    });

    test('last', function() {
      hasHour(7);

      var el = children[2];
      assert.ok(el.outerHTML);
      assert.include(el.outerHTML, hourHTML(7));
    });

  });

  test('#createHour', function() {
    subject._buildElement();
    subject.createHour(1);

    var record = subject.hours.get(1);
    assert.instanceOf(record.records, OrderedMap);
  });

  suite('#add', function() {
    var calledWith;
    var length;
    var hours = [];

    setup(function() {
      hours.length = 0;
      length = undefined;

      subject._createRecord = function() {
        calledWith = Array.slice(arguments);
        hours.push(calledWith.shift());
      };
    });

    test('add multi hour event', function() {
      var event = Factory('event');
      var busytime = Factory('busytime', {
        startDate: new Date(2012, 1, 5, 5),
        endDate: new Date(2012, 1, 5, 10, 10)
      });

      subject.add(busytime, event);

      assert.deepEqual(calledWith, [busytime, event]);
      assert.deepEqual(hours, [
        5, 6, 7, 8, 9, 10
      ]);
    });

    test('add all day event', function() {
      var event = Factory('event');
      var busytime = Factory('busytime', {
        startDate: new Date(2012, 1, 5),
        endDate: new Date(2012, 1, 6)
      });

      subject.add(busytime, event);
      assert.deepEqual(calledWith, [busytime, event]);
      assert.deepEqual(hours, ['allday']);
    });

  });

  test('#removeHour', function() {
    var event = Factory('event');
    var busytime = Factory.create('busytime', {
      startDate: date
    });

    subject.add(busytime, event);

    var list = [];
    subject.hours.items.forEach(function(item) {
      list.push(item[1].element);
    });

    var displayedHours = Calendar.Calc.hoursOfOccurance(
      subject.date,
      busytime.startDate,
      busytime.endDate
    );

    displayedHours.forEach(subject.removeHour, subject);
    assert.length(subject.hours, 0);

    list.forEach(function(el) {
      assert.ok(!el.parentNode, 'removed element');
    });
  });

  test('#create', function() {
    var date = new Date(2012, 1, 1);
    var calledWith;

    var subject = new Calendar.Views.DayBased({
      app: app,
      date: date
    });

    // stub out the db interaction...
    subject._loadRecords = function() {};

    subject.changeDate = function() {
      calledWith = arguments;
      Calendar.Views.DayBased.prototype.changeDate.apply(
        this,
        arguments
      );
    };

    var el = subject.create();
    assert.equal(subject.id, date.valueOf(), 'id');

    assert.ok(el);
    assert.equal(el.tagName.toLowerCase(), 'section');
    assert.equal(calledWith[0], date);

    var hour = 0;
    var html = el.innerHTML;

    assert.ok(html, 'has html');
    assert.ok(subject.allDayElement.innerHTML, 'has all day element');

    assert.include(
      subject.allDayElement.innerHTML,
      Calendar.Calc.formatHour('allday'),
      'should have all day'
    );

    for (; hour < 24; hour++) {
      assert.include(
        html,
        Calendar.Calc.formatHour(hour),
        'should have rendered:' + hour
      );
    }
  });

  suite('#_onHourClick', function() {
    var startDate, endDate;

    setup(function() {
      var time = subject.date.getTime();
      this.sinon.stub(subject.date, 'getTime').returns(time);
      startDate = new Date(time);
      startDate.setHours(0);
      startDate.setMinutes(0);
      startDate.setSeconds(0);

      endDate = new Date(time);
      endDate.setHours(0);
      endDate.setMinutes(0);
      endDate.setSeconds(0);
    });

    teardown(function() {
      subject.date.getTime.restore();
    });

    test('should not redirect if we clicked on an event', function() {
      var clickedOnEvent = this.sinon.stub(subject, '_clickedOnEvent');
      clickedOnEvent.returns(true);
      var expectation = this.sinon.mock(subject.app).expects('go');
      expectation.never();

      subject._onHourClick({});

      expectation.verify();
      clickedOnEvent.restore();
    });

    test('should redirect and set urlparams if all day', function() {
      var clickedOnEvent = this.sinon.stub(subject, '_clickedOnEvent');
      clickedOnEvent.returns(false);
      endDate.setDate(startDate.getDate() + 1);
      var expectation =
        this.sinon.mock(subject.app)
          .expects('go')
          .withArgs('/event/add/?' + Calendar.QueryString.stringify({
            isAllDay: true,
            startDate: startDate.toString(),
            endDate: endDate.toString()
          }));
      expectation.once();

      subject._onHourClick({}, {
        getAttribute: function(key) {
          return Calendar.Calc.ALLDAY;
        }
      });

      expectation.verify();
      clickedOnEvent.restore();
    });

    test('should redirect and set urlparams if not all day', function() {
      var clickedOnEvent = this.sinon.stub(subject, '_clickedOnEvent');
      clickedOnEvent.returns(false);
      startDate.setHours(5);
      endDate.setHours(6);
      var expectation =
        this.sinon.mock(subject.app)
          .expects('go')
          .withArgs('/event/add/?' + Calendar.QueryString.stringify({
            startDate: startDate.toString(),
            endDate: endDate.toString()
          }));
      expectation.once();

      subject._onHourClick({}, {
        getAttribute: function(key) {
          return '5';
        }
      });

      expectation.verify();
      clickedOnEvent.restore();
    });
  });

  suite('activate/deactivate', function() {
    var classList;
    setup(function() {
      subject.date = new Date();
      classList = subject.element.classList;
      subject.activate();
    });

    test('#activate', function() {
      assert.isTrue(classList.contains(
        subject.activeClass
      ));
    });

    test('#deactivate', function() {
      subject.deactivate();
      assert.isFalse(classList.contains(
        subject.activeClass
      ));
    });
  });


  suite('#destroy', function() {
    var node;

    setup(function() {
      // stub out the db
      subject._loadRecords = function() {};

      node = subject.create();
      document.body.appendChild(node);
    });

    teardown(function() {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });

    test('removal of nodes and events', function() {
      assert.ok(node.parentNode);
      var observer = controller.findTimeObserver(
        subject.timespan,
        subject
      );
      assert.ok(observer > -1, 'has observer');

      subject.destroy();
      assert.ok(!node.parentNode, 'should remove parent');

      observer = controller.findTimeObserver(
        subject.timespan,
        subject
      );

      assert.equal(observer, -1, 'removes observer');
    });
  });
});
