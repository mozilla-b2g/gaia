requireApp('calendar/test/unit/helper.js', function() {
  requireLib('ext/ical.js');
  requireApp('calendar/test/unit/provider/mock_stream.js');
  requireApp('calendar/test/unit/service/helper.js');
  requireLib('provider/caldav_pull_events.js');
  requireLib('provider/abstract.js');
  requireLib('provider/caldav.js');
  requireLib('models/account.js');
  requireLib('models/calendar.js');
});

suite('provider/caldav', function() {

  var subject;
  var app;
  var controller;
  var db;

  var accountStore;
  var calendarStore;
  var componentStore;
  var eventStore;

  var calendar;
  var account;

  setup(function(done) {
    this.timeout(10000);
    app = testSupport.calendar.app();
    controller = app.serviceController;
    db = app.db;

    subject = new Calendar.Provider.Caldav({
      app: app
    });

    calendar = Factory('calendar', {
      _id: 'one',
      accountId: 'one',
      firstEventSyncDate: null,
      lastEventSyncToken: null
    });

    account = Factory('account', { _id: 'one' });

    calendarStore = app.store('Calendar');
    accountStore = app.store('Account');
    componentStore = app.store('IcalComponent');

    accountStore.cached[account._id] = account;
    calendarStore.cached[calendar._id] = calendar;

    eventStore = app.store('Event');

    db.open(function() {
      var trans = db.transaction(['calendars'], 'readwrite');

      calendarStore.persist(calendar, trans);

      trans.oncomplete = function() {
        done();
      };
    });
  });

  var ical;
  suiteSetup(function(done) {
    this.timeout(10000);
    ical = new ServiceSupport.Fixtures('ical');
    ical.load('daily_event');
    ical.load('recurring_event');
    ical.onready = done;
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      db,
      ['busytimes', 'icalComponents'],
      done
    );
  });

  teardown(function() {
    db.close();
  });

  test('initialization', function() {
    assert.instanceOf(
      subject,
      Calendar.Provider.Abstract
    );

    assert.equal(
      subject.service,
      app.serviceController
    );
  });

  test('capabilites', function() {
    assert.isTrue(subject.useUrl);
    assert.isTrue(subject.useCredentials);
  });

  suite('#calendarCapabilities', function() {
    /**
     * Creates a test for a privilege set
     */
    function testPrivilege(name, privileges, expected) {
      test(name, function() {
        var calendar = Factory('calendar', {
          remote: {
            privilegeSet: privileges
          }
        });

        var result = subject.calendarCapabilities(
          calendar
        );

        assert.hasProperties(result, expected);
      });
    }

    testPrivilege('missing privilegeSet', null, {
      canUpdateEvent: true,
      canDeleteEvent: true,
      canCreateEvent: true
    });

    testPrivilege('delete', ['unbind'], {
      canDeleteEvent: true
    });

    testPrivilege('create/update', ['write-content'], {
      canCreateEvent: true,
      canUpdateEvent: true
    });
  });

  suite('#eventCapabilities', function() {
    test('recurring', function() {
      var event = Factory('event', {
        remote: {
          isRecurring: true
        }
      });

      var expected = {
        canUpdate: false,
        canDelete: false,
        canCreate: false
      };

      var actual = subject.eventCapabilities(event);
      assert.deepEqual(actual, expected);
    });

    test('without calendar permissions', function() {
      var calendar = Factory('calendar');
      var event = Factory('event', { calendarId: calendar._id });
      calendarStore.cached[calendar._id] = calendar;

      assert.isFalse(event.remote.isRecurring);

      var expected = {
        canUpdate: true,
        canCreate: true,
        canDelete: true
      };

      var actual = subject.eventCapabilities(event);
      assert.deepEqual(actual, expected);
    });

    test('with calendar permissions', function() {
      var calledWith = null;
      var calendar = Factory('calendar');
      var givenCaps = {
        canUpdateEvent: true,
        canDeleteEvent: true,
        canCreateEvent: false
      };

      subject.calendarCapabilities = function() {
        calledWith = arguments;
        return givenCaps;
      };

      var event = Factory('event', { calendarId: calendar._id });
      calendarStore.cached[calendar._id] = calendar;

      var caps = subject.eventCapabilities(event);
      assert.deepEqual(
        calledWith,
        [calendar]
      );

      assert.deepEqual(caps, {
        canCreate: givenCaps.canCreateEvent,
        canUpdate: givenCaps.canUpdateEvent,
        canDelete: givenCaps.canDeleteEvent
      });
    });
  });

  suite('methods that wrap request', function() {
    var calledWith;
    var error;
    var result;
    var input = { user: 'foo' };

    setup(function() {
      controller.request = function() {
        calledWith = Array.prototype.slice.call(arguments);
        var cb = arguments[arguments.length - 1];
        setTimeout(function() {
          cb(error, result);
        }, 0);
      };
    });

    suite('#getAccount', function() {
      test('success', function(done) {
        result = { id: 'wow' };

        subject.getAccount(input, function cb(cbError, cbResult) {
          done(function() {
            assert.equal(cbResult, result);
            assert.equal(cbError, error);
          });
        });
      });

      test('error handling', function(done) {
        error = new Error();
        error.constructorName = 'CaldavHttpError';
        error.code = 404;
        var errorMsg = 'no-url';
        subject.getAccount(input, function cb(cbError, cbResult) {
          done(function() {
            assert.equal(cbError, errorMsg);
          });
        });
      });

      test('offline handling', function(done) {
        var realOffline = app.offline;
        app.offline = function() { return true };
        subject.getAccount(input, function cb(cbError, cbResult) {
          done(function() {
            app.offline = realOffline;
            assert.equal(cbError.name, 'offline');
          })
        })
      });
    });

    suite('#findCalendars', function() {
      test('success', function(done) {
        result = {
          one: Factory.build('caldav.calendar'),
          two: Factory.build('caldav.calendar', { color: null })
        };

        error = null;

        subject.findCalendars(input, function cb(cbError, cbResult) {
          done(function() {
            assert.equal(
              cbResult.one,
              result.one,
              'does not process events with color'
            );

            // hack clone
            var withColor = JSON.parse(JSON.stringify(result.two));
            withColor.color = subject.defaultColor;

            assert.deepEqual(
              cbResult.two,
              withColor,
              'adds color'
            );

            assert.equal(cbError, error);
          });
        });
      });

      test('offline handling', function(done) {
        var realOffline = app.offline;
        app.offline = function() { return true };
        subject.findCalendars(input, function cb(cbError, cbResult) {
          done(function() {
            app.offline = realOffline;
            assert.equal(cbError.name, 'offline');
          })
        })
      });
    });

    suite('#createEvent', function() {
      var event;
      var id;

      setup(function(done) {
        event = Factory('event', {
          calendarId: calendar._id
        });

        result = Factory.create('event').remote;
        result.id = 'foo';
        result.syncToken = 'hit';
        result.icalComponent = 'xfoo';

        id = calendar._id + '-foo';

        subject.createEvent(event, done);
      });

      test('icalComponent', function(done) {
        componentStore.get(id, function(err, result) {
          done(function() {
            assert.deepEqual(result, {
              eventId: id,
              ical: 'xfoo'
            });
          });
        });
      });

      test('event', function(done) {
        eventStore.get(id, function(err, result) {
          var remote = result.remote;
          assert.equal(remote.id, 'foo');
          assert.equal(remote.syncToken, 'hit');
          assert.ok(!remote.icalComponent, 'does not have icalComponent');
          done();
        });
      });

      test('offline handling', function(done) {
        var realOffline = app.offline;
        app.offline = function() { return true };
        subject.createEvent(event, function cb(cbError, cbResult) {
          done(function() {
            app.offline = realOffline;
            assert.equal(cbError.name, 'offline');
          })
        });
      });

    });

    suite('#updateEvent', function() {
      var event;
      var component;

      setup(function(done) {
        var trans = eventStore.db.transaction(
          ['events', 'icalComponents'],
          'readwrite'
        );

        trans.oncomplete = function() {
          done();
        };

        event = Factory('event', {
          calendarId: calendar._id
        });

        component = Factory('icalComponent', {
          eventId: event._id,
          ical: 'original'
        });

        eventStore.persist(event, done);
        componentStore.persist(component, done);
      });

      setup(function(done) {
        result = Factory.create('event').remote;
        result.icalComponent = 'xfooo';
        result.syncToken = 'changedmefoo';
        subject.updateEvent(event, done);
      });

      test('sent data', function() {
        var details = calledWith[calledWith.length - 2];

        assert.ok(details.event, 'sends event');

        assert.equal(
          details.icalComponent,
          'original',
          'icalComponent'
        );
      });

      test('component', function(done) {
        componentStore.get(event._id, function(err, item) {
          done(function() {
            assert.deepEqual(
              item,
              { eventId: event._id, ical: 'xfooo' }
            );
          });
        });
      });

      test('event', function(done) {
        eventStore.get(event._id, function(err, item) {
          done(function() {
            assert.equal(item.remote.syncToken, result.syncToken);
          });
        });

      });

      test('offline handling', function(done) {
        var realOffline = app.offline;
        app.offline = function() { return true };
        subject.updateEvent(event, function cb(cbError, cbResult) {
          done(function() {
            app.offline = realOffline;
            assert.equal(cbError.name, 'offline');
          })
        });
      });

    });

    suite('#deleteEvent', function() {
      test('success', function(done) {
        var event = Factory('event', {
          calendarId: calendar._id
        });

        subject.deleteEvent(event, function() {
          done(function() {
            assert.equal(calledWith[0], 'caldav');
            assert.equal(calledWith[1], 'deleteEvent');
            assert.deepEqual(
              calledWith.slice(2, 5),
              [account, calendar.remote, event.remote]
            );
          });
        });
      });

      test('offline handling', function(done) {
        var realOffline = app.offline;
        var event = Factory('event', {
          calendarId: calendar._id
        });
        app.offline = function() { return true };
        subject.deleteEvent(event, function cb(cbError, cbResult) {
          done(function() {
            app.offline = realOffline;
            assert.equal(cbError.name, 'offline');
          })
        });
      });
    });
  });

  suite('#_cachedEventsFor', function() {
    var events = [];
    var calendar;

    setup(function(done) {
      events.length = 0;
      calendar = Factory('calendar');
      calendarStore.persist(calendar, done);
    });

    // create some events
    var i = 0;
    for (; i < 2; i++) {
      setup(function(done) {
        var event = Factory('event', {
          calendarId: calendar._id,
          remote: {
            id: i,
            url: 'some_foo_' + i + '.ics',
            syncToken: i
          }
        });

        events.push(event);
        eventStore.persist(event, done);
      });
    }

    test('result', function(done) {
      var expected = Object.create(null);
      events.forEach(function(item) {
        expected[item.remote.url] = {
          syncToken: item.remote.syncToken,
          id: item._id
        };
      });

      subject._cachedEventsFor(calendar, function(err, result) {
        done(function() {
          assert.deepEqual(result, expected);
        });
      });
    });
  });

  suite('#syncEvents', function() {
    var account;
    var calendar;
    var events = [];

    var calledWith;

    function addEvent(cb) {
      setup(function(done) {
        var event = cb();
        events.push(event);
        eventStore.persist(event, done);
      });
    }

    setup(function(done) {
      calledWith = null;
      events.length = 0;

      subject._syncEvents = function() {
        calledWith = arguments;
        var cb = calledWith[calledWith.length - 1];
        setTimeout(cb, 0, null);
      };

      var trans = db.transaction(
        ['accounts', 'calendars'],
        'readwrite'
      );

      account = Factory('account', {
        providerType: 'Caldav'
      });

      calendar = Factory('calendar');

      trans.oncomplete = function() {
        done();
      };

      accountStore.persist(account, trans);
      calendarStore.persist(calendar, trans);
    });

    suite('sync with cached events', function() {
      addEvent(function() {
        return Factory('event', {
          calendarId: calendar._id,
          remote: {
            url: 'one.ics',
            syncToken: 'one'
          }
        });
      });

      test('result', function(done) {
        subject.syncEvents(account, calendar, function() {
          done(function() {
            assert.equal(calledWith[0], account, 'has account');
            assert.equal(calledWith[1], calendar, 'has calendar');

            // expected cached events (url -> sync token)
            var sentCache = calledWith[2];
            assert.ok(sentCache, 'sends cache');
            assert.ok(sentCache[events[0].remote.url], 'sends url');
          });
        });
      });

      test('offline handling', function(done) {
        var realOffline = app.offline;
        app.offline = function() { return true };
        subject.syncEvents(account, calendar, function cb(cbError, cbResult) {
          done(function() {
            app.offline = realOffline;
            assert.equal(cbError.name, 'offline');
          })
        })
      });
    });

    suite('sync tokens match', function() {
      setup(function() {
        calendar.lastEventSyncToken = 'sync';
        calendar.remote.syncToken = 'sync';
      });

      test('result', function(done) {
        // tokens match should not sync!
        subject.syncEvents(account, calendar, function() {
          assert.ok(!calledWith);
          done();
        });
      });

      test('offline handling', function(done) {
        var realOffline = app.offline;
        app.offline = function() { return true };
        subject.syncEvents(account, calendar, function cb(cbError, cbResult) {
          done(function() {
            app.offline = realOffline;
            assert.equal(cbError.name, 'offline');
          })
        })
      });
    });

  });

  suite('#_syncEvents', function() {
    var calledWith;
    var account;
    var calendar;
    var cached = {};

    setup(function() {
      subject.service.stream = function() {
        var args = Array.slice(arguments);

        if (!args.shift() === 'caldav')
          throw new Error('expected caldav service');

        if (!args.shift() === 'streamEvents')
          throw new Error('expected streamEvents');


        calledWith = args;
        var stream = new Calendar.Responder();
        stream.request = function(callback) {
          setTimeout(callback, 0, null);
        };
        return stream;
      };

      account = Factory('account');
      calendar = Factory('calendar');
    });

    suite('with first syncDate', function() {
      var expectedSyncDate = new Date(2012, 0, 1);

      setup(function(done) {
        calendar.firstEventSyncDate = expectedSyncDate;
        calendarStore.persist(calendar, done);
      });

      test('result', function(done) {
        var expectedDate = new Date(expectedSyncDate.valueOf());
        expectedDate.setDate(
          expectedDate.getDate() - subject.daysToSyncInPast
        );

        var options = {
          startDate: expectedDate,
          cached: cached
        };

        var pull = subject._syncEvents(
          account,
          calendar,
          cached,
          oncomplete
        );

        function oncomplete() {
          var expected = [
            account.toJSON(),
            calendar.remote,
            options
          ];

          assert.deepEqual(
            calledWith,
            expected
          );

          assert.instanceOf(
            pull,
            Calendar.Provider.CaldavPullEvents
          );

          assert.equal(pull.account, account);
          assert.equal(pull.calendar, calendar);

          calendarStore.get(calendar._id, function(err, result) {
            done(function() {
              assert.equal(
                result.lastEventSyncToken,
                result.remote.syncToken,
                'updates sync token'
              );

              assert.deepEqual(
                result.firstEventSyncDate,
                expectedSyncDate,
                'first sync date is never modified'
              );
            });
          });
        }
      });
    });

    test('without first sync date', function(done) {
      var syncDate = Calendar.Calc.createDay(new Date());
      var expectedSyncDate = new Date(syncDate.valueOf());

      syncDate.setDate(syncDate.getDate() - subject.daysToSyncInPast);
      calendar.firstEventSyncDate = null;

      var options = {
        startDate: syncDate,
        cached: cached
      };

      subject._syncEvents(account, calendar, cached, oncomplete);

      function oncomplete() {
        var expected = [
          account.toJSON(),
          calendar.remote,
          options
        ];

        assert.deepEqual(
          calledWith,
          expected
        );

        calendarStore.get(calendar._id, function(err, record) {
          done(function() {
            assert.deepEqual(
              record.firstEventSyncDate,
              expectedSyncDate,
              'updates first sync date'
            );

            assert.equal(
              record.lastEventSyncToken,
              record.remote.syncToken,
              'updates sync token'
            );
          });
        });
      }
    });
  });

  suite('#ensureRecurrencesExpanded', function() {
    var maxDate = new Date(2013, 2, 17);

    test('with no icalComponent records', function(done) {
      subject.ensureRecurrencesExpanded(maxDate, function(err, didExpand) {
        done(function() {
          assert.isFalse(didExpand);
        });
      });
    });

    test('with lastRecurrenceId after maxDate', function(done) {
      var comp = Factory('icalComponent', {
        ical: '',
        eventId: 22,
        lastRecurrenceId: new Date(2013, 2, 18)
      });

      componentStore.persist(comp, function(err) {
        if (err)
          return done(err);

        subject.ensureRecurrencesExpanded(maxDate, function(err, didExpand) {
          if (err)
            return done(err);

          done(function() {
            assert.isFalse(didExpand, 'expanded');
          });
        });
      });
    });

    suite('with simulated pre-expansion component', function() {
      var comp;
      var didExpand;
      var eventId;
      var givenLastRecur = new Date(2012, 10, 1);

      setup(function() {
        var jCal = ICAL.parse(ical.recurringEvent);
        var vcal = new ICAL.Component(jCal[1]);
        var vevent = vcal.getFirstSubcomponent('vevent');

        eventId = calendar._id + '-' + vevent.getFirstPropertyValue('uid');
      });

      setup(function(done) {
        didExpand = false;
        comp = Factory('icalComponent', {
          calendarId: calendar._id,
          eventId: eventId,
          ical: ical.recurringEvent,
          iterator: {},
          lastRecurrenceId: Calendar.Calc.dateToTransport(
            givenLastRecur
          )
        });

        componentStore.persist(comp, done);

        app.serviceController.start();
      });

      setup(function(done) {
        subject.ensureRecurrencesExpanded(maxDate, function(err, result) {
          didExpand = result;
          done();
        });
      });

      test('after expansion', function(done) {
        assert.isTrue(didExpand, 'has expanded');

        var stores = ['icalComponents', 'busytimes'];
        var trans = db.transaction(stores);

        var pending = 0;
        var results = {};

        function next() {
          if (!(--pending))
            done(complete);
        }

        stores.forEach(function(store) {
          pending++;

          var obj = trans.objectStore(store);
          obj.mozGetAll().onsuccess = function(e) {
            results[store] = e.target.result;
            next();
          };
        });

        function complete() {
          assert.length(results.icalComponents, 1);
          assert.ok(results.busytimes.length, 1);

          var comp = results.icalComponents[0];
          var lastRecur = Calendar.Calc.dateFromTransport(
            comp.lastRecurrenceId
          );

          var dates = [];

          results.busytimes.forEach(function(time) {
            dates.push(time.startDate);
          });

          dates.sort();

          assert.isTrue(
            dates[0].valueOf() > givenLastRecur.valueOf(),
            'first occurrence is after last given'
          );

          assert.isTrue(
            dates[dates.length - 1].valueOf() < maxDate.valueOf(),
            'last occurrence is before max date'
          );

          assert.isTrue(
            lastRecur.valueOf() > givenLastRecur.valueOf(),
            'should expand beyond the given lastRecurId'
          );
        }
      });
    });

  });
});
