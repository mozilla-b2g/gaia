/* global FirstRun */
'use strict';

require('/js/firstrun.js');

suite('FirstRun', () => {
  const COLS_PREF = 'grid.cols';

  function testExpectedResults(results, expected) {
    var string = '';
    var order = 0;
    results.order.forEach(entry => {
      string += entry.id;
      assert.equal(entry.order, order++);
    });
    assert.equal(string, expected);
  }

  suite('default settings', () => {
    var json;

    setup(() => {
      window.LazyLoader = {
        getJSON: (file) => {
          assert.equal(file, 'js/init.json');
          return Promise.resolve(json);
        }
      };
    });

    test('handles null JSON', (done) => {
      json = null;

      FirstRun().then(results => {
        done(() => {
          assert.isTrue(Array.isArray(results.order));
          assert.equal(results.order.length, 0);
          assert.equal(results.small, false);
        });
      }, done);
    });

    test('handles empty JSON', (done) => {
      json = {};

      FirstRun().then(results => {
        done(() => {
          assert.isTrue(Array.isArray(results.order));
          assert.equal(results.order.length, 0);
          assert.equal(results.small, false);
        });
      }, done);
    });

    test('handle null values in the JSON', (done) => {
      json = { grid:
        [[ null,
           { manifestURL: '1' },
           null,
           null,
           { manifestURL: '2', entry_point: '3' } ],
         [ { manifestURL: '4' } ]
        ]};

      FirstRun().then(results => {
        done(() => {
          testExpectedResults(results, '1/2/34/');
        });
      });
    });

    test('treats columns <= 3 as default columns setting', (done) => {
      json = { preferences: {} };

      json.preferences[COLS_PREF] = 2;
      FirstRun().then(results1 => {
        json.preferences[COLS_PREF] = 3;
        FirstRun().then(results2 => {
          done(() => {
            assert.equal(results1.small, false);
            assert.equal(results2.small, false);
          });
        }, done);
      }, done);
    });

    test('treats columns > 3 as small columns setting', (done) => {
      json = { preferences: {} };
      json.preferences[COLS_PREF] = 4;

      FirstRun().then(results => {
        done(() => {
          assert.equal(results.small, true);
        });
      });
    });

    test('transforms grid into compatible format', (done) => {
      json = { grid:
        [[ { manifestURL: '1' },
           { manifestURL: '2', entry_point: '3' } ],
         [ { manifestURL: '4' } ]
        ]};

      FirstRun().then(results => {
        done(() => {
          testExpectedResults(results, '1/2/34/');
        });
      });
    });

    test('omits objects with no manifestURL', (done) => {
      json = { grid:
        [[ { manifestURL: '1' },
           { manifestURL: '2', entry_point: '3' } ],
         [ { invalidObject: true } ],
         [ { manifestURL: '4' } ]
        ]};

      FirstRun().then(results => {
        done(() => {
          testExpectedResults(results, '1/2/34/');
        });
      });
    });
  });

  suite('verticalhome import', () => {
    const VERTICALHOME_ITEMS = 'verticalhome_items_migration';

    const VERTICALHOME_PREFS = 'vertical_preferences_store';

    var realNavigatorDatastores, realConsoleWarn;
    var itemsDatastore, prefsDatastore, noDatastore;

    setup(() => {
      realNavigatorDatastores = navigator.getDataStores;

      noDatastore = false;
      navigator.getDataStores = name => {
        assert.isTrue((name === VERTICALHOME_ITEMS) ||
                      (name === VERTICALHOME_PREFS));

        return Promise.resolve(noDatastore ? [] :
          (name === VERTICALHOME_ITEMS ? [itemsDatastore] : [prefsDatastore]));
      };

      // Initialise the two datastores as fake empty datastores
      itemsDatastore = prefsDatastore = {
        getLength: () => { return Promise.resolve(0); },
        get: () => { return Promise.reject(); }
      };

      // Overload console.warn to disable FirstRun's built-in error fallback
      realConsoleWarn = console.warn;
      console.warn = (message, error) => {
        throw(error);
      };
    });

    teardown(() => {
      navigator.getDataStores = realNavigatorDatastores;
      console.warn = realConsoleWarn;
    });

    test('handles inaccessible datastore', done => {
      noDatastore = true;
      FirstRun().then(() => {
        done('should not succeed with inaccessible datastore');
      }, (e) => {
        done(() => {
          assert.equal(e, 'verticalhome datastores inaccessible');
        });
      });
    });

    test('handles empty datastore', done => {
      FirstRun().then(() => {
        done('should not succeed with empty datastore');
      }, (e) => {
        done(() => {
          assert.equal(e, 'No verticalhome app order to import');
        });
      });
    });

    function populateItemStore() {
      var items = {
        '2': { index: '2', type: 'app', manifestURL: '2', entryPoint: '3' },
        '1': { index: '1', type: 'app', manifestURL: '1' },
        '4': { index: '4', type: 'divider' },
        '6': { index: '6', type: 'bookmark', id: '4' }
      };
      var keys = Object.getOwnPropertyNames(items);
      var length = keys.length;

      itemsDatastore = {
        getLength: () => { return Promise.resolve(length); },
        sync: () => {
          var i = 0;
          return {
            next: () => {
              return Promise.resolve((i++ < length) ? {
                operation: 'put',
                id: keys[i - 1],
                data: items[keys[i - 1]]
              } : {
                operation: 'done'
              });
            }
          };
        }
      };
    }

    test('converts verticalhome format to homescreen format', done => {
      populateItemStore();

      FirstRun().then(results => {
        done(() => {
          testExpectedResults(results, '1/2/34');
        });
      }, done);
    });

    test('reads column preferences', done => {
      populateItemStore();
      prefsDatastore.get = pref => {
        return (pref === COLS_PREF) ?
          Promise.resolve(4) : Promise.reject();
      };

      FirstRun().then(results => {
        done(() => {
          testExpectedResults(results, '1/2/34');
          assert.isTrue(results.small);
        });
      }, done);
    });
  });
});
