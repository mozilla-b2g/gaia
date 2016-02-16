/*
Copyright 2015, Mozilla Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

/* global ERROR_DIALOG_CLOSED_BY_USER */
/* global ERROR_INVALID_SYNC_ACCOUNT */
/* global ERROR_NO_KEY_FETCH_TOKEN */
/* global ERROR_OFFLINE */
/* global ERROR_SYNC_APP_TRY_LATER */
/* global ERROR_UNKNOWN */

/**
 * These errors are shared by all Firefox Sync related modules. The key should
 * be used as a constant and the value can be used as a l10n string key if
 * needed.
 */

(function(exports) {

  // Unrecoverable errors will cause the Sync state machine to transition to
  // the 'disabled' state.
  const unrecoverableErrors = {
    // The user closed the FxA dialog during the sync enabling state.
    ERROR_DIALOG_CLOSED_BY_USER: 'fxsync-error-dialog-closed-by-user',
    // Cannot get Firefox Accounts assertion.
    ERROR_GET_FXA_ASSERTION: 'fxsync-error-get-fxa-assertion',
    // The user logged in with an invalid account. This is probably because the
    // account has no crypto keys associated and we are unable to generate them
    // so far.
    ERROR_INVALID_SYNC_ACCOUNT: 'fxsync-error-invalid-account',
    // The device is offline.
    ERROR_OFFLINE: 'fxsync-error-offline',
    // The current login is invalid as it does not contain the token to fetch
    // sync keys.
    ERROR_NO_KEY_FETCH_TOKEN: 'fxsync-error-no-key-fetch-token',
    // Cannot register sync request.
    ERROR_REQUEST_SYNC_REGISTRATION: 'fxsync-error-request-fxsync-registration',
    // The request options passed to the Sync app failed basic DataType checks.
    ERROR_SYNC_INVALID_REQUEST_OPTIONS: 'fxsync-error-invalid-request-options',
    // Cannot perform sync request.
    ERROR_SYNC_REQUEST: 'fxsync-error-request-failed',
    ERROR_UNKNOWN: 'fxsync-error-unknown'
  };

  const recoverableErrors = {
    // The app was killed while performing a sync operation.
    ERROR_SYNC_APP_KILLED: 'fxsync-error-app-killed',
    // The app is already performing a sync request.
    ERROR_SYNC_APP_SYNC_IN_PROGRESS: 'fxsync-error-app-fxsync-in-progress',
    // Error while trying to sync.
    ERROR_SYNC_APP_GENERIC: 'fxsync-error-app-generic',
    // The server cannot be reached.
    ERROR_SYNC_APP_TRY_LATER: 'fxsync-error-app-try-later',
    // A DataStore was updated by another app at the same time.
    ERROR_SYNC_APP_RACE_CONDITION: 'fxsync-error-app-race-condition',
    // The user is logged in with an unverified account.
    ERROR_UNVERIFIED_ACCOUNT: 'fxsync-error-unverified-account'
  };

  exports.SyncUnrecoverableErrors = [];
  Object.keys(unrecoverableErrors).forEach(key => {
    exports[key] = unrecoverableErrors[key];
    exports.SyncUnrecoverableErrors.push(unrecoverableErrors[key]);
  });

  exports.SyncRecoverableErrors = [];
  Object.keys(recoverableErrors).forEach(key => {
    exports[key] = recoverableErrors[key];
    exports.SyncRecoverableErrors.push(recoverableErrors[key]);
  });

  // Map between external (FxA, Syncto, kinto.js) and Sync errors.
  exports.SyncErrors = {
    'invalid account': ERROR_INVALID_SYNC_ACCOUNT,
    'No keyFetchToken': ERROR_NO_KEY_FETCH_TOKEN,
    'OFFLINE': ERROR_OFFLINE,
    'try later': ERROR_SYNC_APP_TRY_LATER,
    'UI_ERROR': ERROR_DIALOG_CLOSED_BY_USER,
    'unauthorized': ERROR_INVALID_SYNC_ACCOUNT,
    'UNVERIFIED_ACCOUNT': ERROR_INVALID_SYNC_ACCOUNT,
    'unrecoverable': ERROR_UNKNOWN
  };

}(window));
