/* global LazyLoader */
'use strict';

(function(exports) {

  const COLS_PREF = 'grid.cols';

  const VERTICALHOME_APPS = 'verticalhome_items_migration';

  const VERTICALHOME_SETTINGS = 'vertical_preferences_store';

  const HOMESCREEN_SETTINGS = 'homescreen_settings';

  function FirstRun() {
    return importVerticalHome().then(Promise.resolve(),
      (e) => {
        console.warn('Loading default settings, import failed:', e);
        return loadDefault();
      });
  }

  function importVerticalHome() {
    return new Promise((resolve, reject) => {
      if (!navigator.getDataStores) {
        reject('DataStore API is unavailable');
        return;
      }

      navigator.getDataStores(VERTICALHOME_APPS).then(
        stores => {
          if (stores.length < 1) {
            reject('verticalhome datastores inaccessible');
            return;
          }

          stores[0].getLength().then(length => {
            if (length === 0) {
              reject('No verticalhome app order to import');
              return;
            }

            var cursor = stores[0].sync();

            var items = {};
            var iterateItems = () => {
              cursor.next().then(task => {
                switch (task.operation) {
                  case 'done':
                    // Convert from verticalhome storage format to something
                    // homescreen can use, skipping over features that aren't
                    // supported.
                    var id;
                    var order = [];
                    for (var prop in items) {
                      var item = items[prop];
                      switch (item.type) {
                        case 'app':
                          id = item.manifestURL + '/' +
                            (item.entryPoint ? item.entryPoint : '');
                          break;

                        case 'bookmark':
                          id = item.id;
                          break;

                        default:
                          continue;
                      }

                      order.push({ id: id, order: item.index });
                    }

                    // Sort by order
                    order.sort((a, b) => { return a.order - b.order; });

                    // Rewrite order so there are no gaps
                    order.forEach((entry, index) => {
                      entry.order = index;
                    });

                    // Load columns setting and resolve
                    navigator.getDataStores(VERTICALHOME_SETTINGS).then(
                      stores => {
                        stores[0].get(COLS_PREF).then(cols => {
                          resolve({ order: order, small: cols >= 4 });

                          // If 4-column is set, we should synchronise the
                          // homescreen settings datastore so that Settings
                          // reflects the correct value. (3 is the default)
                          if (cols >= 4) {
                            navigator.getDataStores(HOMESCREEN_SETTINGS).then(
                              stores => {
                                stores[0].put(cols, COLS_PREF);
                              }).catch(
                              e => {
                                console.error(
                                  'Error storing homescreen cols setting', e);
                              });
                          }
                        }, () => {
                          resolve({ order: order, small: false });
                        });
                      },
                      (e) => {
                        console.error('Error retrieving columns preference', e);
                        resolve({ order: order, small: false });
                      });
                    return;

                  case 'clear':
                    items = {};
                    break;

                  case 'put':
                  case 'add':
                    items[task.id] = task.data;
                    break;

                  case 'remove':
                    delete items[task.id];
                    break;

                  default:
                    reject('Unhandled datastore operation: ' + task.operation);
                    return;
                }

                iterateItems();
              }, reject);
            };

            iterateItems();
          }, reject);
        }, reject);
    });
  }

  function loadDefault() {
    return new Promise((resolve, reject) => {
      LazyLoader.getJSON('js/init.json').then(
        json => {
          if (!json) {
            resolve({ order: [], small: false});
            return;
          }

          // Convert the initialisation JSON format to something more useful
          // for homescreen.
          var small = !!(json.preferences && json.preferences[COLS_PREF] &&
            (json.preferences[COLS_PREF] > 3));

          var order = [];
          if (json.grid) {
            var index = 0;
            json.grid.forEach((section) => {
              section.forEach((entry) => {
                if (!entry || !entry.manifestURL) {
                  return;
                }

                var id = entry.manifestURL + '/' +
                  (entry.entry_point ? entry.entry_point : '');
                order.push({ id: id, order: index });
                index ++;
              });
            });
          }

          resolve({ order: order, small: small});
        },
        e => {
          reject(e);
        }
      );
    });
  }

  exports.FirstRun = FirstRun;

}(window));
