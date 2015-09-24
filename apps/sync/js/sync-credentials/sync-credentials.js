/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/* exported
  SyncCredentials
*/

var SyncCredentials = {
  getAssertion: function() {
    if (this._assertion) {
      return Promise.resolve(this._assertion);
    }
    var self = this;
    return new Promise((resolve, reject) => {
      navigator.mozId.watch({
        wantIssuer: 'firefox-accounts',
        audience: 'https://token.services.mozilla.com/',
        onlogin: function(assertion) {
          self._assertion = assertion;
          resolve(assertion);
        },
        onerror: function(error) {
          reject(error);
        },
        onlogout: function() {},
        onready: function() {}
      });
      navigator.mozId.request();
    });
  },

  getCredentials(adapters) {
    return this.getAssertion().then((assertion) => {
      return Promise.resolve({
        URL: 'http://localhost:8000/v1/',
        assertion: assertion,
        xClientState: '611c7e96a16778e40016504c1928fc57',
        kB: '67285b9b5567d0702b6d87e067891480505dcd0ca013cb0b6f8996160e602b89',
        adapters: adapters
      });
    });
  }
};
