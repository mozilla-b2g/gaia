requireLib('models/account.js');
requireLib('provider/abstract.js');
requireLib('provider/local.js');
requireLib('provider/caldav.js');

suiteGroup('Controllers.RecurringEvents', function() {

  var subject;
  var app;
  var timeController;
  var db;

  setup(function(done) {
    app = testSupport.calendar.app();
    db = app.db;

    subject = new Calendar.Controllers.RecurringEvents(app);
    timeController = app.timeController;
    db.open(done);
  });

  teardown(function(done) {
    subject.unobserve();
    testSupport.calendar.clearStore(
      db,
      ['accounts'],
      function() {
        done(function() {
          db.close();
        });
      }
    );
  });

  test('initialization', function() {
    assert.equal(subject.app, app, 'sets app');
    assert.instanceOf(subject, Calendar.Responder);
  });

  test('#observe', function() {
    var date = new Date(2012, 1, 1);
    timeController.move(date);

    var expandCall;

    subject.queueExpand = function(date) {
      expandCall = date;
    };

    subject.observe();

    assert.deepEqual(expandCall, date, 'expands initial time');
  });

  suite('controller events', function() {
    var date = new Date(2012, 1, 1);

    setup(function(done) {
      subject.observe();
      subject.waitBeforeMove = 10;
      app.timeController.move(date);

      subject.once('expandComplete', done);
    });

    test('syncComplete', function(done) {

      subject.queueExpand = function(date) {
        done(function() {
          assert.deepEqual(app.timeController.position, date);
        });
      };

      app.syncController.emit('syncComplete');
    });

/*
// These tests are currently failing and have been temporarily disabled as per
// Bug 838993. They should be fixed and re-enabled as soon as possible as per
// Bug 840489.
    test('monthChange', function(done) {
      var expectedDate = new Date(2012, 10, 1);
      // modify wait before move for faster tests.

      subject.queueExpand = function(date) {
        done(function() {
          assert.deepEqual(expectedDate, date);
        });
      };

      timeController.move(new Date(2012, 8, 1));
      timeController.move(new Date(2012, 9, 1));

      Calendar.nextTick(function() {
        timeController.move(expectedDate);
      });
    });
*/
  });

  suite('#queueExpand', function() {
    var expandCalls;
    var expandStartEvents;

    setup(function() {
      expandCalls = [];
      subject.expand = function(date, cb) {
        expandCalls.push([date, cb]);
      };

      expandStartEvents = 0;
      subject.on('expandStart', function() {
        expandStartEvents++;
      });
    });

    test('multiple expansions', function(done) {
      var dates = [];

      subject.once('expandComplete', function() {
        done(function() {
          assert.equal(expandStartEvents, 1, 'calls expand once');
          assert.deepEqual(
            dates,
            [
              new Date(2012, 1, 1),
              new Date(2012, 8, 1),
              new Date(2012, 10, 7)
            ]
          );
        });
      });

      subject.expand = function(date, cb) {
        dates.push(date);
        Calendar.nextTick(cb);
      };

      // should actually trigger because its the first
      // item in the queue...
      subject.queueExpand(new Date(2012, 1, 1));

      Calendar.nextTick(function() {
        subject.queueExpand(new Date(2012, 7, 7));
      });

      // should be skipped because the next is greater and
      // we are still processing the first item in th queue.
      subject.queueExpand(new Date(2012, 2, 7));

      // queued
      subject.queueExpand(new Date(2012, 8, 1));

      // should be skipped its less then others
      subject.queueExpand(new Date(2012, 1, 2));

      Calendar.nextTick(function() {
        // after the second expansion this fires
        // so should the final expansion this tests
        // some complicated async ordering.
        subject.queueExpand(new Date(2012, 10, 7));
      });
    });

    test('single expand', function(done) {
      var date = new Date(2012, 1, 7);

      subject.once('expandComplete', function() {
        done(function() {
          assert.ok(!subject.pending);
          assert.equal(expandStartEvents, 1);
        });
      });

      subject.queueExpand(date);
      assert.ok(subject.pending);
      assert.length(expandCalls, 1);

      // verify right date is being expanded.
      assert.deepEqual(expandCalls[0][0], date);

      // trigger callback
      expandCalls[0][1]();
    });
  });

  suite('#expand', function() {
    var account;
    var provider;
    var expandDate = new Date(2012, 1, 1);
    var expectedDate;

    setup(function() {
      expectedDate = new Date(expandDate.valueOf());
      expectedDate.setDate(expectedDate.getDate() + subject.paddingInDays);
    });

    function setupProvider(type) {
      setup(function(done) {
        account = Factory('account', {
          providerType: type,
          _id: type
        });

        provider = app.provider(type);
        app.store('Account').persist(account, done);
      });
    }

    test('with no accounts', function(done) {
      subject.expand(expandDate, done);
    });

    suite('provider that cannot expand', function() {
      setupProvider('Local');

      test('will not expand', function(done) {
        provider.ensureRecurrencesExpanded = function() {
          throw new Error('local should not expand');
        };

        subject.expand(expandDate, done);
      });
    });

    suite('provider that can expand', function() {
      setupProvider('Caldav');

      // custom helper to allow each test
      // to inject specific logic while sharing the
      // spy/mock easily... override spyHandler to use.
      var spyHandler;

      // number of times ensureRecurrencesExpanded was called.
      var calledEnsure;

      setup(function() {
        spyHandler = null;
        calledEnsure = 0;

        provider.ensureRecurrencesExpanded = function(date, cb) {
          calledEnsure++;
          // we use the same date for all tests
          assert.deepEqual(date, expectedDate);

          if (!spyHandler) {
            setTimeout(cb, 0, null, false);
          } else {
            spyHandler(cb);
          }
        };
      });

      test('with no expansions required', function(done) {

        subject.expand(expandDate, function() {
          done(function() {
            assert.equal(calledEnsure, 1, 'calls ensure');
          });
        });
      });

      test('multiple expansions required', function(done) {
        // expected number of times
        var requiredTries = 3;

        spyHandler = function(cb) {
          if (calledEnsure === requiredTries) {
            // did not expand
            setTimeout(cb, 0, null, false);
          } else {
            // did expand
            setTimeout(cb, 0, null, true);
          }
        };

        subject.expand(expandDate, function() {
          done(function() {
            assert.equal(calledEnsure, requiredTries, 'number of tries');
          });
        });
      });

      test('expand beyond maximum', function(done) {
        spyHandler = function(cb) {
          Calendar.nextTick(cb.bind(this, null, true));
        };

        subject.expand(expandDate, function() {
          done(function() {
            assert.equal(calledEnsure, subject.maximumExpansions);
          });
        });
      });
    });
  });
});
