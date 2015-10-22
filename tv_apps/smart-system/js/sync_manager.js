/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/* global asyncStorage */
/* global ERROR_GET_FXA_ASSERTION */
/* global ERROR_REQUEST_SYNC_REGISTRATION */
/* global ERROR_SYNC_APP_GENERIC */
/* global ERROR_SYNC_APP_KILLED */
/* global ERROR_SYNC_REQUEST */
/* global ERROR_UNVERIFIED_ACCOUNT */
/* global FxAccountsClient */
/* global IACHandler */
/* global LazyLoader */
/* global SettingsListener */
/* global SyncStateMachine */
/* global SyncUnrecoverableErrors */
/* global uuid */

/**
 * This module manages the lifecycle of Firefox Sync on Firefox OS.
 * It connects the Settings application where the Firefox Sync UI is presented
 * to the user with the Sync app that is responsible of doing the actual
 * synchronization of the user's data.
 *
 * SyncManager reacts to changes done on the Settings Sync UI that triggers
 * IAC requests or Settings API changes and translates these changes into
 * actions. It makes use of the SyncStateMachine to control that these actions
 * are possible on the current situation of Sync and communicates with the
 * Sync application via IAC API messages when needed.
 *
 * The IAC based API that is exposed to the Settings app (or any other
 * future consumer that requires to manage Sync) expects IAC messages with
 * a single property 'name' that can have any of the following values:
 *    'enable': requests to enable Sync.
 *    'disable': requests to disable Sync.
 *    'sync': requests a sync on demand. Although we have scheduled
 *            synchronizations, we allow on demand sync requests.
 *    'getInfo': gets the current information about the state of Sync
 *               including the state (enabled, disabled, etc.), the
 *               last time a successful sync happened and the last error
 *               if there's any.
 *
 * It also triggers one message through the same IAC API with name
 * 'onsyncchange' when something (state, error, lastSync) changes on Sync.
 *
 * SyncManager also communicates with the Sync app via IAC. Every time a
 * synchronization is required (either because the requestSync timer fires or
 * because the user requested a sync on demand), we wake the Sync app up and
 * give it the required information to perform the synchronization that
 * includes the URL of the Syncto server, a valid FxA assertion and its
 * associated encryption keys and the list of collections to be synchronized.
 */

