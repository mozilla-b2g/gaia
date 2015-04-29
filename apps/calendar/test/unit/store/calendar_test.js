define(function(require) {
'use strict';

var Abstract = require('store/abstract');
var AccountModel = require('models/account');
var CalendarError = require('common/error');
var CalendarModel = require('models/calendar');
var CalendarStore = require('store/calendar');
var Factory = require('test/support/factory');
var Local = require('provider/local');
var providerFactory = require('provider/provider_factory');

suite('store/calendar', function() {
  var subject;
  var db;
  var model;
  var app;

  setup(function(done) {
    app = testSupport.calendar.app();
    db = app.db;

    subject = db.getStore('Calendar');

    model = Factory('calendar', {
      _id: 1,
      remote: { id: 'uuid' },
      accountId: 'acc1'
    });

    db.open(function(err) {
      assert.ok(!err);
      done();
    });
  });

  testSupport.calendar.accountEnvironment();

  teardown(function(done) {
    testSupport.calendar.clearStore(
      db,
      ['accounts', 'calendars', 'events', 'busytimes'],
      done
    );
  });

  teardown(function() {
    db.close();
  });

  test('initialization', function() {
    assert.instanceOf(subject, Abstract);
    assert.equal(subject._store, 'calendars');
    assert.equal(subject.db, db);
  });

  suite('cache handling', function() {
    setup(function() {
      subject._addToCache(model);
    });

    test('#_addToCache', function() {
      assert.equal(subject._cached[1], model);
    });

    test('#_removeFromCache', function() {
      subject._removeFromCache(1);
      assert.ok(!subject._cached[1]);
    });
  });

  suite('#markWithError', function() {
    var calendar;

    setup(function(done) {
      calendar = Factory('calendar');
      subject.persist(calendar, done);
    });

    test('success', function(done) {
      var err = new CalendarError.Authentication();
      subject.markWithError(calendar, err, function(markErr) {
        assert.ok(!markErr);
        subject.get(calendar._id, function(getErr, result) {
          done(function() {
            assert.ok(result.error, 'has error');
            assert.equal(result.error.name, err.name, 'set error');
          });
        });
      });
    });
  });

  suite('#persist', function() {
    var stubUpdateColor;

    setup(function() {
      stubUpdateColor = sinon.stub(subject, '_updateCalendarColor');
    });

    teardown(function() {
      stubUpdateColor.restore();
    });

    test('error case', function(done) {
      var sample = Factory.create('calendar');

      subject.persist(sample, function(err, data) {
        sinon.assert.calledOnce(stubUpdateColor);
        sinon.assert.calledWith(stubUpdateColor, sample);
        done();
      });
    });
  });

  suite('#_createModel', function() {
    var remote = {};

    test('with id', function() {
      var result = subject._createModel({
        remote: remote
      }, 'id');

      assert.equal(result.remote, remote);
      assert.equal(result._id, 'id');
      assert.instanceOf(result, CalendarModel);
    });

    test('without id', function() {
      var result = subject._createModel({
        remote: remote
      });

      assert.equal(result.remote, remote);
      assert.isFalse(('_id' in result));
    });
  });

  suite('#remotesByAccount', function() {
    var expected;
    var models = testSupport.calendar.dbFixtures('calendar', 'Calendar', {
      one: { accountId: 1, remote: { id: 'one' } },
      two: { accountId: 1, remote: { id: 'two' } },
      three: { accountId: 2, remote: { id: 'three' } }
    });

    setup(function(done) {
      subject.persist(model, done);
    });

    function verify(accountId, done) {
      subject.remotesByAccount(accountId, function(err, list) {
        if (err) {
          done(err);
        }

        done(function() {
          var expectedIds = Object.keys(expected).sort();
          assert.deepEqual(
            Object.keys(list).sort(),
            expectedIds,
            'has same keys'
          );

          expectedIds.forEach(function(id) {
            assert.hasProperties(
              expected[id],
              list[id],
              id
            );
          });
        });
      });
    }

    test('one calendar', function(done) {
      expected = {
        three: models.three
      };

      verify(2, done);
    });

    test('no calendars', function(done) {
      expected = {};

      verify(3, done);
    });

    test('multiple calendars', function(done) {
      expected = {
        one: models.one,
        two: models.two
      };

      verify(1, done);
    });
  });

  suite('#sync - provider skip', function() {
   var account, calendar;

    setup(function() {
      account = Factory('account', { providerType: 'Local' });

      calendar = Factory('calendar', {
        _id: 1,
        lastEventSyncToken: null,
        remote: { syncToken: 'synced' }
      });

    });

    setup(function(done) {
      subject.db.getStore('Account').persist(account, done);
    });

    setup(function(done) {
      subject.persist(calendar, done);
    });

    test('result', function(done) {
      // should not sync because local cannot sync
      subject.sync(account, calendar, function() {
        done();
      });
    });

  });

  suite('#remove', function() {
    var eventStore;
    var stubRemoveColor;

    var model;
    var events;

    setup(function(done) {
      // setup fixtures
      eventStore = subject.db.getStore('Event');
      events = {};

      // transaction for initial creation of records.
      var trans = subject.db.transaction(
        subject._dependentStores,
        'readwrite'
      );

      // setup calendars
      model = Factory('calendar', { accountId: 1 });
      subject.persist(model, trans);

      // setup events
      events[1] = Factory('event', { calendarId: model._id });
      events[2] = Factory('event', { calendarId: 'some-other' });

      // we will eventually remove this record.
      eventStore.persist(events[1], trans);

      // this is our control to ensure
      // we are not removing extra stuff
      eventStore.persist(events[2], done);

      trans.addEventListener('complete', function() {
        done();
      });
    });

    setup(function() {
      stubRemoveColor = sinon.stub(subject, '_removeCalendarColorFromCache');
    });

    teardown(function() {
      stubRemoveColor.restore();
    });

    setup(function(done) {
      subject.remove(model._id, function() {
        eventStore.count(function(err, count) {
          assert.equal(count, 1);
          sinon.assert.calledOnce(stubRemoveColor);
          sinon.assert.calledWith(stubRemoveColor, model._id);
          done();
        });
      });
    });

    test('after remove', function(done) {
      eventStore.get(events[1]._id, function(err, result) {
        done(function() {
          assert.ok(!result);
        });
      });
    });
  });

  suite('#ownersOf', function() {

    test('given an id', function(done) {
      var id = this.calendar._id;
      subject.ownersOf(id, (err, owners) => {
        done(() => {
          assert.instanceOf(owners.account, AccountModel);
          assert.instanceOf(owners.calendar, CalendarModel);
          assert.equal(owners.account._id, this.account._id, 'account id');
          assert.equal(owners.calendar._id, this.calendar._id, 'calendar id');
        });
      });
    });

  });


  test('#providerFor', function(done) {
    subject.providerFor(this.calendar, function(err, provider) {
      done(function() {
        assert.equal(provider, providerFactory.get('Mock'));
      });
    });
  });

  suite('#_updateCalendarColor', function(done) {
    var palette = CalendarStore.REMOTE_COLORS;

    function resetUsedColors() {
      subject._usedColors.length = 0;
    }

    setup(resetUsedColors);
    teardown(resetUsedColors);

    test('> local calendar', function() {
      var calendar = Factory('calendar', {
        color: '#BADA55',
        _id: Local.calendarId
      });
      subject._updateCalendarColor(calendar);
      assert.equal(
        calendar.color,
        CalendarStore.LOCAL_COLOR,
        'should use local calendar color'
      );
    });

    suite('> remote calendars', function() {
      suite('> add', function() {
        test('return first unused color from palette', function() {
          assert.ok(palette.length, 'palette');

          palette.forEach(function(color) {
            assert.ok(
              subject._usedColors.indexOf(color) === -1,
              'should not repeat color ' + color
            );

            // it will ignore color from the remote and use color from palette
            // instead
            var calendar = { color: '#00FFCC' };
            subject._updateCalendarColor(calendar);
            assert.equal(
              calendar.color,
              color,
              'color should match'
            );

            assert.ok(
              subject._usedColors.indexOf(color) !== -1,
              'should update the used colors ' + color
            );
          });
        });
      });

      suite('> many calendars', function() {
        setup(function() {
          subject._usedColors = palette.slice(0, palette.length - 1);
        });

        test('loop colors if too many calendars', function() {
          var calendar;

          calendar = {};
          subject._updateCalendarColor(calendar);
          assert.equal(
            calendar.color,
            palette[palette.length - 1],
            'last color'
          );

          calendar = {};
          subject._updateCalendarColor(calendar);
          assert.equal(
            calendar.color,
            palette[0],
            'first color'
          );

          calendar = {};
          subject._updateCalendarColor(calendar);
          assert.equal(
            calendar.color,
            palette[1],
            'second color'
          );
        });
      });

      suite('> update', function() {
        var foo, bar;

        setup(function() {
          foo = { color: palette[3], _id: 'foo' };
          bar = { color: '#F00', _id: 'bar' };
          subject._cached.foo = foo;
          subject._cached.bar = bar;
          subject._usedColors = [foo.color, bar.color];
        });

        teardown(function() {
          delete subject._cached.foo;
          delete subject._cached.bar;
        });

        teardown(resetUsedColors);

        test('keep previous color if from palette', function() {
          subject._updateCalendarColor(foo);
          assert.equal(
            foo.color,
            palette[3],
            'should keep same color'
          );

          assert.deepEqual(
            subject._usedColors,
            [bar.color, foo.color],
            'should keep _usedColors in sync'
          );
        });

        test('override color if not from palette', function() {
          // this test simulates an update on the color scheme and/or old
          // calendars (stored in the DB before the 2.0 visual refresh)
          subject._updateCalendarColor(bar);
          assert.equal(
            bar.color,
            palette[0],
            'should use first color from palette'
          );

          assert.deepEqual(
            subject._usedColors,
            [foo.color, bar.color],
            'should keep _usedColors in sync'
          );
        });
      });
    });
  });
});

});
