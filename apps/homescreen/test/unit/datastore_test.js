/* global MockIndexedDB, MockNavigatorDatastore, mockLocalStorage, Datastore */
'use strict';

require('/shared/test/unit/mocks/mock_indexedDB.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('mocks/mock_localStorage.js');
require('/js/datastore.js');

suite('Datastore', () => {
  var mockIndexedDB;
  var realNavigatorDatastores;
  var realLocalStorage;
  var datastoreName = 'datastore_name_example';
  var bookmarks;

  setup(() => {
    mockIndexedDB = new MockIndexedDB();
    mockLocalStorage.mSetup();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => mockLocalStorage
    });
    realNavigatorDatastores = navigator.getDataStores;
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;

    bookmarks = new Datastore(datastoreName);
  });

  teardown(() => {
    mockIndexedDB.mTearDown();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => realLocalStorage
    });
    navigator.getDataStores = realNavigatorDatastores;

    bookmarks = null;
  });

  suite('Datastore constructor', () => {
    test('should store the name of the datastore', () => {
      assert.equal(bookmarks.name, datastoreName);
      assert.isTrue(bookmarks.revisionName.includes(datastoreName));
      assert.isTrue(bookmarks.idbName.includes(datastoreName));
      assert.isTrue(bookmarks.storeName.includes(datastoreName));
    });
  });

  suite('Datastore#init()', () => {
    test('should open indexedDB and Datastore instances', done => {
      assert.isNull(bookmarks.db);
      assert.isNull(bookmarks.datastore);
      bookmarks.init().then(() => {
        assert.isObject(bookmarks.db);
        assert.isObject(bookmarks.datastore);
        done();
      });
    });
  });

  suite('Datastore#upgradeSchema()', () => {
    var names = [];
    var onUpgradeNeededEvent = version => {
      return {
        target: {
          result: {
            createObjectStore: (name, options) => {
              names.push(name);
              return {
                createIndex: (name, keyPath, options) => {}
              };
            }
          }
        },
        oldVersion: version
      };
    };

    setup(() => {
      names = [];
    });

    test('should create an object store with older versions', () => {
      bookmarks.upgradeSchema(onUpgradeNeededEvent(0));
      assert.deepEqual(names, [bookmarks.storeName]);
    });

    test('should not create object stores with newer versions', () => {
      bookmarks.upgradeSchema(onUpgradeNeededEvent(2));
      assert.equal(names.length, 0);
    });
  });

  suite('Datastore#synchronise()', () => {
    var stub;

    setup(done => {
      bookmarks.init().then(done);
    });

    teardown(() => {
      stub.restore();
    });

    test('should call set() on update', done => {
      stub = sinon.stub(bookmarks, 'set');
      bookmarks.datastore._tasks[0] = {
        operation: 'update',
        id: 0,
        data: {}
      };
      bookmarks.synchronise().then(() => {
        assert.isTrue(stub.calledOnce);
        done();
      });
    });

    test('should call set() on add', done => {
      stub = sinon.stub(bookmarks, 'set');
      bookmarks.datastore._tasks[0] = {
        operation: 'add',
        id: 0,
        data: {}
      };
      bookmarks.synchronise().then(() => {
        assert.isTrue(stub.calledOnce);
        done();
      });
    });

    test('should call set() on remove', done => {
      stub = sinon.stub(bookmarks, 'remove');
      bookmarks.datastore._tasks[0] = {
        operation: 'remove',
        id: 0,
        data: {}
      };
      bookmarks.synchronise().then(() => {
        assert.isTrue(stub.calledOnce);
        done();
      });
    });

    test('should call set() on clear', done => {
      stub = sinon.stub(bookmarks, 'clear');
      bookmarks.datastore._tasks[0] = {
        operation: 'clear',
        id: 0,
        data: {}
      };
      bookmarks.synchronise().then(() => {
        assert.isTrue(stub.calledOnce);
        done();
      });
    });

    test('should call updateRevision() when done', done => {
      stub = sinon.stub(bookmarks, 'updateRevision');
      bookmarks.datastore._tasks = [{
        operation: 'done',
        id: 0,
        data: null
      }];
      bookmarks.synchronise().then(() => {
        assert.isTrue(stub.calledOnce);
        done();
      });
    });
  });

  suite('indexedDB backed methods', () => {
    var objectStores = {};
    var deletedValues = [];
    var attachDBTransaction = objectStoreName => {
      objectStores = {};
      deletedValues = [];
      bookmarks.db.transaction = (objectStoreNames, IDBTransactionMode) => {
        return {
          objectStore: name => {
            return {
              put: value => {
                if (name !== objectStoreName) {
                  return;
                }
                objectStores[name] = value;
              },
              delete: value => {
                if (name !== objectStoreName) {
                  return;
                }
                deletedValues.push(value);
              },
              clear: () => {
                if (name !== objectStoreName) {
                  return;
                }
              },
              get: () => {
                if (name !== objectStoreName) {
                  return;
                }
                return {
                  set onsuccess(cb) {
                    cb({
                      target: {
                        result: { id: 'abc/', data: {} }
                      }
                    });
                  }
                };
              },
              openCursor: () => {
                return {
                  set onsuccess(cb) {
                    if (objectStoreNames.indexOf(name) === -1) {
                      return;
                    }
                    cb({
                      target: {
                        result: {
                          value: { id: 'abc/', data: {} },
                          continue: () => {
                            cb({
                              target: {
                                result: {
                                  value: { id: 'def/', data: {} },
                                  continue: () => {}
                                }
                              }
                            });
                          }
                        }
                      }
                    });
                  }
                };
              }
            };
          },
          set oncomplete(cb) {
            cb();
          },
          onerror: () => {}
        };
      };
    };

    setup(() => {
      bookmarks.db = {};
    });

    suite('Datastore#set()', () => {
      var data = {
        id: 'abc/',
        misc: 'def'
      };

      setup(() => {
        attachDBTransaction(bookmarks.storeName);
      });

      test('should store data', done => {
        bookmarks.set(data)
          .then(() => {
            assert.equal(Object.keys(objectStores).length, 1);
            assert.equal(objectStores[bookmarks.storeName].id, data.id);
            assert.equal(objectStores[bookmarks.storeName].data, data);
            done();
          });
      });

      test('should emit an event', done => {
        document.addEventListener(bookmarks.name + '-set', evt => {
          assert.equal(evt.detail.id, data.id);
          done();
        });
        bookmarks.set(data);
      });
    });

    suite('Datastore#remove()', () => {
      var id = 'abc/';

      setup(() => {
        attachDBTransaction(bookmarks.storeName);
      });

      test('should remove data from object store', done => {
        bookmarks.remove(id)
          .then(() => {
            assert.deepEqual(deletedValues, [id]);
            done();
          });
      });

      test('should emit an event', done => {
        document.addEventListener(bookmarks.name + '-removed', evt => {
          assert.equal(evt.detail.id, id);
          done();
        });
        bookmarks.remove(id);
      });
    });

    suite('Datastore#clear()', () => {
      test('should remove all data from object store', done => {
        attachDBTransaction(bookmarks.storeName);
        bookmarks.clear()
          .then(() => {
            done();
          });
      });

      test('should emit an event', done => {
        attachDBTransaction(bookmarks.storeName);
        document.addEventListener(bookmarks.name + '-cleared', () => {
          done();
        });
        bookmarks.clear();
      });
    });

    suite('Datastore#get()', () => {
      test('should retrieve data from object store', done => {
        attachDBTransaction(bookmarks.storeName);
        bookmarks.get('abc/')
          .then(results => {
            assert.deepEqual(results, { id: 'abc/', data: {} });
            done();
          });
      });
    });

    suite('Datastore#getAll()', () => {
      test('should retrieve data from object store', done => {
        attachDBTransaction(bookmarks.storeName);
        bookmarks.getAll()
          .then(results => {
            assert.equal(results.length, 2);
            assert.deepEqual(results[0], { id: 'abc/', data: {} });
            assert.deepEqual(results[1], { id: 'def/', data: {} });
            done();
          });
      });
    });
  });

  suite('Datastore#updateRevision()', () => {
    setup(done => {
      bookmarks.init().then(done);
    });

    test('should set the datastore revision ID in lastRevision', () => {
      assert.isNull(bookmarks.lastRevision);
      bookmarks.updateRevision();
      assert.equal(bookmarks.lastRevision, bookmarks.datastore.revisionId);
    });

    test('should update the datastore revision ID in lastRevision', done => {
      var newRevisionId = 'xxx-zzz';
      bookmarks.datastore._tasks = [{
        operation: 'done',
        id: 0,
        data: null
      }];

      bookmarks.datastore.revisionId = newRevisionId;

      bookmarks.synchronise().then(() => {
        bookmarks.init().then(() => {
          assert.equal(bookmarks.lastRevision, newRevisionId);
          done();
        });
      });
    });
  });

  suite('Datastore#onChange()', () => {
    test('should call synchronise()', done => {
      var synchroniseStub = sinon.stub(bookmarks, 'synchronise',
        () => Promise.resolve());
      bookmarks.onChange();
      setTimeout(() => {
        assert.isTrue(synchroniseStub.calledOnce);
        done();
      });
    });
  });
});
