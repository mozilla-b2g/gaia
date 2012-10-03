requireApp('calendar/test/unit/helper.js', function() {
  requireLib('timespan.js');
  requireLib('ordered_map.js');
  requireLib('templates/day.js');
  requireLib('views/day_based.js');
  requireLib('views/day_child.js');
});

suite('views/day_child', function() {
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

    subject = new Calendar.Views.DayChild({
      app: app,
      date: viewDate
    });

    template = Calendar.Templates.Day;
  });

  test('initialization', function() {
    assert.equal(subject.controller, controller);
    assert.instanceOf(subject, Calendar.View);
    assert.instanceOf(subject, Calendar.Views.DayBased);
    assert.equal(subject._changeToken, 0);
  });

  test('#events', function() {
    subject.create();
    assert.ok(subject.events);

    assert.ok(
      subject.events.classList.contains('day-events')
    );

    assert.equal(
      subject.events.tagName.toLowerCase(),
      'section'
    );
  });

  suite('#changeDate', function() {
    var startTime = new Date(2012, 1, 1);
    var calledLoadWith;

    setup(function() {
      calledLoadWith = false;

      subject.create();

      subject._loadRecords = function() {
        calledLoadWith = arguments;
      }

      subject.events.innerHTML = 'foobar';
    });

    test('from clean state', function() {
      assert.equal(subject._changeToken, 1);
      var day = Calendar.Calc.createDay(startTime);

      subject.changeDate(startTime);

      assert.deepEqual(subject.date, day);
      assert.equal(subject.events.innerHTML, '');

      assert.deepEqual(subject.date, day);
      assert.ok(calledLoadWith, 'loads records');

      assert.equal(
        subject._changeToken, 2, 'should increment token'
      );

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
      subject.changeDate(new Date());
      var oldRange = subject.timespan;

      subject.changeDate(startTime);

      assert.equal(subject._changeToken, 3);

      var eventIdx = controller.findTimeObserver(
        oldRange, subject
      );

      assert.ok(
        eventIdx === -1,
        'should remove old observers'
      );
    });

  });

  suite('#_loadRecords', function() {
    var storeCalledWith;
    var addCalledWith;
    var list = [];

    setup(function() {
      list = [
        [1, 1],
        [2, 2]
      ];

      // build tree without updating it
      subject._buildElement();

      storeCalledWith = [];
      addCalledWith = [];

      subject.add = function() {
        addCalledWith.push(arguments);
      }

      events.findByAssociated = function() {
        storeCalledWith.push(arguments);
      }
    });

    test('when token changes midway', function() {

      subject.changeDate(new Date());
      subject.changeDate(new Date());

      assert.equal(storeCalledWith.length, 2);
      assert.equal(addCalledWith.length, 0);

      // now that token has changed
      // we don't care about this and so
      // it should do nothing...
      storeCalledWith[0][1](null, list);
      assert.equal(addCalledWith.length, 0);

      // should fire when the correct set of
      // changes is loaded...
      storeCalledWith[1][1](null, list);
      assert.deepEqual(addCalledWith[0], list[0]);
    });

    test('when change token is same', function() {
      // this fires _load
      subject.changeDate(new Date());

      assert.ok(storeCalledWith.length);
      assert.ok(!addCalledWith.length);

      storeCalledWith[0][1](null, list);
      assert.deepEqual(addCalledWith[0], list[0]);
      assert.deepEqual(addCalledWith[1], list[1]);
    });

  });

  suite('#_insertRecord', function() {
    var children;
    var hourElement;
    var eventElement;
    var busytimes;
    var events;
    var records;
    var date = new Date(2012, 1, 5);
    var hourRecord;
    var hour = 5;

    function event(name, calendarId, first, end) {
      var id = first.valueOf() + '-id-' + name;

      events[name] = Factory('event', {
        _id: name,
        remote: {
          calendarId: calendarId,
          endDate: first,
          endDate: end
        }
      });

      busytimes[name] = Factory('busytime', {
        _id: id,
        calendarId: calendarId,
        startDate: first,
        endDate: end
      });

      subject.createRecord(
        hour,
        busytimes[name],
        events[name]
      );

      assert.ok(records.has(id));
      assert.ok(records.get(id).element);

      var classList = hourElement.classList;
      var classId = subject.calendarId(busytimes[name]);

      var idx = hourRecord.flags.indexOf(classId);

      assert.ok(idx !== -1, 'should add flag to hour');
      assert.ok(
        classList.contains(classId),
        name + ' should contain class list - ' + classId
      );
    }

    setup(function() {
      // build dom tree without updating it...
      subject._buildElement();

      subject.createHour(hour);
      hourRecord = subject.hours.get(hour);
      hourElement = hourRecord.element;
      records = hourRecord.records;

      events = {};
      busytimes = {};

      subject.timespan = Calendar.Calc.spanOfDay(
        date
      );

      event(
        'first',
        3,
        new Date(2012, 1, 5, 30),
        new Date(2012, 1, 6)
      );

      event(
        'second',
        1,
        new Date(2012, 1, 5),
        new Date(2012, 1, 6)
      );

      event(
        'last',
        1,
        new Date(2012, 1, 5, 10),
        new Date(2012, 1, 6)
      );

      eventElement = hourElement.querySelector(
        Calendar.Templates.Day.hourEventsSelector
      );

      children = eventElement.children;
    });

    suite('#_removeRecord', function() {

      test('remove all elements', function() {
        subject.remove(busytimes.first);
        subject.remove(busytimes.second);
        subject.remove(busytimes.last);

        assert.ok(!hourElement.parentNode, 'should remove hour');
      });

      test('remove some records', function() {
        var classList = hourElement.classList;
        var calendarId = subject.calendarId(busytimes.second);

        subject.remove(busytimes.last);
        assert.isTrue(classList.contains(calendarId));

        //XXX: we want to verify that the class
        //id is not removed until all records
        //with the classId are removed.
        subject.remove(busytimes.second);

        assert.ok(hourElement.parentNode, 'should not remove hour element');

        // now it should be removed as there are
        // no more calendar-id-1 elements
        assert.ok(!classList.contains(calendarId));

        assert.isFalse(records.has(busytimes.last._id), 'remove last');
        assert.isFalse(records.has(busytimes.second._id), 'remove second');


        assert.deepEqual(
          children[0].outerHTML,
          subject._renderEvent(events.first),
          'third el - first element'
        );
      });

    });

    test('output', function() {
      var record = subject.hours.get(5);
      var eventRecords = record.records;

      var el = record.element;

      assert.deepEqual(
        children[0].outerHTML,
        subject._renderEvent(events.second),
        'first el - second event'
      );

      assert.deepEqual(
        children[1].outerHTML,
        subject._renderEvent(events.last),
        'second el - last element'
      );

      assert.deepEqual(
        children[2].outerHTML,
        subject._renderEvent(events.first),
        'third el - first element'
      );

    });
  });

  suite('#_insertHour', function() {
    var group;
    var children;

    setup(function() {
      subject._buildElement();

      subject.createHour(5);
      subject.createHour(7);
      subject.createHour(6);

      children = subject.events.children;
    });

    function hourHTML(hour) {
      return template.hour.render({
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

  test('#_renderAttendees', function() {
    var list = ['z', 'y'],
        result = subject._renderAttendees(list);

    assert.include(result, '>z<');
    assert.include(result, '>y<');
  });

  test('#_renderEvent', function() {
    var data = Factory('event', {
      remote: {
        title: 'UX',
        location: 'Paris',
        attendees: ['zoo', 'barr']
      }
    });

    var result = subject._renderEvent(data);
    assert.ok(result);

    assert.include(result, 'UX');
    assert.include(result, 'Paris');
    assert.include(result, '>zoo<');
    assert.include(result, '>barr<');
  });

  test('#create', function() {
    var date = new Date(2012, 1, 1);
    var calledWith;

    var subject = new Calendar.Views.DayChild({
      app: app,
      date: date
    });

    subject.changeDate = function() {
      calledWith = arguments;
      Calendar.Views.DayChild.prototype.changeDate.apply(
        this,
        arguments
      );
    }

    var el = subject.create();

    assert.ok(el);
    assert.equal(el.tagName.toLowerCase(), 'section');
    assert.equal(calledWith[0], date);

    var hour = 0;
    var html = el.innerHTML;
    assert.ok(html);

    assert.include(
      html,
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

  suite('activate/deactivate', function() {
    var classList;
    setup(function() {
      subject.date = new Date();
      subject.create();
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
