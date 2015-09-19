/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/* global
  AdapterMock
*/

/* exported
  SynctoServerFixture
*/

var SynctoServerFixture = (function() {
  var syncEngineOptions = {
    URL: 'http://localhost:8000/v1/',
    assertion: 'test-assertion-mock',
    // Taken from https://bugzilla.mozilla.org/show_bug.cgi?id=959919#c13.
    kB: 'fd5c747806c07ce0b9d69dcfea144663e630b65ec4963596a22f24910d7dd15d',
    adapters: {
      history: AdapterMock()
    }
  };

  // Taken from https://bugzilla.mozilla.org/show_bug.cgi?id=959919#c13.
  var xClientState = '6ae94683571c7a7c54dab4700aa3995f';

  var remoteData = {
    meta: {
      id: 'global',
      last_modified: 1234567890123,
      payload: JSON.stringify({
        syncID: 'NOuEmrZxVWxl',
        storageVersion: 5,
        declined:[],
        engines: {
          clients: { version: 1, syncID: '-qRIYq3pRFaF' },
          prefs: { version:2, syncID: 'J2d8YxLBQ68M' },
          passwords: { version:1, syncID: 'y3sQX0uYGXwz' },
          tabs: { version: 1, syncID: 'MGdVuWFjTRpP' },
          bookmarks: { version: 2, syncID: 'OmUGbrBTvZbn' },
          addons: { version: 1, syncID: '90lUL4MPuhpx' },
          forms: { version:1, syncID: 'Q_mWdmGZtuX9' },
          history: { version: 1, syncID: '2_MOTXJfjA9Q' }
        }
      })
    },
    crypto: {
      id: 'keys',
      last_modified: 1234567890123,
      payload: JSON.stringify({
        ciphertext: `PP5yNUYwJJoLcsL5o85i6RZfvanYDrwtChDD/LdKTZ8JOLubZ9DyRv3HMe\
tSkbhL3HLvVm/FJ1Z4F2Z6IKQCxAc5dNnLsBIUUxhOHLbT0x9/jfnqZ8fLtlbkogI3ZlNvbc8iUF1aX\
+boe0Pv43vM0VvzxrnJDYzZ2a6jm9nbzUn0ldV9sv6vuvGHE6dANnRkZ3wA/q0q8UvjdwpzXBixAw=\
=`,
        IV: 'FmosM+XBNy81/9oEAgI4Uw==',
        hmac: '01a816e4577c6cf3f97b66b4382d0a3e7e9178c75a3d38ed9ac8ad6397c2ecce'
      })
    },
    history: {
      id: '_9sCUbahs0ay',
      last_modified: 1234567890123,
      payload: JSON.stringify({
        ciphertext: `o/VpkqMj1tlT8t2youwsS2FgvQeonoHxqjGsRTu1+4swfyBq/QsnKfgOOM\
mDIXZiPC3hOCNUlf/NtQiEe55hzJZEKLBshaLfXotai6KrprwrmykfiXnwn73n+nYNs8BXL5awDHoaJ\
ToyFgF4PYokl7mwN7YC2xFiPgwO7Z2u/8r5RfnPV9MoafqvlvUkW+Tqs+QHeHS/iuSA0P2h/j5ynt9v\
4xDWLVfEMce0KOKHQ5Qj7BmEPAieWP1trkkDmTdVi2euWrs+fuG4C6PgY4A2j2DbNLVIloqpDVkqM2f\
gh0YOM9L2NC/uiKEb1Ynr2Fos`,
        IV: 'kXL3hb11ltD+Jl0YFk+PlQ==',
        hmac: 'cb727efe7a3f0307921cecbd1a97c03f06a4d75c42026089494d84fcf92dbff9'
      })
    },
    'wrong-payload-meta': {
      id: 'global',
      last_modified: 1234567890123,
      payload: 'whoopsie!'
    },
    'wrong-payload-crypto': {
      id: 'keys',
      last_modified: 1234567890123,
      payload: 'whoopsie!'
    },
    'wrong-payload-history': {
      id: '_9sCUbahs0ay',
      last_modified: 1234567890123,
      payload: 'whoopsie!'
    },
    'wrong-ciphertext': {
      id: '_9sCUbahs0ay',
      last_modified: 1234567890123,
      payload: JSON.stringify({
        ciphertext: 'deadbeef',
        IV: 'kXL3hb11ltD+Jl0YFk+PlQ==',
        hmac: 'cb727efe7a3f0307921cecbd1a97c03f06a4d75c42026089494d84fcf92dbff9'
      })
    },
    'wrong-id': {
      id: '825a1b6a-0000-4000-8000-000000000002',
      last_modified: 1234567890123,
      payload: JSON.stringify({
        ciphertext: `o/VpkqMj1tlT8t2youwsS2FgvQeonoHxqjGsRTu1+4swfyBq/QsnKfgOOM\
mDIXZiPC3hOCNUlf/NtQiEe55hzJZEKLBshaLfXotai6KrprwrmykfiXnwn73n+nYNs8BXL5awDHoaJ\
ToyFgF4PYokl7mwN7YC2xFiPgwO7Z2u/8r5RfnPV9MoafqvlvUkW+Tqs+QHeHS/iuSA0P2h/j5ynt9v\
4xDWLVfEMce0KOKHQ5Qj7BmEPAieWP1trkkDmTdVi2euWrs+fuG4C6PgY4A2j2DbNLVIloqpDVkqM2f\
gh0YOM9L2NC/uiKEb1Ynr2Fos`,
        IV: 'kXL3hb11ltD+Jl0YFk+PlQ==',
        hmac: 'cb727efe7a3f0307921cecbd1a97c03f06a4d75c42026089494d84fcf92dbff9'
      })
    }
  };

  var historyEntryDec = {
    payload: {
      id: '_9sCUbahs0ay',
      histUri: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Referen\
ce/Global_Objects/Object/proto`,
      title: 'Object.prototype.__proto__ - JavaScript | MDN',
      visits:[ { date: 1439366063808983, type:1 } ]
    },
    collectionName: 'history'
  };
  return {
    syncEngineOptions: syncEngineOptions,
    xClientState: xClientState,
    remoteData: remoteData,
    historyEntryDec: historyEntryDec
  };
})();
