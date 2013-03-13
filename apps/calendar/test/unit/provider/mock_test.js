suite('Provider.Mock', function() {

  testSupport.calendar.loadObjects(
    'Models.Account',
    'Models.Calendar'
  );

  var app;
  var subject;

  setup(function() {
    app = testSupport.calendar.app();
    subject = Calendar.App.provider('Mock');
  });

  test('staged data events', function(done) {
    var account = { user: 'user' };
    var handle = subject.stageGetAccount(
      'user',
      null
    );

    var firedBefore = false;
    handle.onbefore = function() {
      firedBefore = true;
    };

    var firedAfter = false;
    handle.onafter = function() {
      firedAfter = true;
    };

    subject.getAccount(account, function() {
      assert.ok(firedBefore, 'fires before event');
      assert.ok(!firedAfter, 'after fires after callback');

      Calendar.nextTick(function() {
        done(function() {
          assert.ok(firedAfter, 'fires after');
        });
      });
    });

    assert.ok(!firedBefore, 'before is async');
  });

  suite('#getAccount', function() {

    test('with staged account', function(done) {
      var obj = {};
      subject.stageGetAccount('user', null, obj);

      subject.getAccount({ user: 'user' }, function(err, result) {
        assert.ok(!err);
        assert.equal(result, obj, 'uses staged object');

        subject.getAccount({ user: 'user' }, function(err, result) {
          assert.ok(!err);
          assert.notEqual(obj, result, 'staged object is not resued');
          done();
        });
      });
    });

    test('without mock signal', function(done) {
      subject.getAccount({}, function(err, value) {
        done(function() {
          assert.ok(!err);
          assert.deepEqual(value, {});
        });
      });
    });

  });

  suite('#findCalendars', function() {
    test('with staging', function(done) {
      var list = {
        one: Factory('remote.calendar', { id: 'one' })
      };

      subject.stageFindCalendars('user', null, list);

      subject.findCalendars({ user: 'user' }, function(err, result) {
        done(function() {
          assert.ok(!err);
          assert.deepEqual(list, result);
        });
      });
    });

    test('without staging', function(done) {
      subject.findCalendars({}, function(err, list) {
        done(function() {
          assert.ok(!err);
          assert.deepEqual(list, {});
        });
      });
    });
  });

  suite('#syncEvents', function() {
    var calendar;
    var account;

    setup(function() {
      account = Factory('account');
      calendar = Factory('calendar');
    });

    test('without staged data', function(done) {
      subject.syncEvents({}, {}, done);
    });

    test('with staged data', function(done) {
      var err = new Error('I win!');
      subject.stageSyncEvents(
        account.user,
        calendar.remote.id,
        err
      );

      subject.syncEvents(account, calendar, function(gotErr) {
        done(function() {
          assert.equal(err, gotErr);
        });
      });
    });
  });

  suite('#calendarCapabilities', function() {
    test('with staging data', function() {
      subject.stageCalendarCapabilities(1, {
        canDeleteEvent: false
      });

      assert.deepEqual(
        subject.calendarCapabilities({ _id: 1 }),
        {
          canDeleteEvent: false,
          canUpdateEvent: true,
          canCreateEvent: true
        }
      );
    });

    test('without staging data', function() {
      assert.deepEqual(
        subject.calendarCapabilities({ _id: 1 }),
        {
          canDeleteEvent: true,
          canUpdateEvent: true,
          canCreateEvent: true
        }
      );
    });
  });

  suite('#eventCapabilities', function() {

    test('with staging data', function(done) {
      subject.stageEventCapabilities(1, null, {
        canDelete: false
      });

      subject.eventCapabilities({ _id: 1 }, function(err, result) {
        if (err) {
          return done(err);
        }

        done(function() {
          assert.deepEqual(result, {
            canCreate: true,
            canDelete: false,
            canUpdate: true
          });
        });
      });

    });

    test('without staging data', function(done) {
      subject.eventCapabilities({}, function(err, result) {
        if (err) {
          return done(err);
        }

        done(function() {
          assert.deepEqual(result, {
            canCreate: true,
            canUpdate: true,
            canDelete: true
          });
        });
      });
    });
  });

});
