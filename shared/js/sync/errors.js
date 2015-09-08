/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/**
 * These errors are shared by all Firefox Sync related modules. The key should
 * be used as a constant and the value can be used as a l10n string key if
 * needed.
 */

(function(exports) {

  var unrecoverableErrors = {
    // Cannot register sync request.
    ERROR_REQUEST_SYNC_REGISTRATION: 'sync-error-request-sync-registration',
    // Cannot get Firefox Accounts assertion.
    ERROR_GET_FXA_ASSERTION: 'sync-error-get-fxa-assertion',
    // Cannot perform sync request.
    ERROR_SYNC_REQUEST: 'sync-error-request-failed'
  };

  var recoverableErrors = {
    // The app was killed while performing a sync operation.
    ERROR_SYNC_APP_KILLED: 'sync-error-app-killed',
    // Error while trying to sync.
    ERROR_SYNC_APP_GENERIC: 'sync-error-app-generic',
    // The user is logged in with an unverified account.
    ERROR_UNVERIFIED_ACCOUNT: 'sync-error-unverified-account'
  };

  exports.SyncUnrecoverableErrors = [];
  Object.keys(unrecoverableErrors).forEach(key => {
    exports[key] = unrecoverableErrors[key];
    exports.SyncUnrecoverableErrors.push(unrecoverableErrors[key]);
  });

  Object.keys(recoverableErrors).forEach(key => {
    exports[key] = recoverableErrors[key];
  });

}(window));
