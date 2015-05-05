define(function(require) {
'use strict';

var Abstract = require('store/abstract');
var AccountModel = require('models/account');
var Calc = require('common/calc');
var CalendarModel = require('models/calendar');
var Factory = require('test/support/factory');
var core = require('core');

suite('store/event', function() {
  var subject;
  var db;
  var id = 0;

  function event(date) {
    if (typeof(date) === 'undefined') {
      date = new Date();
    }

    return Factory('event', { remote: { startDate: date, _id: ++id } });
  }

  setup(function(done) {
    id = 0;
    db = core.db;
    subject = core.storeFactory.get('Event');

    db.open(function(err) {
      assert.ok(!err);
      done();
    });
  });

  testSupport.calendar.accountEnvironment();

  teardown(function(done) {
    testSupport.calendar.clearStore(
      core.db,
      [
        'accounts', 'calendars', 'events',
        'busytimes', 'icalComponents'
      ],
      function() {
        db.close();
        done();
      }
    );
  });

  test('initialization', function() {
    assert.instanceOf(subject, Abstract);
    assert.equal(subject._store, 'events');
  });

  test('#_createModel', function() {
    var input = Factory.build('event');
    var output = subject._createModel(input, 1);
    assert.equal(output._id, 1);
    assert.equal(output.name, output.name);

    assert.deepEqual(
      output.remote.startDate,
      Calc.dateFromTransport(output.remote.start),
      'startDate'
    );

    assert.deepEqual(
      output.remote.endDate,
      Calc.dateFromTransport(output.remote.end),
      'endDate'
    );
  });

  suite('#(x)For', function() {
    var event;

    setup(function(done) {
      event = Factory('event', {
        calendarId: this.calendar._id
      });

      subject.persist(event, done);
    });

    test('#ownersOf', function(done) {
      subject.ownersOf(event, (err, owners) => {
        done(() => {
          assert.instanceOf(owners.account, AccountModel);
          assert.instanceOf(owners.calendar, CalendarModel);
          assert.equal(owners.account._id, this.account._id, 'account id');
          assert.equal(owners.calendar._id, this.calendar._id, 'calendar id');
        });
      });
    });

    test('#providerFor', function(done) {
      subject.providerFor(event, function(err, provider) {
        assert.equal(
          provider,
          core.providerFactory.get('Mock')
        );
        done();
      });
    });

  });

  suite('#eventsForCalendar', function() {
    var inCal;
    var outCal;

    setup(function(done) {
      inCal = Factory('event', {
        calendarId: 1
      });

      subject.persist(inCal, done);
    });

    setup(function(done) {
      outCal = Factory('event', {
        calendarId: 2
      });

      subject.persist(outCal, done);
    });

    test('result', function(done) {
      subject.eventsForCalendar(1, function(err, result) {
        done(function() {
          assert.ok(!err);
          assert.deepEqual(
            result,
            [inCal]
          );
        });
      });
    });

  });

  suite('#findByIds', function() {
    var events = {};

    function persist() {
      setup(function(done) {
        var item = event();
        events[item._id] = item;
        subject.persist(item, done);
      });

    }

    persist();
    persist();
    persist();
    persist();

    test('result', function(done) {
      var ids = Object.keys(events);
      ids.push('random-not-here');

      subject.findByIds(ids, function(err, items) {
        done(function() {
          assert.equal(
            Object.keys(items).length,
            4,
            'should find all items'
          );

          for (var id in events) {
            assert.deepEqual(
              items[id],
              events[id],
              'should find event with id ' + id
            );
          }
        });
      });
    });

  });

  suite('#remove', function() {

    //TODO: busytime removal tests?
    //
    suite('remove ical component', function() {
      var component;
      var event;
      var componentStore;

      setup(function(done) {
        componentStore = core.storeFactory.get('IcalComponent');
        event = Factory('event');
        component = Factory('icalComponent', {
          eventId: event._id
        });

        var trans = core.db.transaction(
          ['events', 'icalComponents'],
          'readwrite'
        );

        trans.oncomplete = function() {
          done();
        };

        subject.persist(event, trans);
        componentStore.persist(component, trans);
      });

      setup(function(done) {
        subject.remove(event._id, done);
      });

      test('after removing the event', function(done) {
        componentStore.get(event._id, function(err, result) {
          done(function() {
            assert.ok(!result, 'removes component');
          });
        });
      });
    });

    suite('parent items /w children', function() {
      var parentId = 'parentStuff';
      var childId = 'child';
      var id = 'foobar1';

      setup(function(done) {
        var item = Factory('event', {
          _id: parentId
        });

        subject.persist(item, done);
      });

      setup(function(done) {
        subject.persist(
          Factory('event', { _id: childId, parentId: id }),
          done
        );
      });

      setup(function(done) {
        subject.remove(id, done);
      });

      test('removes parent event', function(done) {
        subject.get(parentId, function() {
          done(function(err, result) {
            assert.ok(!err);
            assert.ok(!result);
          });
        });
      });

      test('removes child event', function(done) {
        subject.get(childId, function() {
          done(function(err, result) {
            assert.ok(!err);
            assert.ok(!result);
          });
        });
      });
    });
  });

  suite('#removeByIndex', function() {
    var busytime;
    var byCalendar = {};

    setup(function() {
      byCalendar = {};
    });

    function persistEvent(calendarId) {
      setup(function(done) {
        var event = Factory('event', {
          calendarId: calendarId
        });

        if (!(calendarId in byCalendar)) {
          byCalendar[calendarId] = [];
        }

        byCalendar[calendarId].push(event._id);
        subject.persist(event, done);
      });
    }

    persistEvent(1);
    persistEvent(1);
    persistEvent(2);

    setup(function(done) {
      busytime = core.storeFactory.get('Busytime');
      subject.get(byCalendar[2][0], function(err, result) {
        done(function() {
          assert.ok(result, 'has control event');
        });
      });
    });

    test('removed all events for 1', function(done) {
      subject.removeByIndex('calendarId', 1, function() {
        assert.ok(
          !busytime._byEventId[byCalendar[1][0]],
          'should remove events from busytime'
        );

        assert.ok(
          !busytime._byEventId[byCalendar[1][1]],
          'should remove events from busytime'
        );

        subject.get(byCalendar[2][0], function(err, result) {
          done(function() {
            assert.ok(!err);
            assert.ok(result, 'should not remove control');
          });
        });
      });
    });
  });
});

});
