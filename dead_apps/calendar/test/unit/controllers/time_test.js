define(function(require) {
'use strict';

var Responder = require('common/responder');
var TimeController = require('controllers/time');
var core = require('core');

window.page = window.page || {};

suite('Controllers.Time', function() {
  var subject;
  var busytimeStore;
  var db;

  setup(function(done) {
    subject = new TimeController();

    subject.calendarStore = {
      shouldDisplayCalendar: function(id) {
        return true;
      },
      on: function() {}
    };

    busytimeStore = core.storeFactory.get('Busytime');
    db = core.db;

    db.open(function() {
      done();
    });
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      core.db,
      ['events', 'busytimes', 'alarms'],
      done
    );
  });

  teardown(function() {
    core.db.close();
  });

  test('initialize', function() {
    assert.instanceOf(subject, Responder);
  });

  suite('#handleEvent', function() {

    test('switching between days', function() {
      function type() {
        return subject.mostRecentDayType;
      }

      subject.selectedDay = new Date(2012, 1, 5);

      assert.deepEqual(
        subject.mostRecentDay,
        subject.selectedDay,
        'mostRecentDay - selected day'
      );

      assert.equal(
        type(),
        'selectedDay',
        '"selectedDay" change should update type'
      );

      subject.move(new Date(2012, 1, 10));

      assert.equal(
        type(), 'day',
        'move - sets most recent type'
      );

      assert.deepEqual(
        subject.mostRecentDay,
        subject.position,
        'mostRecentDay - day'
      );

      // back & forth
      subject.move(new Date(2012, 1, 15));
      assert.equal(type(), 'day');
      subject.selectedDay = new Date(2012, 1, 20);
      assert.equal(type(), 'selectedDay');
    });

  });

  test('#scale', function() {
    var calledWith;

    subject.on('scaleChange', function() {
      calledWith = Array.slice(arguments);
    });

    subject.scale = 'year';
    assert.deepEqual(calledWith, ['year', null]);
    calledWith = null;
    subject.scale = 'year';
    assert.isNull(calledWith, 'should not trigger change when value is same');

    subject.scale = 'day';

    assert.deepEqual(
      calledWith,
      ['day', 'year']
    );
  });

  test('#moveToMostRecentDay', function() {
    var date = new Date();
    var calledMove;

    subject.move(date);

    subject.move = function() {
      TimeController.prototype.move.apply(this, arguments);
      calledMove = arguments;
    };

    subject.selectedDay = new Date(2012, 1, 1);
    subject.moveToMostRecentDay();

    assert.equal(
      calledMove[0],
      subject.selectedDay,
      'should move to selected day'
    );

    calledMove = null;

    subject.moveToMostRecentDay();
    assert.ok(!calledMove, 'should not move when "day" was last changed');
  });

  test('#selectedDay', function() {
    var calledWith;

    subject.on('selectedDayChange', function() {
      calledWith = arguments;
    });

    var date = new Date(2012, 1, 1);
    subject.selectedDay = date;

    assert.equal(calledWith[0], date);
    assert.equal(subject.selectedDay, date);

    calledWith = null;

    // try and set it again with same object...
    subject.selectedDay = new Date(2012, 1, 1);
    assert.isNull(calledWith, 'should not fire event when day is same');

    var newDate = new Date(2012, 1, 2);

    subject.selectedDay = newDate;
    assert.equal(subject.selectedDay, newDate);
    assert.equal(calledWith[0], newDate);
    assert.equal(calledWith[1], date);
  });

  suite('#move', function() {
    var events;
    var date;

    function clearEvents() {
      events = {
        year: [],
        month: [],
        day: []
      };
    }

    setup(function() {
      clearEvents();
      date = new Date(2012, 5, 5);

      var handle = {
        handleEvent: function(e) {
          var name = e.type.replace('Change', '');
          events[name].push(e.data[0]);
        }
      };

      subject.on('yearChange', handle);
      subject.on('monthChange', handle);
      subject.on('dayChange', handle);

      subject.move(date);
    });

    function fires(type, value) {
      var eventValue = events[type][0];

      assert.deepEqual(
        eventValue, value, 'fires: ' + type + ' change'
      );

      assert.deepEqual(
        subject[type],
        value,
        'should update .' + type
      );
    }

    function doesNotFire(type) {
      assert.deepEqual(
        events[type],
        []
      );
    }

    test('initial move', function() {
      fires('year', new Date(2012, 0, 1));
      fires('month', new Date(2012, 5, 1));
      fires('day', new Date(2012, 5, 5));
    });

    test('move day', function() {
      clearEvents();

      subject.move(new Date(2012, 5, 6));

      doesNotFire('year');
      doesNotFire('month');
      fires('day', new Date(2012, 5, 6));
    });

    test('move month', function() {
      clearEvents();

      subject.move(new Date(2012, 8, 6));

      doesNotFire('year');
      fires('month', new Date(2012, 8, 1));
      fires('day', new Date(2012, 8, 6));
    });

    test('move into the past', function() {
      clearEvents();

      subject.move(new Date(2011, 5, 4));

      fires('year', new Date(2011, 0, 1));
      fires('month', new Date(2011, 5, 1));
      fires('day', new Date(2011, 5, 4));
    });
  });

});

});
