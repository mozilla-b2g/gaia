/* global MockIndexedDB, AppsMetadata */
'use strict';

require('/shared/test/unit/mocks/mock_indexedDB.js');
require('/js/appsmetadata.js');

suite('AppsMetadata', () => {
  var mockIndexedDB;
  var metadata;

  setup(() => {
    mockIndexedDB = new MockIndexedDB();
    metadata = new AppsMetadata();
  });

  teardown(() => {
    metadata = null;
    mockIndexedDB.mTearDown();
  });

  suite('AppsMetadata#init()', () => {
    test('should open an indexedDB instance', done => {
      assert.equal(mockIndexedDB.dbs.length, 0);
      metadata.init().then(() => {
        assert.equal(mockIndexedDB.dbs.length, 1);
        done();
      });
    });
  });

  suite('AppsMetadata#upgradeSchema()', () => {
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
              get: id => {
                return {
                  set onsuccess(cb) {
                    if (name === 'icon') {
                      switch(id) {
                      case 'abc/':
                        cb({ target: { result: { id: 'abc/', icon: 'abc' } } });
                        return;

                      case 'def/':
                        cb({ target: { result: { id: 'def/', icon: 'def' } } });
                        return;
                      }
                    }
                    cb({ target: {} });
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

    suite('AppsMetadata#set()', () => {
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

    suite('AppsMetadata#remove()', () => {
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

      test('should remove data from icon object store', done => {
        attachDBTransaction('icon');
        metadata.remove(id)
          .then(() => {
            done(() => {
              assert.deepEqual(deletedValues, [id]);
            });
          });
      });
    });

    suite('AppsMetadata#getAll()', () => {
      test('should combine data from both object stores', done => {
        attachDBTransaction('order');
        metadata.getAll()
          .then(results => {
            done(() => {
              assert.equal(results.length, 2);
              assert.deepEqual(results[0],
                               { id: 'abc/', order: 0, icon: 'abc' });
              assert.deepEqual(results[1],
                               { id: 'def/', order: 1, icon: 'def' });
            });
          });
      });
    });
  });
});
