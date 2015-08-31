/* global MockIndexedDB, MockNavigatorDatastore, mockLocalStorage, PagesStore */
'use strict';

require('/shared/test/unit/mocks/mock_indexedDB.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('mocks/mock_localStorage.js');
require('/js/datastore.js');
require('/js/pagesstore.js');

suite('PagesStore', () => {
  var mockIndexedDB;
  var realNavigatorDatastores;
  var realLocalStorage;
  var datastoreName = 'pagesstore_name_example';
  var pagesstore;

  setup(() => {
    mockIndexedDB = new MockIndexedDB();
    mockLocalStorage.mSetup();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => mockLocalStorage
    });
    realNavigatorDatastores = navigator.getDataStores;
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;

    pagesstore = new PagesStore(datastoreName);
  });

  teardown(() => {
    mockIndexedDB.mTearDown();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => realLocalStorage
    });
    navigator.getDataStores = realNavigatorDatastores;

    pagesstore = null;
  });

  suite('PagesStore constructor', () => {
    test('should store the name of the datastore', () => {
      assert.equal(pagesstore.name, datastoreName);
      assert.isTrue(pagesstore.revisionName.includes(datastoreName));
      assert.isTrue(pagesstore.idbName.includes(datastoreName));
      assert.isTrue(pagesstore.storeName.includes(datastoreName));
    });
  });

  suite('indexedDB backed methods', () => {
    var data1 = {
      url: 'http://www.theguardian.com/uk/culture',
      title: 'Culture | The Guardian',
      icons: {},
      frecency: 4,
      visits: [1440494813199],
      screenshot: null,
      themeColor: null,
      visited: 1440494813199,
      pinned: true,
      pinTime: 1440426834317,
      id: 'http://www.theguardian.com/uk/culture'
    };
    var data2 = {
      url: 'http://www.cnet.com/',
      title: 'Product reviews and prices, software downloads, and tech news',
      icons: {},
      frecency: 1,
      visits: [1440427988417],
      screenshot: null,
      themeColor: null,
      visited: 1440427988417,
      id: 'http://www.cnet.com/'
    };
    var objectStores = {};
    var deletedValues = [];
    var attachDBTransaction = objectStoreName => {
      objectStores = {};
      deletedValues = [];
      pagesstore.db.transaction = (objectStoreNames, IDBTransactionMode) => {
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
                        result: data1
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
                          value: { id: data1.url, data: data1 },
                          continue: () => {
                            cb({
                              target: {
                                result: {
                                  value: { id: data2.url, data: data2 },
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
      pagesstore.db = {};
    });

    suite('PagesStore#set()', () => {
      setup(() => {
        attachDBTransaction(pagesstore.storeName);
      });

      test('should use the url as the id', done => {
        pagesstore.set(data1)
          .then(() => {
            assert.equal(Object.keys(objectStores).length, 1);
            assert.equal(objectStores[pagesstore.storeName].id, data1.url);
            assert.equal(objectStores[pagesstore.storeName].data, data1);
            done();
          });
      });

      test('should emit an event', done => {
        document.addEventListener(pagesstore.name + '-set', evt => {
          assert.equal(evt.detail.id, data1.id);
          done();
        });
        pagesstore.set(data1);
      });
    });

    suite.only('PagesStore#getAll()', () => {
      test('should not accept any argument', () => {
        assert.equal(pagesstore.getAll.length, 0);
      });

      test('should retrieve data from object store', done => {
        attachDBTransaction(pagesstore.storeName);
        pagesstore.getAll()
          .then(results => {
            assert.equal(results.length, 1);
            assert.deepEqual(results[0].id, data1.url);
            assert.deepEqual(results[0].data, data1);
            done();
          });
      });
    });
  });
});
