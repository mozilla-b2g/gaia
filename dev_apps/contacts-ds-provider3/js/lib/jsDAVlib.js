/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var jsDAVlib = (function jsDAVlib() {
  function jsDAVlib_debug(msg, obj) {
    if (obj) {
      msg = msg + ': ' + JSON.stringify(obj);
    }
    console.log('DEBUG jsDAVlib: ' + (new Date()).getTime() + ' - ' + msg);
  }

  return {
    getConnection: function getConnection(params) {
      return new jsDAVConnection(params);
    },

    debug: function jsDAVDebug(msg, obj) {
      jsDAVlib_debug(msg, obj);
    }
  };
})();
