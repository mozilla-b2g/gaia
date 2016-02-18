/* global MockIndexedDB, PagesMetadata */
'use strict';

require('/shared/test/unit/mocks/mock_indexedDB.js');
require('/js/appsmetadata.js');
require('/js/pagesmetadata.js');

suite('PagesMetadata', () => {
  var mockIndexedDB;
  var metadata;

  setup(() => {
    mockIndexedDB = new MockIndexedDB();
    metadata = new PagesMetadata();
  });

  teardown(() => {
    metadata = null;
    mockIndexedDB.mTearDown();
  });

  suite('PagesMetadata#init()', () => {
    test('should open an indexedDB instance', done => {
      assert.equal(mockIndexedDB.dbs.length, 0);
      metadata.init().then(() => {
        assert.equal(mockIndexedDB.dbs.length, 1);
        done();
      });
    });
  });

  suite('PagesMetadata#upgradeSchema()', () => {
    var names = [];
    var onUpgradeNeededEvent = version => {
      return {
        target: {
          result: {
            createObjectStore: (name, options) => {
              names.push(name);
              return { createIndex: (name, keyPath, options) => {} };
            }
          }
        },
        oldVersion: version
      };
    };

    setup(() => {
      names = [];
    });

    test('should create 1 object store with older versions', () => {
      metadata.upgradeSchema(onUpgradeNeededEvent(0));
      assert.equal(names.length, 1);
      assert.isTrue(names.indexOf('order') > -1);
    });

    test('should not create object stores with newer versions', () => {
      metadata.upgradeSchema(onUpgradeNeededEvent(2));
      assert.equal(names.length, 0);
    });
  });

  suite('indexedDB backed methods', () => {
    var objectStores = {};
    var deletedValues = [];
    var attachDBTransaction = objectStoreName => {
      metadata.db.transaction = (objectStoreNames, IDBTransactionMode) => {
        return {
          objectStore: name => {
            return {
              put: value => {
                if (objectStoreName && name !== objectStoreName) {
                  return;
                }
                objectStores[name] = value;
              },
              get: id => {
                return {
                  set onsuccess(cb) {
                    cb({ target: { result: { id: id, order: 0 } } });
                  }
                };
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
              openCursor: () => {
                return {
                  set onsuccess(cb) {
                    if (objectStoreNames.indexOf(name) === -1) {
                      return;
                    }
                    var value = { id: 'abc/', order: 0 };
                    cb({
                      target: {
                        result: {
                          value: value,
                          continue: () => {
                            var value = { id: 'def/', order: 1 };
                            cb({
                              target: {
                                result: {
                                  value: value,
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
              },
              index: function() {
                return this;
              }
            };
          },
          set oncomplete(cb) {
            cb();
          },
          onerror: () => {
          }
        };
      };
    };

    setup(() => {
      metadata.db = {};
      objectStores = {};
      deletedValues = [];
    });

    suite('PagesMetadata#set()', () => {
      var setMetadata = (id, order) => {
        metadata.set(
          [{
            id: id,
            order: order
          }]);
      };

      test('should ignore apps without id', () => {
        attachDBTransaction('order');
        var order = 0;
        setMetadata(undefined, order);
        assert.equal(Object.keys(objectStores).length, 0);
      });

      test('should store apps with order', () => {
        attachDBTransaction('order');
        var id = 'abc/', order = 0;
        setMetadata(id, order, undefined);
        assert.equal(Object.keys(objectStores).length, 1);
        assert.equal(objectStores.order.id, id);
        assert.equal(objectStores.order.order, order);
      });
    });

    suite('PagesMetadata#remove()', () => {
      var id = 'abc/';

      test('should remove data from order object store', done => {
        attachDBTransaction('order');
        metadata.remove(id)
          .then(() => {
            done(() => {
              assert.deepEqual(deletedValues, [id]);
            });
          });
      });
    });

    suite('PagesMetadata#getAll()', () => {
      test('should return an array of objects', done => {
        attachDBTransaction('order');
        metadata.getAll()
          .then(results => {
            done(() => {
              assert.equal(results.length, 2);
              assert.deepEqual(results[0],
                               { id: 'abc/', order: 0 });
              assert.deepEqual(results[1],
                               { id: 'def/', order: 1 });
            });
          });
      });
    });
  });
});