(function(exports) {
  const FXA_EVENT = 'mozFxAccountsUnsolChromeEvent';

  const SYNC_TASK = 'gaia::system::firefoxsync';
  const SYNC_REQUEST_IAC_KEYWORD = 'gaia::sync::request';
  const SYNC_MANAGEMENT_API_IAC_KEYWORD = 'gaia-sync-management';

  const COLLECTIONS = ['history', 'passwords', 'bookmarks'];

  // Keys of asyncStorage persisted data.
  const SYNC_STATE = 'sync.state';
  const SYNC_STATE_ERROR = 'sync.state.error';
  const SYNC_LAST_TIME = 'sync.lastTime';
  const SYNC_USER = 'sync.user';

  function SyncManager() {}

  SyncManager.prototype = {
    DEBUG: false,
    store: new Map(),
    settings: new Map(),

    start() {
      this.debug('Start');
      return new Promise((resolve, reject) => {
        LazyLoader.load('/shared/js/sync/errors.js', () => {
          navigator.mozSetMessageHandler('request-sync', event => {
            this.debug('Sync request');
            if (event.task != SYNC_TASK) {
              return;
            }
            SyncStateMachine.sync();
          });

          // Settings listeners.
          ['sync.collections.bookmarks.enabled',
           'sync.collections.history.enabled',
           'sync.collections.passwords.enabled',
           'sync.collections.bookmarks.readonly',
           'sync.collections.history.readonly',
           'sync.collections.passwords.readonly',
           'sync.server.url',
           'sync.scheduler.interval',
           'sync.scheduler.wifionly',
           'sync.fxa.audience'].forEach(setting => {
            SettingsListener.observe(setting, false, enabled => {
              this.debug('Observed ' + setting + ' changed to ' + enabled);
              enabled ? this.settings.set(setting, enabled)
                      : this.settings.delete(setting);
            });
          });

          // SyncStateMachine event listeners.
          ['ondisabled',
           'onenabled',
           'onenabling',
           'onerrored',
           'onsyncing'].forEach(event => {
            SyncStateMachine[event] = this[event].bind(this);
          });

          // IAC based sync management API.
          this.oniacrequestListener = this.oniacrequest.bind(this);
          window.addEventListener('iac-' + SYNC_MANAGEMENT_API_IAC_KEYWORD,
                                  this.oniacrequestListener);
          // Sync app lifecycle.
          this.onkillappListener = this.onkillapp.bind(this);
          window.addEventListener('killapp', this.onkillappListener);
          this.onappterminatedListener = this.onappterminated.bind(this);
          window.addEventListener('appterminated',
                                  this.onappterminatedListener);

          this.initStore().then(() => {
            this.debug('Sync.state setting initial value', this.state);
            // SyncStateMachine starts by default with 'disabled', so we can
            // request to enable sync or stay in the disabled state.
            // We need to make sure that we didn't end up in an inconsistent
            // state during the latest run (i.e. error, success, syncing,
            // enabling).
            switch(this.state) {
              case 'enabled':
              case 'success':
              case 'syncing':
                SyncStateMachine.enable();
                resolve();
                break;
              case 'enabling':
                this.updateState('disabled');
                resolve();
                break;
              case 'errored':
                if (this.error == ERROR_UNVERIFIED_ACCOUNT) {
                  // We try to enable Sync. This will check if the account is
                  // verified or not. If it's not verified, we go back to the
                  // errored state, otherwise, the user logs in.
                  SyncStateMachine.enable();
                  resolve();
                  break;
                }
                this.updateState('disabled');
                resolve();
                break;
              case 'disabled':
                resolve();
                break;
              default:
                console.error('Unexpected sync.state value', this.state);
                reject();
                break;
            }
          });
        });
      });
    },

    // Mostly for testing purposes.
    // We won't likely stop this ever in "real life".
    stop() {
      window.removeEventListener('iac-' + SYNC_MANAGEMENT_API_IAC_KEYWORD,
                                 this.oniacrequestListener);
      window.removeEventListener(FXA_EVENT, this.fxaEventHandler);
      window.removeEventListener('killapp', this.onkillappListener);
      window.removeEventListener('appterminated',
                                 this.onappterminatedListener);
    },

    /** Getters and setters **/

    set state(state) {
      state = state || SyncStateMachine.state;
      this.debug('Setting state', state);
      this.updateStateDeferred = new Promise(resolve => {
        asyncStorage.setItem(SYNC_STATE, state, () => {
          this.store.set(SYNC_STATE, state);
          if (state === 'disabled' || state === 'enabled' ||
              state === 'enabling') {
            this.updateStatePreference().then(() => {
              this.notifyStateChange();
              resolve();
            });
            return;
          }
          this.notifyStateChange();
        });
      });
    },

    get state() {
      var state = this.store.get(SYNC_STATE);
      return state ? state : 'disabled';
    },

    set error(error) {
      asyncStorage.setItem(SYNC_STATE_ERROR, error, () => {
        this.store.set(SYNC_STATE_ERROR, error);
      });
    },

    get error() {
      return this.store.get(SYNC_STATE_ERROR);
    },

    set lastSync(now) {
      var lastSync = now;
      asyncStorage.setItem(SYNC_LAST_TIME, lastSync, () => {
        this.store.set(SYNC_LAST_TIME, lastSync);
      });
    },

    get lastSync() {
      return this.store.get(SYNC_LAST_TIME);
    },

    set user(user) {
      asyncStorage.setItem(SYNC_USER, user, () => {
        this.store.set(SYNC_USER, user);
      });
    },

    get user() {
      return this.store.get(SYNC_USER);
    },

    /** Event handlers **/

    // We expose a very simple IAC based API to allow the Settings app to
    // manage Sync.
    //
    // We expect IAC messages to contain a property named 'name' with any
    // of the following values corresponding to the requests that we are
    // able to handle:
    //   - enable
    //   - disable
    //   - sync
    //   - getInfo
    //
    // SyncStateMachine is responsible of checking if the request is valid in
    // the current situation and progressing it accordingly by publishing the
    // corresponding events.
    oniacrequest(event) {
      if (!event || !event.detail) {
        console.error('Wrong IAC Sync event');
        return;
      }

      var request = event.detail;
      switch(request.name) {
        case 'enable':
        case 'disable':
        case 'sync':
          try {
            SyncStateMachine[request.name]();
          } catch(e) {
            console.error(e);
          }
          break;
        case 'getInfo':
          if (!request.id) {
            console.warn('IAC request ignored. Missing id');
            return;
          }
          this.getAccount().then(() => {
            this.managementPortMessage({
              id: request.id,
              state: this.state,
              error: this.state == 'errored' ? this.error : undefined,
              lastSync: this.lastSync,
              user: this.user
            });
          });
          break;
        default:
          console.warn('Unknown IAC Sync request', request.name);
          break;
      }
    },

    ondisabled() {
      this.debug('ondisabled observed');
      this.updateState();
      this.user = null;
      this.lastSync = null;
      this.cleanup();
      // On TV because the login on Sync is tied to a login on FxA, login out
      // from Sync means login out from FxA.
      // Keep logout *after* the cleanup call where we remove the FxA event
      // listeners.
      LazyLoader.load('js/fx_accounts_client.js', () => {
        FxAccountsClient.logout();
      });
    },

    onenabled() {
      this.debug('onenabled observed');
      this.updateState();
      this.registerSyncRequest().then(() => {
        this.debug('Sync request registered');
      }).catch(error => {
        console.error('Could not register sync request', error);
        SyncStateMachine.error(ERROR_REQUEST_SYNC_REGISTRATION);
      });
    },

    onenabling() {
      this.debug('onenabling observed');
      this.updateState();

      // Because we need to bind this to the event handler, we need to save
      // a reference to it so we can properly remove it later.
      this.fxaEventHandler = this.onfxa.bind(this);
      window.addEventListener(FXA_EVENT, this.fxaEventHandler);

      this.getAssertion().then(() => {
        return this.getAccount();
      }).then(() => {
        SyncStateMachine.success();
      }).catch(error => {
        // XXX Bug 1200284 - Normalize all Firefox Accounts error reporting.
        error = error.message || error.name || error.error || error;
        console.error('Could not enable sync', error);
        if (error == 'UNVERIFIED_ACCOUNT') {
          this.getAccount().then(() => {
            SyncStateMachine.error(ERROR_UNVERIFIED_ACCOUNT);
          });
          return;
        }
        SyncStateMachine.error(ERROR_GET_FXA_ASSERTION);
      });
    },

    onerrored(from, to, error) {
      this.debug(`onerrored observed ${error} while transitioning from ${from}
                 to ${to}`);

      if (!error) {
        return;
      }

      this.error = error;

      // We don't update the state until we set the error.
      this.updateState();

      if (SyncUnrecoverableErrors.indexOf(error) > -1) {
        this.debug('Unrecoverable error');
        SyncStateMachine.disable();
      }
    },

    onsyncing() {
      this.debug('onsyncsyncing observed');
      this.updateState();

      // In case that we are syncing on user demand, we unregister the
      // sync request.
      // It's harmless to unregister an expired request, so it's also ok
      // to do it for a periodic sync.
      this.unregisterSyncRequest();

      var collections = {};
      COLLECTIONS.forEach(name => {
        if (this.settings.has('sync.collections.' + name + '.enabled')) {
          collections[name] = {
            readonly: this.settings.get('sync.collections.' + name +
                                        '.readonly')
          };
        }
      });

      if (!Object.keys(collections).length) {
        SyncStateMachine.success();
        return;
      }

      var args = [];
      this.getAssertion().then(assertion => {
        args.push(assertion);
        return this.getKeys();
      }).then(keys => {
        args.push(keys);
        args.push(collections);
        this.doSync.apply(this, args);
      }).catch(error => {
        console.error('Sync error', error);
        SyncStateMachine.error(ERROR_SYNC_REQUEST);
      });
    },

    onfxa(event) {
      if (!event || !event.detail) {
        console.error('Wrong event');
        return;
      }

      switch (event.detail.eventName) {
        case 'onlogout':
          // Logging out from Firefox Accounts should disable Sync.
          SyncStateMachine.disable();
          break;
        case 'onverified':
          // Once the user verified her account, we can continue with the
          // enabling procedure.
          if (this.state == 'errored' &&
              this.error == ERROR_UNVERIFIED_ACCOUNT) {
            this.getAccount().then(() => {
              if (this.user) {
                SyncStateMachine.enable();
              }
            });
          }
          break;
      }
    },

    onkillapp(event) {
      // The synchronizer app can be killed while it's handling a sync
      // request. In that case, we need to record an error and notify
      // the state machine about it. Otherwise we could end up on a
      // permanent 'syncing' state.
      this.isSyncApp(event.detail ? event.detail.origin : null).then(() => {
        SyncStateMachine.error(ERROR_SYNC_APP_KILLED);
      });
    },

    onappterminated(event) {
      // If the Sync app is closed, we need to release the reference to
      // its IAC port, so we can get a new connection on the next sync
      // request. Unfortunately, the IAC API doesn't take care of
      // notifying when a port is dead. So we need to do it manually.
      if (!this._port) {
        return;
      }
      this.isSyncApp(event.detail ? event.detail.origin : null).then(() => {
        this._port = null;
      });
    },

    /** Helpers **/

    initStore: function() {
      var promises = [];
      [SYNC_STATE,
       SYNC_STATE_ERROR,
       SYNC_LAST_TIME].forEach(key => {
        var promise = new Promise(resolve => {
          asyncStorage.getItem(key, value => {
            this.debug(key + ': ' + value);
            this.store.set(key, value);
            resolve();
          });
        });
        promises.push(promise);
      });
      return Promise.all(promises);
    },

    updateState: function(state) {
      this.state = state || SyncStateMachine.state;
    },

    registerSyncRequest() {
      return navigator.sync.registrations().then(registrations => {
        var existingReg;
        registrations.some(reg => {
          if (reg.task === SYNC_TASK) {
            return !!(existingReg = reg);
          }
        });

        if (existingReg) {
          this.debug('Sync request already exists');
          return Promise.resolve();
        }

        this.debug('Registering sync request', location.href);

        var minInterval = this.DEBUG ? 120 :
                          this.settings.get('sync.scheduler.interval');
        var wifiOnly = this.settings.has('sync.scheduler.wifionly') ?
                       this.settings.get('sync.scheduler.wifionly') : false;

        return navigator.sync.register(SYNC_TASK, {
          minInterval: minInterval, // minInterval is in seconds.
          oneShot: true,
          wifiOnly: wifiOnly,
          data: null,
          wakeUpPage: location.href
        });
      });
    },

    unregisterSyncRequest() {
      navigator.sync.unregister(SYNC_TASK).catch(e => {
        // A failure unregistering the sync task might be expected
        // depending on the state we are (i.e. enabling). In any case,
        // we show a warning, so a bug can be identified or discarded.
        console.warn('Could not unregister sync task', e,
                     SyncStateMachine.state);
      });
    },

    getKeys() {
      return new Promise((resolve, reject) => {
        LazyLoader.load('js/fx_accounts_client.js', () => {
          FxAccountsClient.getKeys(resolve, reject);
        });
      });
    },

    getAssertion() {
      return new Promise((resolve, reject) => {
        LazyLoader.load('js/fx_accounts_client.js', () => {
          FxAccountsClient.getAssertion({
            audience: this.settings.get('sync.fxa.audience')
          }, resolve, reject);
        });
      });
    },

    getAccount() {
      return new Promise((resolve, reject) => {
        LazyLoader.load('js/fx_accounts_client.js', () => {
          FxAccountsClient.getAccount(account => {
            this.user = account ? account.email : null;
            resolve(account);
          }, reject);
        });
      });
    },

    managementPortMessage(message) {
      var port = IACHandler.getPort(SYNC_MANAGEMENT_API_IAC_KEYWORD, this);
      if (!port) {
        this.debug('No management API consumers');
        // We may not have any consumers yet. So in that case
        // we simply bail out here.
        return;
      }
      port.postMessage(message);
    },

    notifyStateChange() {
      this.managementPortMessage({
        name: 'onsyncchange',
        state: this.state,
        error: this.error,
        lastSync: this.lastSync,
        user: this.user
      });
    },

    connect() {
      if (this._port) {
        return Promise.resolve(this._port);
      }

      return new Promise((resolve, reject) => {
        navigator.mozApps.getSelf().onsuccess = event => {
          var app = event.target.result;
          app.connect(SYNC_REQUEST_IAC_KEYWORD).then(ports => {
            if (!ports || !ports.length) {
              return reject();
            }
            this._port = ports[0];
            resolve(this._port);
          }).catch(error => {
            console.error(error);
            reject(error);
          });
        };
      });
    },

    iacRequest(request) {
      return new Promise((resolve, reject) => {
        this.connect().then(port => {
          LazyLoader.load('/shared/js/uuid.js', () => {
            var id = uuid();
            request.id = id;
            port.postMessage(request);
            port.onmessage = event => {
              var message = event.data;
              if (!message || (message.id != id)) {
                return;
              }
              resolve(message);
            };
          });
        });
      });
    },

    doSync(assertion, keys, collections) {
      this.debug('Syncing with', JSON.stringify(collections));
      this.iacRequest({
        name: 'sync',
        URL: this.settings.get('sync.server.url'),
        assertion: assertion,
        keys: keys,
        collections: collections
      }).then(result => {
        if (result.error) {
          console.error('Error while trying to sync', result.error);
          // XXX The sync app needs to propagate a less general error.
          SyncStateMachine.error(ERROR_SYNC_APP_GENERIC);
          return;
        }
        this.debug('Sync succeded');
        this.lastSync = Date.now();

        SyncStateMachine.success();
      });
    },

    cancelSync() {
      this.iacRequest({
        name: 'cancel'
      });
    },

    isSyncApp: function(origin) {
      if (!origin) {
        return Promise.reject();
      }
      return new Promise((resolve, reject) => {
        navigator.mozApps.getSelf().onsuccess = event => {
          var app = event.target.result;
          app.getConnections().then(connections => {
            connections.forEach(connection => {
              if (connection.keyword != SYNC_REQUEST_IAC_KEYWORD ||
                  connection.subscriber.indexOf(origin) < 0) {
                return;
              }
              resolve();
            });
            reject();
          });
        };
      });
    },

    cleanup() {
      this.unregisterSyncRequest();
      window.removeEventListener(FXA_EVENT, this.fxaEventHandler);
      // If we disabled Sync while a sync request was in progress, we need to
      // cancel the request.
      if (this.state === 'syncing') {
        this.cancelSync();
      }
    },

    updateStatePreference: function() {
      // Changing the value of this setting changes the value of
      // the 'services.sync.enabled' preference as well.
      // We don't retrieve the Sync keys unless this pref is set to true.
      const CHROME_EVENT = 'mozPrefChromeEvent';
      return new Promise((resolve, reject) => {
        var onprefchange = event => {
          this.debug('Preference change ', event.detail);
          if (event.detail.prefName !== 'services.sync.enabled') {
            return;
          }
          window.removeEventListener(CHROME_EVENT, onprefchange);
          resolve();
        };
        window.addEventListener(CHROME_EVENT, onprefchange);
        navigator.mozSettings.createLock().set({
          'services.sync.enabled': this.state !== 'disabled'
        }).onerror = reject;
      });
    },

    debug() {
      if (this.DEBUG) {
        console.log('[SyncManager] ' + Array.slice(arguments).concat());
      }
    }
  };

  var syncManager = new SyncManager();
  syncManager.start();

  // Exported for testing purposes only.
  exports.SyncManager = SyncManager;
}(window));
