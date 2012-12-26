requireApp('calendar/test/unit/helper.js', function() {
  requireLib('ext/uuid.js');
  requireLib('db.js');
  requireLib('models/account.js');
  requireLib('models/calendar.js');
  requireLib('presets.js');
});

suite('db', function() {
  var subject;
  var name;

  suiteSetup(function(done) {
    this.timeout(10000);
    var db = testSupport.calendar.db();
    db.deleteDatabase(function(err, success) {
      assert.ok(!err, 'should not have an error when deleting db');
      assert.ok(success, 'should be able to delete the db');
      done();
    });
  });

  suiteTeardown(function() {
    subject.close();
  });

  setup(function() {
    subject = testSupport.calendar.db();
  });

  test('#getStore', function() {
    var result = subject.getStore('Account');
    assert.instanceOf(result, Calendar.Store.Account);

    assert.equal(result.db, subject);
    assert.equal(subject._stores['Account'], result);
  });

  test('initialization', function() {
    // create test db
    assert.ok(subject.name);
    assert.include(subject.name, 'test');
    assert.ok(subject.store);

    assert.instanceOf(subject, Calendar.Responder);
    assert.deepEqual(subject._stores, {});
    assert.isTrue(Object.isFrozen(subject.store));
  });

  test('#_openStore', function() {
    var Store = function(db) {
      this.db = db;
    };

    Store.prototype = {
      __proto__: Calendar.Store.Abstract.prototype,

      onopen: function() {
        this.open = true;
      }
    };
  });

  suite('#transaction', function() {

    setup(function(done) {
      subject.open(function() {
        done();
      });
    });

    teardown(function() {
      subject.close();
    });

    test('result', function(done) {
      var trans = subject.transaction(['events'], 'readonly');

      assert.equal(trans.mode, 'readonly');

      trans.onabort = function() {
        done();
      };

      trans.abort();
    });

  });

  test('#load', function(done) {
    var loaded = {
      account: false,
      calendar: false,
      setting: false
    };

    var account = subject.getStore('Account');
    var calendar = subject.getStore('Calendar');
    var setting = subject.getStore('Setting');

    setting.load = function(callback) {
      callback(null, {});
      loaded.setting = true;
    };

    account.load = function(callback) {
      callback(null, {});
      loaded.account = true;
    };

    calendar.load = function(callback) {
      callback(null, {});
      loaded.calendar = true;
    };

    assert.ok(!subject.isOpen);

    subject.load(function(err) {
      if (err) {
        done(err);
        return;
      }
      assert.ok(subject.isOpen);
      done(function() {
        assert.ok(loaded.account, 'should load account');
        assert.ok(loaded.calendar, 'should load calendar');
        assert.ok(loaded.setting), 'should load settings';
        subject.close();
      });
    });
  });

  suite('#open', function() {
    suite('on version change', function() {

      setup(function(done) {
        subject.deleteDatabase(done);
      });

      suite('#setupDefaults', function() {
        var accountStore;
        var calendarStore;

        setup(function(done) {
          accountStore = subject.getStore('Account');
          calendarStore = subject.getStore('Calendar');
          subject.open(function() {
            subject.load(function() {
              setTimeout(function() {
                done();
              }, 0);
            });
          });
        });

        teardown(function() {
          subject.close();
        });

        test('default account', function() {
          var list = Object.keys(accountStore.cached);

          assert.length(list, 1);

          var item = accountStore.cached[list[0]];

          assert.ok(item);
          assert.equal(item.providerType, 'Local', 'provider');
          assert.equal(item.preset, 'local', 'preset');
        });

        test('default calendar', function() {
          var list = Object.keys(calendarStore.cached);
          assert.length(list, 1);

          var item = calendarStore.cached[list[0]];

          assert.ok(item);
          assert.equal(item.remote.name, 'Offline calendar');

          var acc = calendarStore.accountFor(item);
          assert.ok(acc, 'has account');
          assert.equal(acc.providerType, 'Local');
        });

      });

      test('creation of stores', function(done) {
        var finishedOpen = false;

        assert.ok(!subject.connection, 'connection should be closed');

        subject.on('open', function() {
          if (!finishedOpen) {
            done(new Error(
              'fired callback/event out of order ' +
              'callback should fire then events'
            ));
          } else {
            done(function() {
              // check that each store now exists
              var stores = subject.connection.objectStoreNames;
              var actualStore;
              for (actualStore in subject.store) {
                assert.ok(
                  (stores.contains(actualStore)),
                  actualStore + ' was not created'
                );
              }
            });
            subject.close();
          }
        });

        subject.open(function() {
          assert.ok(subject.connection, 'has connection');
          assert.ok(subject.isOpen, 'is open');
          assert.ok(subject.version, 'has version');
          assert.equal(subject.oldVersion, 0, 'upgraded from 0');
          assert.isTrue(subject.hasUpgraded, 'has upgraded');
          assert.equal(subject.connection.name, subject.name);
          finishedOpen = true;
        });
      });
    });

    suite('after version change', function() {
      teardown(function() {
        subject.close();
      });

      setup(function(done) {
        // make sure db is open
        subject.open(function() {
          done();
        });
      });

      test('open', function(done) {
        // close it
        subject.close();
        subject = new Calendar.Db(subject.name);

        subject.open(function() {
          done();
        });
      });

    });
  });

  suite('#_upgradeAccountUrls', function() {
    var original;

    function stageData(done) {
      var trans = subject.transaction('accounts', 'readwrite');
      var accountStore = trans.objectStore('accounts');

      // not using factory for a reason we may never change
      // this test but the factory will change at some point
      // we are trying to emulate old data so it should not
      // be updated along with the factory.
      original = {
        custom: {
          _id: 'custom',
          preset: 'caldav',
          url: '/caldavfoo'
        },
        yahoo: {
          _id: 'yahoo',
          preset: 'yahoo',
          url: '/foo'
        }
      };

      accountStore.put(original.yahoo);
      accountStore.put(original.custom);

      trans.onerror = function(event) {
        done(event.target.error.name);
      };

      trans.oncomplete = function() {
        done();
      };
    }

    // first setup is to ensure no database exists
    // and set its version to # 9
    setup(function(done) {
      this.timeout(12000);
      subject.deleteDatabase(function(err) {
        if (err) {
          done(err);
          return;
        }
        subject.open(11, function() {
          stageData(function() {
            subject.close();
            subject.open(12, done);
          });
        });
      });
    });

    teardown(function() {
      subject.close();
    });

    test('convert url to entrypoint/calendarHome', function(done) {
      var accounts;

      var trans = subject.transaction('accounts', 'readwrite');
      var store = trans.objectStore('accounts');

      store.mozGetAll().onsuccess = function(e) {
        var all = e.target.result;
        var accounts = {};

        all.forEach(function(item) {
          var id = item._id;
          accounts[item._id] = item;

          assert.ok(!item.url, 'should remove url for ' + id);
          assert.ok(item.entrypoint, 'should have entrypoint for ' + id);
          assert.ok(item.calendarHome, 'should have calendar home for ' + id);

          assert.equal(
            item.calendarHome,
            original[id].url,
            'should set calendar home for: ' + id
          );
        });

        assert.equal(
          accounts.yahoo.entrypoint,
          Calendar.Presets.yahoo.options.entrypoint,
          'should set entrypoint for known providers'
        );

        assert.equal(
          accounts.custom.entrypoint,
          original.custom.url,
          'should keep url as entrypoint when ungrade is unavailable'
        );

        done();
      };
    });
  });

  suite('#_upgradeMoveICALComponents', function() {
    var icalEvents = [];
    var normalEvents = [];

    function stageData(done) {
      var trans = subject.transaction('events', 'readwrite');
      var eventStore = trans.objectStore('events');


      trans.oncomplete = function() {
        done();
      };

      // stage some data to verify we don't
      // mutate records without icalComponent.
      for (var i = 0; i < 5; i++) {
        var normalEvent = Factory('event', { _id: i });
        eventStore.add(normalEvent);
        normalEvents.push(normalEvent);
      }

      // stage the icalComponent events
      for (var i = 10; i < 20; i++) {
        var icalEvent = Factory('event', {
          _id: i,
          remote: {
            icalComponent: { nth: i }
          }
        });

        eventStore.add(icalEvent);
        icalEvents.push(icalEvent);
      }
    }

    // first setup is to ensure no database exists
    // and set its version to # 9
    setup(function(done) {
      this.timeout(12000);

      icalEvents.length = 0;
      normalEvents.length = 0;

      subject.deleteDatabase(function(err) {
        if (err) {
          done(err);
          return;
        }
        subject.open(9, function() {
          stageData(function() {
            subject.close();
            subject.open(10, done);
          });
        });
      });
    });

    teardown(function() {
      subject.close();
    });

    test('verify icalComponent was moved to new store', function(done) {
      var trans = subject.transaction(
        ['events', 'icalComponents']
      );

      trans.oncomplete = function() {
        done(function() {
          // verify all the events icalComponets are moved over;
          icalEvents.forEach(function(item) {
            assert.ok(
              componentsById[item._id],
              'component exists # ' + item._id
            );

            assert.deepEqual(
              componentsById[item._id].data,
              item.remote.icalComponent
            );

            assert.ok(
              !eventsById[item._id].remote.icalComponent,
              'removes component'
            );
          });
        });
      };

      var eventsStore = trans.objectStore('events');
      var componentsStore = trans.objectStore('icalComponents');

      var eventsById = {};
      var componentsById = {};

      function map(field, data, target) {
        for (var i in data) {
          target[data[i][field]] = data[i];
        }
      }

      eventsStore.mozGetAll().onsuccess = function(e) {
        map('_id', e.target.result, eventsById);
      };

      componentsStore.mozGetAll().onsuccess = function(e) {
        map('eventId', e.target.result, componentsById);
      };

    });
  });

  suite('#_resetCaldavEventData', function() {
    var localAccount;
    var caldavAccount;
    var caldavCalendar;
    var localCalendar;

    var syncCalled = false;

    function stageData(done) {
      var trans = subject.transaction(
        [
          'accounts', 'calendars', 'events',
          'alarms', 'icalComponents'
        ],
        'readwrite'
      );

      trans.oncomplete = function() {
        done();
      };

      localAccount = Factory('account', {
        _id: 1,
        providerType: 'Local'
      });

      caldavAccount = Factory('account', {
        _id: 2,
        providerType: 'Caldav'
      });

      var accountStore = trans.objectStore('accounts');

      accountStore.add(localAccount);
      accountStore.add(caldavAccount);

      var calendarStore = trans.objectStore('calendars');

      caldavCalendar = Factory('calendar', {
        remote: { name: 'remove me' },
        accountId: caldavAccount._id
      });

      localCalendar = Factory('calendar', {
        accountId: localAccount._id
      });

      calendarStore.add(caldavCalendar);
      calendarStore.add(localCalendar);
    }

    // first setup is to ensure no database exists
    // and set its version to # 9
    setup(function(done) {
      this.timeout(12000);

      Calendar.App.syncController = {
        all: function() {
          syncCalled = true;
        }
      };

      subject.deleteDatabase(function(err) {
        if (err) {
          done(err);
          return;
        }
        subject.open(10, function() {
          stageData(function() {
            subject.close();
            subject.open(11, function() {
              subject.emit('loaded');
              done();
            });
          });
        });
      });
    });

    teardown(function() {
      subject.close();
    });

    test('verify icalComponent was moved to new store', function(done) {
      var trans = subject.transaction('calendars');
      var store = trans.objectStore('calendars');

      assert.ok(syncCalled, 'calls resync');

      store.mozGetAll().onsuccess = function(event) {
        var result = event.target.result;
        assert.length(result, 1);

        assert.deepEqual(
          result[0],
          localCalendar
        );

        done();
      };
    });
  });

});
