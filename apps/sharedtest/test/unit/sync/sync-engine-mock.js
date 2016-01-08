/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

/* exported
  MockSyncEngine
*/

var MockSyncEngine = (() => {
  var MockSyncEngine = function(options) {
      MockSyncEngine.constructorOptions = options;
  };
  MockSyncEngine.prototype = {
    syncNow: function(options) {
      MockSyncEngine.syncOptions = options;
      if (MockSyncEngine.shouldFail) {
        return Promise.reject(new Error('mock sync failure'));
      } else {
        return Promise.resolve();
      }
    }
  };
  MockSyncEngine.shouldFail = false;
  return MockSyncEngine;
})();
