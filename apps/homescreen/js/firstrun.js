/* global LazyLoader */
'use strict';

(function(exports) {

  const COLS_PREF = 'grid.cols';

  function FirstRun() {
    return new Promise((resolve, reject) => {
      LazyLoader.getJSON('js/init.json').then(
        (json) => {
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
                if (!entry.manifestURL) {
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
        (e) => {
          reject(e);
        }
      );
    });
  }

  exports.FirstRun = FirstRun;

}(window));
