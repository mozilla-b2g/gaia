/* global MockIndexedDB, HomeMetadata */
'use strict';

require('/shared/test/unit/mocks/mock_indexedDB.js');
require('/js/metadata.js');

suite('HomeMetadata', () => {
  var mockIndexedDB;
  var metadata;

  setup(() => {
    mockIndexedDB = new MockIndexedDB();
    metadata = new HomeMetadata();
  });

  teardown(() => {
    metadata = null;
    mockIndexedDB.mTearDown();
  });

  suite('HomeMetadata#init()', () => {
    test('should open an indexedDB instance', done => {
      assert.equal(mockIndexedDB.dbs.length, 0);
      metadata.init().then(() => {
        assert.equal(mockIndexedDB.dbs.length, 1);
        done();
      });
    });
  });

  suite('HomeMetadata#upgradeSchema()', () => {
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

    test('should create 2 object stores with older versions', () => {
      metadata.upgradeSchema(onUpgradeNeededEvent(0));
      assert.equal(names.length, 2);
      assert.isTrue(names.indexOf('order') > -1);
      assert.isTrue(names.indexOf('icon') > -1);
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
                    var value = (name === 'order') ?
                      { id: 'abc/', order: 0 } :
                      { id: 'abc/', icon: 'abc' };
                    cb({
                      target: {
                        result: {
                          value: value,
                          continue: () => {
                            var value = (name === 'order') ?
                              { id: 'def/', order: 1 } :
                              { id: 'def/', icon: 'def' };
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

    suite('HomeMetadata#set()', () => {
      var setMetadata = (id, order, icon) => {
        metadata.set(
          [{
            id: id,
            order: order,
            icon: icon
          }]);
      };

      test('should ignore apps without id', () => {
        attachDBTransaction('order');
        var order = 0, icon = 'abc';
        setMetadata(undefined, order, icon);
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

      test('should store apps with icon', () => {
        attachDBTransaction('icon');
        var id = 'abc/', icon = 'abc';
        setMetadata(id, undefined, icon);
        assert.equal(Object.keys(objectStores).length, 1);
        assert.equal(objectStores.icon.id, id);
        assert.equal(objectStores.icon.icon, icon);
      });

      test('updating the order should not change the icon', () => {
        attachDBTransaction();
        var id = 'abc/', order = 0, icon = 'abc';
        setMetadata(id, order, icon);
        assert.equal(objectStores.order.id, id);
        assert.equal(objectStores.order.order, order);
        assert.equal(objectStores.icon.id, id);
        assert.equal(objectStores.icon.icon, icon);

        order = 2;
        setMetadata(id, order, undefined);
        assert.equal(Object.keys(objectStores).length, 2);
        assert.equal(objectStores.order.id, id);
        assert.equal(objectStores.order.order, order);
        assert.equal(objectStores.icon.id, id);
        assert.equal(objectStores.icon.icon, icon);
      });

      test('updating the icon should not change the order', () => {
        attachDBTransaction();
        var id = 'abc/', order = 0, icon = 'abc';
        setMetadata(id, order, icon);
        assert.equal(objectStores.order.id, id);
        assert.equal(objectStores.order.order, order);
        assert.equal(objectStores.icon.id, id);
        assert.equal(objectStores.icon.icon, icon);

        icon = 'def';
        setMetadata(id, undefined, icon);
        assert.equal(Object.keys(objectStores).length, 2);
        assert.equal(objectStores.order.id, id);
        assert.equal(objectStores.order.order, order);
        assert.equal(objectStores.icon.id, id);
        assert.equal(objectStores.icon.icon, icon);
      });
    });

    suite('HomeMetadata#remove()', () => {
      var id = 'abc/';

      test('should remove data from order object store', done => {
        attachDBTransaction('order');
        metadata.remove(id)
          .then(() => {
            assert.deepEqual(deletedValues, [id]);
            done();
          });
      });

      test('should remove data from icon object store', done => {
        attachDBTransaction('icon');
        metadata.remove(id)
          .then(() => {
            assert.deepEqual(deletedValues, [id]);
            done();
          });
      });
    });

    suite('HomeMetadata#getAll()', () => {
      test('should combine data from both object stores', done => {
        attachDBTransaction('order');
        metadata.getAll()
          .then(results => {
            assert.equal(results.length, 2);
            assert.deepEqual(results[0], { id: 'abc/', order: 0, icon: 'abc' });
            assert.deepEqual(results[1], { id: 'def/', order: 1, icon: 'def' });
            done();
          });
      });
    });
  });
});
