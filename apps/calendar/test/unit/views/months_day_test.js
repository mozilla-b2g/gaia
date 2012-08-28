requireApp('calendar/test/unit/helper.js', function() {
  requireLib('timespan.js');
  requireLib('templates/day.js');
  requireLib('views/months_day.js');
});

suite('views/months_day', function() {
  var subject,
      app,
      controller,
      events,
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
  });

  test('initialization', function() {
    assert.equal(subject.controller, controller);
    assert.instanceOf(subject, Calendar.View);
    assert.equal(subject.element, document.querySelector('#months-day-view'));
    assert.equal(subject._changeToken, 0);
  });

  test('#header', function() {
    assert.ok(subject.header);
  });

  test('#events', function() {
    assert.ok(subject.events);
  });

  suite('#handleEvent', function() {

    test('selectedDayChange', function() {
      var date = new Date(2012, 1, 1);
      var calledWith;

      subject.changeDate = function() {
        calledWith = arguments;
      }

      subject.controller.selectedDay = date;
      assert.equal(
        calledWith[0],
        date,
        'should change date in view when controller changes'
      );
    });

  });

  suite('#changeDate', function() {
    var startTime = new Date(2012, 1, 1);
    var endTime = new Date(2012, 1, 2);
    var calledLoadWith;
    var updateCalledWith;

    endTime.setMilliseconds(-1);

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

      subject.changeDate(startTime);
      assert.equal(subject.events.innerHTML, '');

      assert.equal(subject.currentDate, startTime);
      assert.ok(calledLoadWith, 'loads records');
      assert.ok(updateCalledWith);

      assert.equal(
        subject._changeToken, 1, 'should increment token'
      );

      assert.deepEqual(
        subject.timespan,
        new Calendar.Timespan(startTime, endTime)
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

  suite('#_renderList', function() {
    var list;
    var groups;

    function hour(hours, min) {
      return new Date(2012, 1, 2, hours, min);
    }

    function groupAdd(group, idx) {
      var item = list[idx];
      groups[group][0].push(item);
      groups[group][1].push(item[0].calendarId);
    }

    setup(function() {
      list = [];
      groups = {
        0: [[], []],
        5: [[], []],
        6: [[], []],
        7: [[], []],
        21: [[], []],
        22: [[], []],
        23: [[], []]
      };

      // starts on a different day
      // occurs in first hour (midnight)
      list.push([
        Factory('busytime', {
          startDate: new Date(2012, 1, 1, 15),
          endDate: hour(0, 40)
        })
      ]);

      groupAdd(0, 0);

      // same day skip some hours
      // this should not render into
      // the 6th hour only 5th
      list.push([
        Factory('busytime', {
          startDate: hour(5, 00),
          endDate: hour(6, 00)
        })
      ]);

      groupAdd(5, 1);


      // Also on fifth hour
      // but occurs a little later
      // should come after the above
      list.push([
        Factory('busytime', {
          startDate: hour(5, 15),
          endDate: hour(6, 00)
        })
      ]);

      groupAdd(5, 2);


      // multi hour
      // occurs in 5th & 6th & 7th hour.
      list.push([
        Factory('busytime', {
          startDate: hour(5, 30),
          endDate: hour(8, 00)
        })
      ]);

      groupAdd(5, 3);
      groupAdd(6, 3);
      groupAdd(7, 3);

      // ends on a different day
      // but not an all day event.
      // starts on 21st hour
      // ends on 23rd
      list.push([
        Factory('busytime', {
          startDate: hour(21, 00),
          endDate: new Date(2012, 1, 3, 1)
        })
      ]);

      groupAdd(21, 4);
      groupAdd(22, 4);
      groupAdd(23, 4);
    });

    var calledHours;

    setup(function() {
      calledHours = {};
      subject._renderHour = function(hour, group, ids) {
        calledHours[hour] = [group, ids];
      };
    });

    test('#_renderList', function() {
      subject.currentDate = new Date(2012, 1, 2);

      subject._renderList(list);

      assert.deepEqual(
        calledHours,
        groups,
        'should render hours in order, see setup block'
      );
    });

  });

  suite('#_loadRecords', function() {
    var storeCalledWith;
    var queryCalledWith;
    var renderCalledWith;
    var list = [];

    setup(function() {
      storeCalledWith = [];
      renderCalledWith = [];
      queryCalledWith = [];

      controller.queryCache = function() {
        queryCalledWith.push(arguments);
      }

      subject._renderList = function() {
        renderCalledWith.push(arguments);
      }

      events.findByAssociated = function() {
        storeCalledWith.push(arguments);
      }
    });

    test('when token changes midway', function() {
      subject.changeDate(new Date());
      subject.changeDate(new Date());

      assert.equal(storeCalledWith.length, 2);
      assert.equal(renderCalledWith.length, 0);

      // now that token has changed
      // we don't care about this and so
      // it should do nothing...
      storeCalledWith[0][1](null, list);
      assert.equal(renderCalledWith.length, 0);

      // should fire when the correct set of
      // changes is loaded...
      storeCalledWith[1][1](null, list);
      assert.deepEqual(renderCalledWith[0], [list]);
    });

    test('when change token is same', function() {
      // this fires _load
      subject.changeDate(new Date());

      assert.ok(storeCalledWith.length);
      assert.ok(!renderCalledWith.length);

      assert.equal(
        queryCalledWith[0][0],
        subject.timespan
      );

      storeCalledWith[0][1](null, list);
      assert.deepEqual(renderCalledWith[0], [list]);
    });

  });

  suite('#_renderHour', function() {
    var group;

    setup(function() {
      group = [];
      group.push([
        Factory.create('busytime', {
          startDate: new Date(2012, 1, 1, 5),
          endDate: new Date(2012, 1, 1, 6)
        }),
        Factory.create('event')
      ]);

      group.push([
        Factory.create('busytime', {
          startDate: new Date(2012, 1, 1, 5, 30),
          endDate: new Date(2012, 1, 1, 8)
        }),
        Factory.create('event')
      ]);
    });

    test('output', function() {
      subject._renderHour(5, group, ['1', '2']);
      var children = subject.events.children;
      assert.equal(children.length, 1);

      var el = children[0];
      assert.ok(el.outerHTML);
      var html = el.outerHTML;

      assert.include(html, 'calendar-id-1');
      assert.include(html, 'calendar-id-2');

      assert.include(
        html,
        subject._formatHour(5)
      );

      assert.include(
        html,
        subject._renderEvent(group[0][1])
      );

      assert.include(
        html,
        subject._renderEvent(group[1][1])
      );
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
    subject.currentDate = date;
    subject._updateHeader();

    assert.include(el.innerHTML, '11');
    assert.include(el.innerHTML, 'May');
    assert.include(el.innerHTML, 'Friday');
  });

  test('#render', function() {
    var calledWith;
    subject.changeDate = function() {
      calledWith = arguments;
    }
    subject.render();
    assert.ok(calledWith);
  });

  test('#onfirstseen', function() {
    assert.equal(subject.onfirstseen, subject.render);
  });

});
