requireLib('calendar.js');
requireLib('db.js');
requireLib('ext/uuid.js');
requireLib('models/account.js');
requireLib('models/calendar.js');
requireLib('models/event.js');
requireLib('presets.js');

suite('db', function() {
  var subject;
  var name;
  var app;

  var dbName = 'calendar-db-test-db';

  suiteSetup(function(done) {

    // load the required sub-objects..
    app = testSupport.calendar.app();
    app.loadObject('Provider.Local', done);
  });

  suiteSetup(function(done) {
    this.timeout(10000);
    var db = new Calendar.Db(dbName);
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
    subject = new Calendar.Db(dbName);
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

  suite('#open', function() {
    suite('on version change', function() {

      setup(function(done) {
        subject.deleteDatabase(done);
      });

      suite('#setupDefaults', function() {
        var accountStore;
        var calendarStore;

        var storeLoads = {};

        teardown(function() {
          storeLoads = {};
          subject.close();
        });

        setup(function(done) {
          accountStore = subject.getStore('Account');
          calendarStore = subject.getStore('Calendar');
          subject.load(function() {
            Calendar.nextTick(function() {
              done();
            });
          });
        });

        ['Calendar', 'Account'].forEach(function(storeName) {
          setup(function(done) {
            var store = subject.getStore(storeName);
            var humanName = storeName.toLowerCase() + 's';

            store.all(function(err, all) {
              storeLoads[humanName] = all;
              done();
            });
          });
        });

        test('default account', function() {
          var list = Object.keys(storeLoads.accounts);

          assert.length(list, 1);

          var item = storeLoads.accounts[list[0]];

          assert.ok(item);
          assert.equal(item.providerType, 'Local', 'provider');
          assert.equal(item.preset, 'local', 'preset');
        });

        test('default calendar', function() {
          var list = Object.keys(storeLoads.calendars);
          assert.length(list, 1);

          var item = storeLoads.calendars[list[0]];

          assert.ok(item);
          assert.equal(item.remote.name, 'Offline calendar');

          var account = storeLoads.accounts[item.accountId];
          assert.ok(account, 'has account');
          assert.equal(account.providerType, 'Local');
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


      suite('Bug 887698', function() {
        /**
         * @type {Calendar.Store}
         */
        var busytimeStore, calendarStore, eventStore;

        /**
         * Keys for test events.
         * @const {number}
         */
        var EVENT_ONE_ID, EVENT_TWO_ID, EVENT_THREE_ID;

        /**
         * Keys for test busytimes.
         * @const {number}
         */
        var BUSYTIME_ONE_ID, BUSYTIME_TWO_ID, BUSYTIME_THREE_ID;

        /**
         * The version immediately before we fix the corrupt calendarIds.
         * @const {number}
         */
        var OLD_VERSION;

        var LOCAL_CALENDAR;

        var NEW_VERSION;

        setup(function(done) {

          // 13 is the version for v1.0.1
          OLD_VERSION = 13;

          // 15 is the version for v1.1
          NEW_VERSION = 15;

          LOCAL_CALENDAR = 'local-first';

          // These need their calendarId fixed.
          EVENT_ONE_ID = 'evt1';
          BUSYTIME_ONE_ID = 'bt1';

          // These are fine as is.
          EVENT_TWO_ID = 'evt2';
          BUSYTIME_TWO_ID = 'bt2';

          // These need to be deleted.
          EVENT_THREE_ID = 'evt3';
          BUSYTIME_THREE_ID = 'bt3';

          busytimeStore = subject.getStore('Busytime');
          calendarStore = subject.getStore('Calendar');
          eventStore = subject.getStore('Event');


          subject.open(OLD_VERSION, function() {
            calendarStore.persist(Factory('calendar',
              { _id: LOCAL_CALENDAR }), trans);

            [
              Factory('event', {
                calendarId: LOCAL_CALENDAR,
                _id: EVENT_ONE_ID
              }),
              Factory('event', {
                calendarId: 2,
                _id: EVENT_TWO_ID
              }),
              Factory('event', {
                calendarId: '3',
                _id: EVENT_THREE_ID
              })
            ].forEach(function(obj) {
              eventStore.persist(obj, trans);
            });

            [
              Factory('busytime', {
                eventId: EVENT_ONE_ID,
                calendarId: LOCAL_CALENDAR,
                _id: BUSYTIME_ONE_ID
              }),
              Factory('busytime', {
                eventId: EVENT_TWO_ID,
                calendarId: 2,
                _id: BUSYTIME_TWO_ID
              }),
              Factory('busytime', {
                eventId: EVENT_THREE_ID,
                calendarId: '3',
                _id: BUSYTIME_THREE_ID
              })
            ].forEach(function(obj) {
              busytimeStore.persist(obj, trans);
            });

            var trans = subject.transaction(
              ['busytimes', 'calendars', 'events'],
              'readwrite'
            );
            trans.oncomplete = function() {
              subject.close();
              done();
            };
          });
        });

        setup(function(done) {
          subject.open(NEW_VERSION, done);
        });

        teardown(function() {
          if (subject.isOpen) {
            subject.close();
          }
        });

        test('should turn event str calendarId into int', function(done) {
          var trans = subject.transaction(['events'], 'readwrite');
          var store = trans.objectStore('events');
          store.get(EVENT_ONE_ID).onsuccess = function(evt) {
            assert.strictEqual(evt.target.result.calendarId, LOCAL_CALENDAR);
            done();
          };
        });

        test('should not modify event int calendarId', function(done) {
          var trans = subject.transaction(['events'], 'readwrite');
          var store = trans.objectStore('events');
          var get = store.get(EVENT_TWO_ID).onsuccess = function(evt) {
            assert.strictEqual(evt.target.result.calendarId, 2);
            done();
          };
        });

        test('should delete event if its calendar died', function(done) {
          var trans = subject.transaction(['events'], 'readwrite');
          var store = trans.objectStore('events');
          var get = store.get(EVENT_THREE_ID).onsuccess = function(evt) {
            assert.strictEqual(evt.target.result, undefined);
            done();
          };
        });

        test('should turn busytime str calendarId into int', function(done) {
          var trans = subject.transaction(['busytimes'], 'readwrite');
          var store = trans.objectStore('busytimes');
          var get = store.get(BUSYTIME_ONE_ID).onsuccess = function(evt) {
            assert.strictEqual(evt.target.result.calendarId, LOCAL_CALENDAR);
            done();
          };
        });

        test('should not modify busytime int calendarId', function(done) {
          var trans = subject.transaction(['busytimes'], 'readwrite');
          var store = trans.objectStore('busytimes');
          var get = store.get(BUSYTIME_TWO_ID).onsuccess = function(evt) {
            assert.strictEqual(evt.target.result.calendarId, 2);
            done();
          };
        });

        test('should delete busytime if its calendar died', function(done) {
          var trans = subject.transaction(['busytimes'], 'readwrite');
          var store = trans.objectStore('busytimes');
          var get = store.get(BUSYTIME_THREE_ID).onsuccess = function(evt) {
            assert.strictEqual(evt.target.result, undefined);
            done();
          };
        });
      });

      suite('Bug 851003', function() {
        /** bug 912087: renable once tests pass consistently */
        return;

        /**
         * @type {Calendar.Store}
         */
        var busytimeStore, calendarStore, eventStore;

        /**
         * Keys for test events.
         * @const {number}
         */
        var EVENT_ONE_ID, EVENT_TWO_ID, EVENT_THREE_ID;

        /**
         * Keys for test busytimes.
         * @const {number}
         */
        var BUSYTIME_ONE_ID, BUSYTIME_TWO_ID, BUSYTIME_THREE_ID;

        /**
         * The version immediately before we fix the corrupt calendarIds.
         * @const {number}
         */
        var OLD_VERSION;

        setup(function(done) {
          OLD_VERSION = 14;

          // These need their calendarId fixed.
          EVENT_ONE_ID = 'evt1';
          BUSYTIME_ONE_ID = 'bt1';

          // These are fine as is.
          EVENT_TWO_ID = 'evt2';
          BUSYTIME_TWO_ID = 'bt2';

          // These need to be deleted.
          EVENT_THREE_ID = 'evt3';
          BUSYTIME_THREE_ID = 'bt3';

          busytimeStore = subject.getStore('Busytime');
          calendarStore = subject.getStore('Calendar');
          eventStore = subject.getStore('Event');


          subject.open(OLD_VERSION, function() {
            calendarStore.persist(Factory('calendar', { _id: 1 }), trans);

            [
              Factory('event', {
                calendarId: '1',
                _id: EVENT_ONE_ID
              }),
              Factory('event', {
                calendarId: 2,
                _id: EVENT_TWO_ID
              }),
              Factory('event', {
                calendarId: '3',
                _id: EVENT_THREE_ID
              })
            ].forEach(function(obj) {
              eventStore.persist(obj, trans);
            });

            [
              Factory('busytime', {
                eventId: EVENT_ONE_ID,
                calendarId: '1',
                _id: BUSYTIME_ONE_ID
              }),
              Factory('busytime', {
                eventId: EVENT_TWO_ID,
                calendarId: 2,
                _id: BUSYTIME_TWO_ID
              }),
              Factory('busytime', {
                eventId: EVENT_THREE_ID,
                calendarId: '3',
                _id: BUSYTIME_THREE_ID
              })
            ].forEach(function(obj) {
              busytimeStore.persist(obj, trans);
            });

            var trans = subject.transaction(
              ['busytimes', 'calendars', 'events'],
              'readwrite'
            );
            trans.oncomplete = function() {
              subject.close();
              done();
            };
          });
        });

        teardown(function() {
          if (subject.isOpen) {
            subject.close();
          }
        });

        test('should turn event str calendarId into int', function(done) {
          subject.open(OLD_VERSION + 1, function() {
            var trans = subject.transaction(['events'], 'readwrite');
            var store = trans.objectStore('events');
            store.get(EVENT_ONE_ID).onsuccess = function(evt) {
              assert.strictEqual(evt.target.result.calendarId, 1);
              done();
            };
          });
        });

        test('should not modify event int calendarId', function(done) {
          subject.open(OLD_VERSION + 1, function() {
            var trans = subject.transaction(['events'], 'readwrite');
            var store = trans.objectStore('events');
            var get = store.get(EVENT_TWO_ID).onsuccess = function(evt) {
              assert.strictEqual(evt.target.result.calendarId, 2);
              done();
            };
          });
        });

        test('should delete event if its calendar died', function(done) {
          subject.open(OLD_VERSION + 1, function() {
            var trans = subject.transaction(['events'], 'readwrite');
            var store = trans.objectStore('events');
            var get = store.get(EVENT_THREE_ID).onsuccess = function(evt) {
              assert.strictEqual(evt.target.result, undefined);
              done();
            };
          });
        });

        test('should turn busytime str calendarId into int', function(done) {
          subject.open(OLD_VERSION + 1, function() {
            var trans = subject.transaction(['busytimes'], 'readwrite');
            var store = trans.objectStore('busytimes');
            var get = store.get(BUSYTIME_ONE_ID).onsuccess = function(evt) {
              assert.strictEqual(evt.target.result.calendarId, 1);
              done();
            };
          });
        });

        test('should not modify busytime int calendarId', function(done) {
          subject.open(OLD_VERSION + 1, function() {
            var trans = subject.transaction(['busytimes'], 'readwrite');
            var store = trans.objectStore('busytimes');
            var get = store.get(BUSYTIME_TWO_ID).onsuccess = function(evt) {
              assert.strictEqual(evt.target.result.calendarId, 2);
              done();
            };
          });
        });

        test('should delete busytime if its calendar died', function(done) {
          subject.open(OLD_VERSION + 1, function() {
            var trans = subject.transaction(['busytimes'], 'readwrite');
            var store = trans.objectStore('busytimes');
            var get = store.get(BUSYTIME_THREE_ID).onsuccess = function(evt) {
              assert.strictEqual(evt.target.result, undefined);
              done();
            };
          });
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

});
