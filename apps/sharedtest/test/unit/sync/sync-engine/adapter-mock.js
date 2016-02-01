/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

/* exported
  AdapterMock
*/

var AdapterMock = (action, args) => {
  return {
    update(kintoColl, options) {
      AdapterMock.options = options;
      if (action === 'noop') {
        // Even if the adapter makes changes, we want to see that
        // SyncEngine does not sync those changes up if the adapter
        // return false.
        return kintoColl.update.apply(kintoColl, args).then(() => {
          return false;
        });
      }
      if (action) {
        return kintoColl[action].apply(kintoColl, args).then(() => {
          return true;
        });
      }
      return Promise.resolve(false);
    },
    handleConflict(conflict) {
      return Promise.resolve(conflict.local);
    },
    reset() {
      return Promise.resolve();
    }
  };
};
