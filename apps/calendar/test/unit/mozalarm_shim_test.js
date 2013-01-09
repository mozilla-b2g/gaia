requireApp('calendar/js/mozalarm_shim.js');

suite('mozAlarms shim', function() {
  var subject;
  var defaultInterval;

  suiteSetup(function() {
    subject = navigator.mozAlarms;
    defaultInterval = subject._interval;
    subject._interval = 10;
  });

  suiteTeardown(function() {
    subject._interval = defaultInterval;
  });

  // remove the database between runs
  suiteSetup(function() {
    var idb = window.indexedDB;
    idb.deleteDatabase('_mozAlarmShim');
  });

  test('shim available', function() {
    assert.ok(subject, 'navigator.mozAlarms exists');
    assert.ok(subject.getAll, 'has getAll');
    assert.ok(subject.remove, 'has remove');
    assert.ok(subject.add, 'has add');
  });

  test('round trip', function(done) {
    this.timeout(100000);

    var date = new Date();
    date.setFullYear(date.getFullYear() + 1);

    var flag = 'honorTimezone';
    var data = { someData: true };
    var dbId;

    var add = subject.add(date, flag, data);

    add.onsuccess = function(e) {
      assert.ok(e);
      assert.ok(e.target.result, 'has id');
      dbId = e.target.result;

      // get all the records
      var all = subject.getAll();
      all.onsuccess = function(allE) {

        // verify we persisted correctly
        var allData = allE.target.result;
        assert.length(allData, 1);
        assert.deepEqual(allData[0], {
          trigger: date,
          respectTimezone: flag,
          data: data
        });

        // remove the id
        subject.remove(dbId).onsuccess = function() {
          // get them all again
          subject.getAll().onsuccess = function(e) {
            var list = e.target.result;
            done(function() {
              //verify its gone
              assert.length(list, 0);
            });
          };
        };
      };
    };
  });

  test('alarm in the future', function(done) {
    var date = new Date();
    date.setFullYear(date.getFullYear() + 1);

    navigator.mozSetMessageHandler('alarm', function() {
      throw new Error('fired alarm that occurs in the future!');
    });

    var req = subject.add(date, 'honorTimezone');
    req.onsuccess = function(e) {
      var id = e.target.result;
      // remove it so not to hurt other tests
      setTimeout(function() {
        subject.remove(id).onsuccess = function() {
          done();
        };
      }, subject._interval * 3);
    };
  });

  test('alarm that will trigger', function(done) {
    this.timeout(10000);

    var now = new Date();
    var data = { now: now };

    now.setMilliseconds(now.getMilliseconds() + 10);

    navigator.mozSetMessageHandler('alarm', function(msg) {
      assert.ok(msg, 'has message');
      assert.deepEqual(msg.data, data, 'has message.data');

      subject.getAll().onsuccess = function(e) {
        done(function() {
          assert.length(e.target.result, 0, 'removes alarm');
        });
      };
    });

    subject.add(now, 'honorTimezone', data);
  });

  test('attempt to set alarm in the past', function(done) {
    this.timeout(10000);

    var date = new Date();
    date.setMinutes(date.getMinutes() - 1);

    navigator.mozSetMessageHandler('alarm', function(msg) {
      done(new Error('should not trigger alarm'));
    });

    subject.add(date, 'honorTimezone', {}).onerror = function() {
      subject.getAll().onsuccess = function(e) {
        done(function() {
          assert.length(e.target.result, 0, 'does not add alarms');
        });
      };
    };
  });

});
