/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

/* exported
  AdapterMock
*/

var AdapterMock = (action, args) => {
  return {
    update(kintoColl) {
      if (action) {
        return kintoColl[action].apply(kintoColl, args);
      }
      return Promise.resolve();
    },
    handleConflict(conflict) {
      return Promise.resolve(conflict.local);
    }
  };
};
