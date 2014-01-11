requireLib('ext/moment.js');
requireLib('timespan.js');

var uuid;

suiteGroup('Provider.Local', function() {

  var subject;
  var app;
  var db;
  var controller;
  var caldav;

  setup(function(done) {
    app = testSupport.calendar.app();
    subject = new Calendar.Provider.Local({
      app: app
    });

    controller = app.timeController;

    db = app.db;
    db.open(function(err) {
      assert.ok(!err);
      done();
    });
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(db, [
      'accounts',
      'calendars',
      'events',
      'busytimes'
    ], done);
  });

  teardown(function() {
    db.close();
  });

  test('initialization', function() {
    assert.equal(subject.app, app);
    assert.instanceOf(subject, Calendar.Provider.Abstract);
  });

  test('#getAccount', function(done) {
    subject.getAccount({}, function(err, success) {
      assert.ok(!err);
      assert.deepEqual(success, {});
      done();
    });
  });

  /* disabled in Bug 838993, to be reenabled asap in Bug 840489.
   * this happens when using a firefox launched with a french locale, we
   * probably need to mock the l10n library instead of using it.
   *
   *   1) [calendar] provider/local #findCalendars:
   *        Error: expected 'Agenda hors-ligne' to equal 'Offline calendar'
   *
  test('#findCalendars', function(done) {
    // local will always return the same
    // calendar id

    subject.findCalendars({}, function(err, list) {
      done(function() {
        var first = list['local-first'];
        assert.equal(first.id, 'local-first');
        assert.equal(first.name, 'Offline calendar');
      });
    });
  });
  */

  suite('mutations', function() {
    var events;
    var busytimes;

    var addEvent;
    var addTime;
    var removeTime;

    setup(function() {
      events = app.store('Event');
      busytimes = app.store('Busytime');

      var span = new Calendar.Timespan(
        0, Infinity
      );

      controller.observeTime(span, function(e) {
        switch (e.type) {
          case 'add':
            addTime = e.data;
            addEvent = controller._eventsCache[addTime.eventId];
            break;
          case 'remove':
            removeTime = e.data;
            break;
        }
      });
    });

    function find(eventId, done) {
      var trans = db.transaction(
        events._dependentStores,
        'readwrite'
      );

      trans.oncomplete = function() {
        done(busytime, event);
      };

      var event;
      var busytime;

      events.get(eventId, trans, function(err, record) {
        event = record;
      });


      var index = trans.objectStore('busytimes').index('eventId');

      index.get(eventId).onsuccess = function(e) {
        busytime = e.target.result;
      };
    }

    suite('#createEvent', function() {
      var event;

      function verify(done) {
        subject.createEvent(event, function() {
          find(event._id, function(busytime, event) {
            done(function() {
              assert.deepEqual(event, event);
              assert.hasProperties(addTime, busytime);
            });
          });
        });
      }

      test('without remote.id', function(done) {
        event = Factory('event');
        delete event.remote.id;
        delete event._id;

        verify(done);

        assert.ok(event.remote.id, 'adds id');
      });

      test('with remote.id', function(done) {
        event = Factory('event');
        delete event._id;
        var id = event.remote.id;
        verify(done);

        assert.equal(event.remote.id, id, 'id change');
      });
    });

    suite('#updateEvent', function() {

      //XXX: in the future we should skip the saving.
      suite('update with same values', function() {
        var event;
        var busytime;

        setup(function(done) {
          event = Factory('event');
          subject.createEvent(event, done);
        });

        setup(function(done) {
          subject.updateEvent(event, busytime, function(err, busy, ev) {
            event = ev;
            busytime = busy;
            done();
          });
        });

        test('event', function(done) {
          assert.ok(event);
          events.count(function(err, count) {
            done(function() {
              assert.equal(count, 1);
            });
          });
        });

        test('busytime', function(done) {
          assert.hasProperties(busytime, {
            eventId: event._id, calendarId: event.calendarId
          });

          busytimes.count(function(err, count) {
            done(function() {
              assert.equal(count, 1);
            });
          });
        });
      });

    });

    suite('#deleteEvent', function() {
      var event;

      setup(function(done) {
        event = Factory('event');
        subject.createEvent(event, done);
      });

      setup(function(done) {
        subject.deleteEvent(event, done);
      });

      test('busytime count', function(done) {
        busytimes.count(function(err, count) {
          done(function() {
            assert.equal(count, 0);
          });
        });
      });

      test('event count', function(done) {
        events.count(function(err, count) {
          done(function() {
            assert.equal(count, 0);
          });
        });
      });
    });

  });

  suite('#ensureRecurrencesExpanded', function() {
    var expandEvent, requiredExpansion;

    setup(function(done) {
      expandEvent = sinon.stub(subject, '_expandEvent');

      var event = Factory('event');
      event.startDate = new Date();
      event.endDate = new Date();
      event.endDate.setTime(
        event.endDate.getTime() + 1000 * 60 * 60
      );
      event.recurrences = 'everyDay';
      event.calendarId = Calendar.Provider.Local.calendarId;

      subject.createEvent(event, done);
    });

    teardown(function() {
      expandEvent.restore();
    });

    test('should call #_expandEvent for each local event', function(done) {
      expandEvent.callsArgWithAsync(2);
      var maxDate = moment().add('months', 3).toDate();
      subject.ensureRecurrencesExpanded(maxDate, function(err, _expansion) {
        requiredExpansion = _expansion;
        sinon.assert.calledOnce(expandEvent);
        done();
      });
    });

    test('should report requiredExpansion true', function(done) {
      expandEvent.callsArgWithAsync(2, null, true);
      var maxDate = moment().add('months', 3).toDate();
      subject.ensureRecurrencesExpanded(maxDate, function(err, _expansion) {
        assert.ok(_expansion);
        done();
      });
    });

    test('should report requiredExpansion false', function(done) {
      expandEvent.callsArgWithAsync(2, null, false);
      var maxDate = moment().add('months', 3).toDate();
      subject.ensureRecurrencesExpanded(maxDate, function(err, _expansion) {
        assert.ok(!_expansion);
        done();
      });
    });
  });

  suite('#_expandEvent', function() {
    var event;

    setup(function(done) {
      this.timeout(5000);
      event = Factory('event');
      event.startDate = new Date();
      event.endDate = new Date();
      event.endDate.setTime(
        event.startDate.getTime() + 1000 * 60 * 60
      );
      event.calendarId = Calendar.Provider.Local.calendarId;

      subject.createEvent(event, done);
    });

    test('should do nothing if !recurrences or never', function(done) {
      event.remote.recurrences = 'never';
      subject._expandEvent(event, new Date(), function(err, expansion) {
        assert.ok(!err);
        assert.equal(expansion, false);
        done();
      });
    });

    test('should add expandedTo key to event', function(done) {
      event.remote.watch('expandedTo', function() {
        event.remote.unwatch('expandedTo');
        done();
      });

      event.remote.recurrences = 'everyYear';
      subject._expandEvent(event, event.remote.startDate, function() {});
    });

    test('should report expanded true', function(done) {
      event.remote.recurrences = 'everyDay';
      var maxDate = new Date();
      maxDate.setTime(moment().add('days', 7).toDate());
      subject._expandEvent(event, maxDate, function(err, expansion) {
        assert.ok(!err);
        assert.equal(expansion, true);
        done();
      });
    });

    test('should report expanded false', function(done) {
      event.remote.recurrences = 'everyDay';
      var maxDate = new Date();
      maxDate.setTime(moment().subtract('days', 7).toDate());
      subject._expandEvent(event, maxDate, function(err, expansion) {
        assert.ok(!err);
        assert.equal(expansion, false);
        done();
      });
    });

    test('should update event.remote.expandedTo', function() {
      event.remote.recurrences = 'everyDay';
      var maxDate = new Date();
      maxDate.setTime(moment().add('days', 7).toDate());
      subject._expandEvent(event, maxDate, function(err, expansion) {
        assert.ok(!err);
        assert.ok(event.expandedTo > event.startDate);
        done();
      });
    });

    test.skip('should create busytimes', function() {
      // TODO(gaye)
    });

    test.skip('should cache busytimes', function() {
      // TODO(gaye)
    });
  });

  suite('#_nextBusytime', function() {
    var event, prevStart, duration, uuid, startDate;

    setup(function() {
      event = { _id: '123' };
      prevStart = new Date(1998, 1, 17, 3, 0, 0, 0);
      startDate = moment(prevStart);
      duration = 60 * 60 * 1000;
      uuid = 'more-unique-than-all-the-rest';
      window.uuid.v4 = function() {
        return uuid;
      };
    });

    test.skip('everyDay', function() {
      var result = subject._nextBusytime(
        event, prevStart, duration, 'everyDay'
      );

      startDate = startDate.add('days', 1);
      var endDate = new Date();
      endDate.setDate(startDate.getDate());
      endDate.setTime(startDate.getTime() + duration);

      assert.deepEqual(result, {
        _id: event._id + '-' + uuid,
        eventId: event._id,
        calendarId: Calendar.Provider.Local.calendarId,
        start: startDate,
        end: endDate
      });
    });

    test('everyWeek', function() {
      var result = subject._nextBusytime(
        event, prevStart, duration, 'everyWeek'
      );

      startDate = startDate.add('days', 7);
      var endDate = new Date();
      endDate.setDate(startDate.getDate());
      endDate.setTime(startDate.getTime() + duration);

      assert.deepEqual(result, {
        _id: event._id + '-' + uuid,
        eventId: event._id,
        calendarId: Calendar.Provider.Local.calendarId,
        start: startDate,
        end: endDate
      });
    });

    test('everyOtherWeek', function() {
      var result = subject._nextBusytime(
        event, prevStart, duration, 'everyOtherWeek'
      );

      startDate = startDate.add('days', 14);
      var endDate = new Date();
      endDate.setDate(startDate.getDate());
      endDate.setTime(startDate.getTime() + duration);

      assert.deepEqual(result, {
        _id: event._id + '-' + uuid,
        eventId: event._id,
        calendarId: Calendar.Provider.Local.calendarId,
        start: startDate,
        end: endDate
      });
    });

    test('everyMonth', function() {
      var result = subject._nextBusytime(
        event, prevStart, duration, 'everyMonth'
      );

      startDate = startDate.add('months', 1);
      var endDate = new Date();
      endDate.setDate(startDate.getDate());
      endDate.setTime(startDate.getTime() + duration);

      assert.deepEqual(result, {
        _id: event._id + '-' + uuid,
        eventId: event._id,
        calendarId: Calendar.Provider.Local.calendarId,
        start: startDate,
        end: endDate
      });
    });

    test('everyYear', function() {
      var result = subject._nextBusytime(
        event, prevStart, duration, 'everyYear'
      );

      startDate = startDate.add('years', 1);
      var endDate = new Date();
      endDate.setDate(startDate.getDate());
      endDate.setTime(startDate.getTime() + duration);

      assert.deepEqual(result, {
        _id: event._id + '-' + uuid,
        eventId: event._id,
        calendarId: Calendar.Provider.Local.calendarId,
        start: startDate,
        end: endDate
      });
    });
  });
});
