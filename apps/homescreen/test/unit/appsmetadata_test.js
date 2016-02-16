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

    test('should create 3 object stores with older versions', () => {
      metadata.upgradeSchema(onUpgradeNeededEvent(0));
      assert.equal(names.length, 3);
      assert.isTrue(names.indexOf('order') > -1);
      assert.isTrue(names.indexOf('icon') > -1);
      assert.isTrue(names.indexOf('group') > -1);
    });

    test('should not create object stores with newer versions', () => {
      metadata.upgradeSchema(onUpgradeNeededEvent(2));
      assert.equal(names.length, 0);
    });
  });

  suite('indexedDB backed methods', () => {
    var objectStores = {};
    var deletedValues = [];
    var delayedComplete = {
      _callback: null,
      _transactions: 0,

      set callback(cb) {
        if (this._transactions === 0) {
          cb();
        } else {
          this._callback = cb;
        }
      },

      openTransaction: function() {
        this._transactions++;
      },

      closeTransaction: function() {
        this._transactions--;
        if (this._transactions === 0 && this._callback) {
          this._callback();
          this._callback = null;
        }
      }
    };
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
                    var result = { id: id };
                    switch(name) {
                    case 'icon':
                      result.icon = id.slice(0, -1);
                      cb({ target: { result: result } });
                      break;

                    case 'group':
                      result.group = 'abc/';
                      cb({ target: { result: result } });
                      break;

                    default:
                      console.error('Unrecognised object store: ' + name);
                      cb({ target: {} });
                      break;
                    }
                  }
                };
              },
              delete: value => {
                if (objectStoreName && name !== objectStoreName) {
                  return;
                }
                deletedValues.push(value);
              },
              clear: () => {
                if (objectStoreName && name !== objectStoreName) {
                  return;
                }
              },
              openCursor: () => {
                return {
                  set onsuccess(cb) {
                    if (objectStoreNames.indexOf(name) === -1) {
                      return;
                    }
                    var value = { id: 'abc/' };
                    switch (name) {
                    case 'order':
                      value.order = 0;
                      break;
                    case 'icon':
                      value.icon = 'abc';
                      break;
                    case 'group':
                      value.group = 'abc/';
                      break;
                    }
                    cb({
                      target: {
                        result: {
                          value: value,
                          continue: () => {
                            var value = { id: 'def/' };
                            switch (name) {
                            case 'order':
                              value.order = 1;
                              break;
                            case 'icon':
                              value.icon = 'def';
                              break;
                            case 'group':
                              value.group = 'abc/';
                              break;
                            }
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
            delayedComplete.callback = cb;
          },
          set onerror(cb) {
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
      var setMetadata = (id, order, icon, group) => {
        metadata.set(
          [{
            id: id,
            order: order,
            icon: icon,
            group: group
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
        setMetadata(id, order);
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

      test('should store apps with group', () => {
        attachDBTransaction('group');
        var id = 'abc/', group = 'def/';
        setMetadata(id, undefined, undefined, group);
        assert.equal(Object.keys(objectStores).length, 1);
        assert.equal(objectStores.group.id, id);
        assert.equal(objectStores.group.group, group);
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

      test('should remove data from group object store', done => {
        attachDBTransaction('group');
        metadata.remove(id)
          .then(() => {
            done(() => {
              assert.deepEqual(deletedValues, [id]);
            });
          });
      });
    });

    suite('AppsMetadata#getAll()', () => {
      test('should combine data from all object stores', done => {
        attachDBTransaction();
        var nResults = 0;
        delayedComplete.openTransaction();
        metadata.getAll(() => {
          if (++nResults == 2) {
            delayedComplete.closeTransaction();
          }
        }).then(results => {
            done(() => {
              console.log(JSON.stringify(results));
              assert.deepEqual(results[0],
                { id: 'abc/', order: 0, icon: 'abc', group: 'abc/' });
              assert.deepEqual(results[1],
                { id: 'def/', order: 1, icon: 'def', group: 'abc/' });
            });
          });
      });
    });
  });
});
