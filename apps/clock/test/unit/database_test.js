requireApp('clock/js/utils.js');
requireApp('clock/js/database.js');

requireApp('clock/test/unit/mocks/mock_lazy_loader.js');

suite('Database Test', function() {

  var ll = window.LazyLoader;
  window.LazyLoader = window.LazyLoader || {};

  suiteSetup(function() {
    LazyLoader = MockLazyLoader;
  });

  suiteTeardown(function() {
    if (typeof ll === 'undefined') {
      delete window.LazyLoader;
    } else {
      LazyLoader = ll;
    }
  });

  suite('Database creation', function() {

    this.slow(500);
    this.timeout(5000);

    var db = null;

    setup(function(done) {
      SchemaVersion.removeSchemaVersions();
      var req = indexedDB.deleteDatabase('testDB');
      req.onsuccess = (function(ev) {
        db = new Database({
          name: 'testDB',
          version: 1,
          schemas: []
        });
        done();
      }).bind(this);
      req.onerror = function(ev) {
        done(new Error(JSON.stringify(ev)));
      };
    });

    teardown(function(done) {
      var req = indexedDB.deleteDatabase('testDB');
      req.onsuccess = function() {
        done();
      };
      req.onblocked = function() {
        done(new Error('teardown should not block'));
      };
    });

    test('Add a schema', function() {
      var sv = new SchemaVersion('testDB', 1, {
        initializer: function(transaction, callback) {
          return 11;
        },
        upgrader: function(transaction, callback) {
          return 22;
        },
        downgrader: function(transaction, callback) {
          return 33;
        }
      });
      sv.register(db);
      assert.equal(db.initializers.length, 1);
      assert.equal(db.initializers[0].fn(), 11);
      assert.equal(db.upgraders.length, 1);
      assert.equal(db.upgraders[0].fn(), 22);
      assert.equal(db.downgraders.length, 1);
      assert.equal(db.downgraders[0].fn(), 33);
    });

    test('Get a version, nonexistent', function(done) {
      db.getLatestVersion(db.name, function(err, version, effective) {
        assert.ok(!err);
        assert.equal(version, 0);
        assert.ok(!effective);
        done();
      });
    });

    test('Get a connection fails with no schemas', function(done) {
      db.query(function(err, conn) {
        assert.ok(err);
        assert.ok(!conn);
        done();
      });
    });

    var createSchema = function() {
      return [
        new SchemaVersion('testDB', 1, {
          initializer: function(trans, cb) {
            /*
              objA stores {
                id: <key>,
                a: <even number>
                str: <string>
              }
            */
            var store1 = trans.db.createObjectStore('objA', {
              keyPath: 'id', autoincrement: true
            });
            store1.createIndex('ai', 'a', {
              unique: false, multiEntry: false
            });
            /*
              objB stores {
                b: <number>
              }
            */
            var store2 = trans.db.createObjectStore('objB', {
              keyPath: null, autoincrement: null
            });
            store2.createIndex('bi', 'b', {
              unique: true, multiEntry: false
            });
            cb();
          },
          upgrader: function(trans, cb) {
            // Version 2 changes:
            // All objA.a data even -> odd
            // All objB data -> objC
            var curreq;
            var db = trans.db;
            var finalizer = Utils.async.namedParallel([
              'aUp', 'bUp'], function(err) {
              cb(err);
            });
            var objC = db.createObjectStore('objC', {
              keyPath: null, autoincrement: true
            });
            objC.createIndex('ci', 'c', {
              unique: true, multiEntry: false
            });
            var objB = trans.objectStore('objB', IDBTransaction.READ);
            var curreqB = objB.openCursor(undefined, 'next');
            curreqB.onsuccess = function(ev) {
              var cursor = curreqB.result;
              if (!cursor) {
                // all objB data -> objC, now delete
                db.deleteObjectStore('objB');
                finalizer.bUp();
                return;
              }
              var getreq = objB.get(cursor.key);
              getreq.onsuccess = function(ev) {
                var bval = getreq.result;
                var cval = { c: bval.b };
                var putreq = objC.put(cval, cursor.key);
                putreq.onsuccess = function(ev) {
                  cursor.continue();
                };
                putreq.onerror = function(ev) {
                  finalizer.bUp(putreq.error);
                };
              };
              getreq.onerror = function(ev) {
                finalizer.bUp(getreq.error);
              };
            };
            curreqB.onerror = function(ev) {
              finalizer.bUp(curreqB.error);
            };

            var objA = trans.objectStore('objA', IDBTransaction.READ_WRITE);
            var curreqA = objA.openCursor(undefined, 'next');
            curreqA.onsuccess = function(ev) {
              var cursor = curreqA.result;
              if (!cursor) {
                finalizer.aUp();
                return;
              }
              var getreq = objA.get(cursor.key);
              getreq.onsuccess = function(ev) {
                var value = getreq.result;
                value.a = ((getreq.result.a / 2) | 0) * 2 + 1;
                var upreq = cursor.update(value);
                upreq.onsuccess = function(ev) {
                  cursor.continue();
                };
                upreq.onerror = function(ev) {
                  finalizer.aUp(upreq.error);
                };
              };
              getreq.onerror = function(ev) {
                finalizer.aUp(getreq.error);
              };
            };
            curreqA.onerror = function(ev) {
              finalizer.aUp(curreqA.error);
            };
          }
        }),
        new SchemaVersion('testDB', 2, {
          initializer: function(trans, cb) {
            /*
              objA stores {
                id: <key>,
                a: <odd number>
                str: <string>
              }
            */
            var store1 = trans.db.createObjectStore('objA', {
              keyPath: 'id', autoincrement: true
            });
            store1.createIndex('ai', 'a', {
              unique: false, multiEntry: false
            });
            /*
              objC stores {
                c: <number>
              }
            */
            var store3 = trans.db.createObjectStore('objC', {
              keyPath: null, autoincrement: false
            });
            store3.createIndex('ci', 'c', {
              unique: true, multiEntry: false
            });
            cb();
          },
          downgrader: function(trans, cb) {
            // Version 1 back-changes:
            // All objA.a data odd -> even
            // All objC data -> objB
            var curreq;
            var db = trans.db;
            var finalizer = Utils.async.namedParallel([
              'aDown', 'bDown'], function(err) {
              cb(err);
            });
            var objB = db.createObjectStore('objB', {
              keyPath: null, autoincrement: true
            });
            objB.createIndex('bi', 'b', {
              unique: true, multiEntry: false
            });
            var objC = trans.objectStore('objC', IDBTransaction.READ);
            var curreqC = objC.openCursor(undefined, 'next');
            curreqC.onsuccess = function(ev) {
              var cursor = curreqC.result;
              if (!cursor) {
                // all objC data -> objB, now delete
                db.deleteObjectStore('objC');
                finalizer.bDown();
                return;
              }
              var getreq = objC.get(cursor.key);
              getreq.onsuccess = function(ev) {
                var cval = getreq.result;
                var bval = { b: cval.c };
                var putreq = objB.put(bval, cursor.key);
                putreq.onsuccess = function(ev) {
                  cursor.continue();
                };
                putreq.onerror = function(ev) {
                  finalizer.bDown(putreq.error);
                };
              };
              getreq.onerror = function(ev) {
                finalizer.bDown(getreq.error);
              };
            };
            curreqC.onerror = function(ev) {
              finalizer.bDown(curreqC.error);
            };

            var objA = trans.objectStore('objA', IDBTransaction.READ_WRITE);
            var curreqA = objA.openCursor(undefined, 'next');
            curreqA.onsuccess = function(ev) {
              var cursor = curreqA.result;
              if (!cursor) {
                finalizer.aDown();
                return;
              }
              var getreq = objA.get(cursor.key);
              getreq.onsuccess = function(ev) {
                var value = getreq.result;
                value.a = ((getreq.result.a / 2) | 0) * 2;
                var upreq = cursor.update(value);
                upreq.onsuccess = function(ev) {
                  cursor.continue();
                };
                upreq.onerror = function(ev) {
                  finalizer.aDown(upreq.error);
                };
              };
              getreq.onerror = function(ev) {
                finalizer.aDown(getreq.error);
              };
            };
            curreqA.onerror = function(ev) {
              finalizer.aDown(curreqA.error);
            };
          }
        })
      ];
    };

    var populateV1DB = function(callback) {
      var v1db = new Database({ name: 'testDB', version: 1 });
      v1db.query(function(err, conn) {
        var trans = conn.transaction(['objA', 'objB'], 'readwrite');
        var objA = trans.objectStore('objA');
        objA.put({ id: 1, a: 2, str: 'two' });
        objA.put({ id: 2, a: 4, str: 'four' });
        objA.put({ id: 3, a: 6, str: 'six' });
        var objB = trans.objectStore('objB');
        objB.put({ b: 42 }, 1);
        objB.put({ b: 96 }, 2);
        objB.put({ b: 112 }, 3);
        conn.close();
        callback();
      });
    };

    var populateV2DB = function(callback) {
      var v2db = new Database({ name: 'testDB', version: 2 });
      v2db.query(function(err, conn) {
        var trans = conn.transaction(['objA', 'objC'], 'readwrite');
        var objA = trans.objectStore('objA');
        objA.put({ id: 1, a: 3, str: 'three' });
        objA.put({ id: 2, a: 5, str: 'five' });
        objA.put({ id: 3, a: 7, str: 'seven' });
        var objB = trans.objectStore('objC');
        objB.put({ c: 42 }, 1);
        objB.put({ c: 96 }, 2);
        objB.put({ c: 112 }, 3);
        conn.close();
        callback();
      });

    };

    test('Get a connection succeeds with a schemas', function(done) {
      createSchema();
      db.query(function(err, conn) {
        assert.ok(!err);
        assert.ok(conn);
        conn.close();
        done();
      });
    });

    test('Get a connection non-existent initializes correctly', function(done) {
      createSchema();
      db.query(function(err, conn) {
        assert.deepEqual(Array.prototype.slice.call(conn.objectStoreNames)
          .sort(),
          [db.effectiveVersionName, 'objA', 'objB'].sort());
        conn.close();
        done();
      });
    });

    test('Get version existent', function(done) {
      var getVersion = function() {
        db.getLatestVersion(db.name, function(err, version, effective) {
          assert.ok(!err);
          assert.equal(version, 1);
          assert.equal(version, 1);
          done();
        });
      };
      createSchema();
      db.query(function(err, conn) {
        conn.close();
        getVersion();
      });
    });

    var extractValues = function(conn, callback) {
      var ret = {};
      var gen = Utils.async.generator(function(err) {
        callback(err, ret);
      });
      var done = gen();
      for (var i = 0; i < conn.objectStoreNames.length; i++) {
        (function(i, cb) {
          var osName = conn.objectStoreNames[i];
          ret[osName] = new Map();
          var trans = conn.transaction(osName, 'readonly');
          var os = trans.objectStore(osName);
          var curreq = os.openCursor(undefined, 'next');
          curreq.onsuccess = function(ev) {
            var cursor = curreq.result;
            if (!cursor) {
              cb();
              return;
            }
            var getreq = os.get(cursor.key);
            getreq.onsuccess = function(ev) {
              ret[osName].set(cursor.key, getreq.result);
              try {
                cursor.continue();
              } catch (err) {
                cb();
              }
            };
            getreq.onerror = function(ev) {
              cb(getreq.error);
            };
          };
          curreq.onerror = function(ev) {
            cb(curreq.error);
          };
        })(i, gen());
      }
      done();
    };

    var matchValues = function(a, b) {
      if (Utils.data.defaultCompare(
        Object.keys(a).sort(),
        Object.keys(b).sort()) !== 0) {
        return false;
      }
      for (var i in a) {
        var ai = a[i], bi = b[i];
        for (var k of ai) {
          if (!bi.has(k[0]) || indexedDB.cmp(k[1], bi.get(k[0]))) {
            return false;
          }
        }
      }
      return true;
    };

    test('Upgrade the database', function(done) {
      createSchema();
      var versionCheck = function(err) {
        if (err) {
          done(err);
        }
        db.getLatestVersion(db.name, function(err, version, effective) {
          assert.ok(!err);
          assert.equal(version, 2);
          assert.equal(version, 2);
          done();
        });
      };
      populateV1DB(function() {
        db.version = 2;
        db.query(function(err, conn) {
          assert.equal(conn.version, 2);
          assert.deepEqual(Array.prototype.slice.call(conn.objectStoreNames)
            .sort(),
            [db.effectiveVersionName, 'objA', 'objC'].sort());
          var extract = extractValues(conn, function(err, value) {
            assert.ok(!err);
            assert.deepEqual(value[db.effectiveVersionName].get(0), {
              number: 2
            });
            assert.deepEqual(value['objA'].get(1), {
              id: 1, a: 3, str: 'two'
            });
            assert.deepEqual(value['objA'].get(2), {
              id: 2, a: 5, str: 'four'
            });
            assert.deepEqual(value['objA'].get(3), {
              id: 3, a: 7, str: 'six'
            });
            assert.deepEqual(value['objC'].get(1), { c: 42 });
            assert.deepEqual(value['objC'].get(2), { c: 96 });
            assert.deepEqual(value['objC'].get(3), { c: 112 });
            conn.close();
            versionCheck(err);
          });
        });
      });
    });

    test('Downgrade the database', function(done) {
      createSchema();
      var versionCheck = function(err) {
        if (err) {
          done(err);
        }
        db.getLatestVersion(db.name, function(err, version, effective) {
          assert.ok(!err);
          assert.equal(version, 2);
          assert.equal(effective, 1);
          done();
        });
      };
      populateV2DB(function() {
        db.version = 1;
        db.query(function(err, conn) {
          assert.deepEqual(Array.prototype.slice.call(conn.objectStoreNames)
            .sort(),
            [db.effectiveVersionName, 'objA', 'objB'].sort());
          var extract = extractValues(conn, function(err, value) {
            assert.ok(!err);
            assert.deepEqual(value[db.effectiveVersionName].get(0), {
              number: 1
            });
            assert.deepEqual(value['objA'].get(1), {
              id: 1, a: 2, str: 'three'
            });
            assert.deepEqual(value['objA'].get(2), {
              id: 2, a: 4, str: 'five'
            });
            assert.deepEqual(value['objA'].get(3), {
              id: 3, a: 6, str: 'seven'
            });
            assert.deepEqual(value['objB'].get(1), { b: 42 });
            assert.deepEqual(value['objB'].get(2), { b: 96 });
            assert.deepEqual(value['objB'].get(3), { b: 112 });
            conn.close();
            versionCheck(err);
          });
        });
      });
    });
  });
});
