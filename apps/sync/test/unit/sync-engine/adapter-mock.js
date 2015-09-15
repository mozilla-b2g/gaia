/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

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
      return conflict.local;
    }
  };
};
