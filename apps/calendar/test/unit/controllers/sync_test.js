requireApp('calendar/test/unit/helper.js', function() {
  requireLib('models/calendar.js');
  requireLib('models/account.js');
  requireLib('controllers/sync.js');
});

suite('controllers/sync', function() {

  var account;
  var calendar;
  var event;

  var subject;
  var app;
  var db;

  var accModel;

  setup(function(done) {
    this.timeout(10000);

    app = testSupport.calendar.app();
    subject = new Calendar.Controllers.Sync(app);

    calendar = app.store('Calendar');
    account = app.store('Account');
    event = app.store('Event');

    accModel = Factory('account');

    event.db.open(function(err) {
      if (err) {
        done(err);
        return;
      }
      done();
    });
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      event.db,
      ['accounts', 'calendars', 'events', 'busytimes'],
      done
    );
  });

  teardown(function() {
    event.db.close();
  });

  test('#observe', function(done) {
    var model = Factory('account');
    var calledWith;
    var syncStart;
    var syncEnd;

    function complete() {
      done(function() {
        assert.equal(calledWith[0], model);
        assert.ok(syncStart, 'start sync');
        assert.ok(syncEnd, 'end sync');
      });
    };

    subject.on('sync start', function() {
      syncStart = true;
    });

    subject.on('sync complete', function() {
      syncEnd = true;
    });

    subject.observe();

    subject._syncAccount = function(data) {
      calledWith = arguments;
      setTimeout(complete, 0);
      var cb = arguments[1];
      cb();
    }

    account.persist(model, function() {
      console.log(arguments[1]);
    });
  });

  suite('#sync', function() {
    var list = [];

    setup(function() {
      list.push(Factory('account'));
      list.push(Factory('account'));
    });

    setup(function(done) {
      account.persist(list[0], done);
    });

    setup(function(done) {
      account.persist(list[1], done);
    });

    test('sync account', function(done) {
      var calledModels = [];

      subject._syncAccount = function(model, cb) {
        calledModels.push(model);
        setTimeout(function() {
          cb(null);
        }, 0);
      }

      subject.sync(function() {
        done(function() {
          assert.deepEqual(
            calledModels,
            list
          );
        });
      });
    });
  });

  suite('#_syncAccount', function() {
    var list;

    setup(function(done) {
      list = [];
      account.persist(accModel, done);
    });

    function addCalendar() {
      setup(function(done) {
        var item = Factory('calendar', {
          accountId: accModel._id
        });

        list.push(item);
        calendar.persist(item, done);
      });
    }

    addCalendar();
    addCalendar();

    var syncedCals;

    setup(function() {
      syncedCals = [];
      calendar.sync = function(acc, cal, cb) {
        setTimeout(function() {
          syncedCals.push([acc, cal]);
          cb(null);
        }, 0);
      };
    });

    test('sync /w calendars', function(done) {
      var calledAcc;

      account.sync = function(model, cb) {
        setTimeout(function() {
          calledAcc = model;
          cb(null);
        }, 0);
      }

      subject._syncAccount(accModel, function(err) {
        if (err) {
          done(err);
          return;
        }

        done(function() {
          assert.deepEqual(
            syncedCals,
            [
              [accModel, list[0]],
              [accModel, list[1]]
            ]
          );

          assert.equal(
            calledAcc,
            accModel
          );
        });
      });
    });

    test('sync - account fail', function(done) {
      account.sync = function(model, cb) {
        setTimeout(function() {
          cb(new Error('err'));
        }, 0);
      };

      subject._syncAccount(accModel, function(err) {
        done(function() {
          assert.equal(syncedCals.length, 0);
          assert.instanceOf(err, Error);
        });
      });
    });

  });

});
