requireApp('calendar/test/unit/helper.js', function() {
  requireLib('timespan.js');
  requireLib('ordered_map.js');
  requireLib('templates/day.js');
  requireLib('views/day_based.js');
  requireLib('views/day_child.js');
});

suite('views/day_child', function() {
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

    subject = new Calendar.Views.DayChild({
      app: app
    });

    template = Calendar.Templates.Day;
  });

  test('initialization', function() {
    assert.equal(subject.controller, controller);
    assert.instanceOf(subject, Calendar.View);
    assert.instanceOf(subject, Calendar.Views.DayBased);
    assert.equal(subject._changeToken, 0);
  });

  test('#header', function() {
    assert.ok(subject.header);
  });

  test('#events', function() {
    assert.ok(subject.events);
  });

  suite('#changeDate', function() {
    var startTime = new Date(2012, 1, 1);
    var calledLoadWith;
    var updateCalledWith;

    setup(function() {
      calledLoadWith = false;
      updateCalledWith = false;

      subject._loadRecords = function() {
        calledLoadWith = arguments;
      }

      subject._updateHeader = function() {
        updateCalledWith = arguments;
      }

      subject.events.innerHTML = 'foobar';
    });

    test('from clean state', function() {
      assert.equal(subject._changeToken, 0);
      var day = Calendar.Calc.createDay(startTime);

      subject.changeDate(startTime);

      assert.deepEqual(subject.date, day);
      assert.equal(subject.events.innerHTML, '');

      assert.deepEqual(subject.date, day);
      assert.ok(calledLoadWith, 'loads records');
      assert.ok(updateCalledWith);

      assert.equal(
        subject._changeToken, 1, 'should increment token'
      );

      assert.deepEqual(
        subject.timespan,
        Calendar.Calc.spanOfDay(day)
      );

      var eventIdx = controller.findTimeObserver(subject.timespan, subject);

      assert.ok(
        eventIdx !== -1,
        'should have busytime observer'
      );
    });

    test('from second change', function() {
      subject.changeDate(new Date());
      var oldRange = subject.timespan;

      subject.changeDate(startTime);

      assert.equal(subject._changeToken, 2);

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
      subject.createHour(5);
      subject.createHour(7);
      subject.createHour(6);

      children = subject.events.children;
    });

    function hourHTML(hour) {
      return template.hour.render({
        displayHour: subject._formatHour(hour),
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

  test('#create', function() {
    var date = new Date(2012, 1, 1);
    var calledWith;

    var subject = new Calendar.Views.DayChild({
      app: app,
      date: date
    });

    subject.changeDate = function() {
      calledWith = arguments;
    }

    var el = subject.create();

    assert.ok(el);
    assert.equal(el.tagName.toLowerCase(), 'section');
    assert.equal(calledWith[0], date);
  });

  test('#destroy', function() {
    var date = new Date();
    var subject = new Calendar.Views.DayChild({
      app: app,
      date: date
    });
  });

});
