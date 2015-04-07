/*global define, console, setTimeout */
/**
 * Drives periodic synchronization, covering the scheduling, deciding what
 * folders to sync, and generating notifications to relay to the UI.  More
 * specifically, we have two goals:
 *
 * 1) Generate notifications about new messages.
 *
 * 2) Cause the device to synchronize its offline store periodically with the
 *    server for general responsiveness and so the user can use the device
 *    offline.
 *
 * We use navigator.sync to schedule ourselves to wake up when our next
 * synchronization should occur.
 *
 * All synchronization occurs in parallel because we want the interval that we
 * force the device's radio into higher power modes to be as short as possible.
 *
 * This logic is part of the back-end, not the front-end.  We want to notify
 * the front-end of new messages, but we want the front-end to be the one that
 * displays and services them to the user.
 **/

define(
  [
    'logic',
    './worker-router',
    './slice_bridge_proxy',
    './mailslice',
    './syncbase',
    './allback',
    'module',
    'exports'
  ],
  function(
    logic,
    $router,
    $sliceBridgeProxy,
    $mailslice,
    $syncbase,
    $allback,
    $module,
    exports
  ) {


function debug(str) {
  console.log("cronsync: " + str + "\n");
}

var SliceBridgeProxy = $sliceBridgeProxy.SliceBridgeProxy;

/**
 * Create a specialized sync slice via clobbering that accumulates a list of
 * new headers and invokes a callback when the sync has fully completed.
 *
 * Fully completed includes:
 * - The account update has been fully saved to disk.
 *
 * New header semantics are:
 * - Header is as new or newer than the newest header we previously knew about.
 *   Specifically we're using SINCE which is >=, so a message that arrived at
 *   the same second as the other message still counts as new.  Because the new
 *   message will inherently have a higher id than the other message, this
 *   meets with our other ordering semantics, although I'm thinking it wasn't
 *   totally intentional.
 * - Header is unread.  (AKA Not \Seen)
 *
 * "Clobbering" in this case means this is a little hacky.  What we do is:
 * - Take a normal slice and hook it up to a normal SliceBridgeProxy, but
 *   give the proxy a fake bridge that never sends any data anywhere.  This
 *   is reasonably future-proof/safe.
 *
 * - Put an onNewHeader method on the slice to accumulate the new headers.
 *   The new headers are all we care about.  The rest of the headers loaded/etc.
 *   are boring to us and do not matter.  However, there's relatively little
 *   memory or CPU overhead to letting that stuff get populated/retained since
 *   it's in memory already anyways and at worst we're only delaying the GC by
 *   a little bit.  (This is not to say there aren't pathological situations
 *   possible, but they'd be largely the same if the user triggered the sync.
 *   The main difference cronsync currently will definitely not shrink the
 *   slice.
 *
 * - Clobber proy.sendStatus to know when the sync has completed via the
 *   same signal the front-end uses to know when the sync is over.
 *
 * You as the caller need to:
 * - Make sure to kill the slice in a timely fashion after we invoke the
 *   callback.  Since killing the slice can result in the connection immediately
 *   being closed, you want to make sure that if you're doing anything like
 *   scheduling snippet downloads that you do that first.
 */
function makeHackedUpSlice(storage, callback) {
  var fakeBridgeThatEatsStuff = {
        __sendMessage: function() {}
      },
      proxy = new SliceBridgeProxy(fakeBridgeThatEatsStuff, 'cron'),
      slice = new $mailslice.MailSlice(proxy, storage),
      oldStatusMethod = proxy.sendStatus,
      newHeaders = [];

  slice.onNewHeader = function(header) {
    console.log('onNewHeader: ' + header);
    newHeaders.push(header);
  };

  proxy.sendStatus = function(status, requested, moreExpected,
                              progress, newEmailCount) {
    // (maintain normal behaviour)
    oldStatusMethod.apply(this, arguments);

    // We do not want to declare victory until the sync process has fully
    // completed which (significantly!) includes waiting for the save to have
    // completed.
    // (Only fire completion once.)
    if (callback) {
      switch (status) {
        // normal success and failure
        case 'synced':
        case 'syncfailed':
        // ActiveSync specific edge-case where syncFolderList has not yet
        // completed.  If the slice is still alive when syncFolderList completes
        // the slice will auto-refresh itself.  We don't want or need this,
        // which is fine since we kill the slice in the callback.
        case 'syncblocked':
          try {
            callback(newHeaders);
          }
          catch (ex) {
            console.error('cronsync callback error:', ex, '\n', ex.stack);
            callback = null;
            throw ex;
          }
          callback = null;
          break;
      }
    }
  };

  return slice;
}

/**
 * The brains behind periodic account synchronization; only created by the
 * universe once it has loaded its configuration and accounts.
 */
function CronSync(universe) {
  this._universe = universe;

  logic.defineScope(this, 'CronSync');

  this._activeSlices = [];

  this._completedEnsureSync = true;
  this._syncAccountsDone = true;

  // An internal callback to invoke when it looks like sync has completed.  This
  // can also be thought of as a boolean indicator that we're actually
  // performing a cronsync as opposed to just in a paranoia-call to ensureSync.
  // TODO: Use a promises flow or otherwise alter control flow so that ensureSync
  // doesn't end up in _checkSyncDone with ambiguity about what is going on.
  this._onSyncDone = null;

  this._synced = [];

  this.sendCronSync = $router.registerSimple('cronsync', function(data) {
    var args = data.args;
    switch (data.cmd) {
      case 'requestSync':
        debug('received a requestSync via a message handler');
        this.onRequestSync.apply(this, args);
        break;
      case 'syncEnsured':
        debug('received an syncEnsured via a message handler');
        this.onSyncEnsured.apply(this, args);
        break;
    }
  }.bind(this));
  this.sendCronSync('hello');

  this.ensureSync();
}

exports.CronSync = CronSync;
CronSync.prototype = {
  _killSlices: function() {
    logic(this, 'killSlices', { count: this._activeSlices.length });
    this._activeSlices.forEach(function(slice) {
      slice.die();
    });
  },

  /**
   * Makes sure there is a sync timer set up for all accounts.
   */
  ensureSync: function() {
    // Only execute ensureSync if it is not already in progress. Otherwise, due
    // to async timing of navigator.sync setting, could end up with two sync
    // tasks for the same ID.
    if (!this._completedEnsureSync)
      return;

    logic(this, 'ensureSync_begin');
    this._completedEnsureSync = false;

    debug('ensureSync called');

    var accounts = this._universe.accounts,
        syncData = {};

    accounts.forEach(function(account) {
      // Store data by interval, use a more obvious string
      // key instead of just stringifying a number, which
      // could be confused with an array construct.
      var interval = account.accountDef.syncInterval,
          intervalKey = 'interval' + interval;

      if (!syncData.hasOwnProperty(intervalKey)) {
        syncData[intervalKey] = [];
      }
      syncData[intervalKey].push(account.id);
    });

    this.sendCronSync('ensureSync', [syncData]);
  },

  /**
   * Synchronize the given account. This fetches new messages for the
   * inbox, and attempts to send pending outbox messages (if
   * applicable). The callback occurs after both of those operations
   * have completed.
   */
  syncAccount: function(account, doneCallback) {
    var scope = logic.subscope(this, { accountId: account.id });

    // - Skip syncing if we are offline or the account is disabled
    if (!this._universe.online || !account.enabled) {
      debug('syncAccount early exit: online: ' +
            this._universe.online + ', enabled: ' + account.enabled);
      logic(scope, 'syncSkipped');
      doneCallback();
      return;
    }

    var latch = $allback.latch();
    var inboxDone = latch.defer('inbox');

    var inboxFolder = account.getFirstFolderWithType('inbox');
    var storage = account.getFolderStorageForFolderId(inboxFolder.id);

    // XXX check when the folder was most recently synchronized and skip this
    // sync if it is sufficiently recent.

    // - Initiate a sync of the folder covering the desired time range.
    logic(scope, 'syncAccount_begin');
    logic(scope, 'syncAccountHeaders_begin');

    var slice = makeHackedUpSlice(storage, function(newHeaders) {
      logic(scope, 'syncAccountHeaders_end', { headers: newHeaders });
      this._activeSlices.splice(this._activeSlices.indexOf(slice), 1);

      // Reduce headers to the minimum number and data set needed for
      // notifications.
      var notifyHeaders = [];
      newHeaders.some(function(header, i) {
        notifyHeaders.push({
          date: header.date,
          from: header.author.name || header.author.address,
          subject: header.subject,
          accountId: account.id,
          messageSuid: header.suid
        });

        if (i === $syncbase.CRONSYNC_MAX_MESSAGES_TO_REPORT_PER_ACCOUNT - 1)
          return true;
      });

      if (newHeaders.length) {
        debug('Asking for snippets for ' + notifyHeaders.length + ' headers');
        // POP3 downloads snippets as part of the sync process, there is no
        // need to call downloadBodies.
        if (account.accountDef.type === 'pop3+smtp') {
          logic(scope, 'syncAccount_end');
          inboxDone([newHeaders.length, notifyHeaders]);
        } else if (this._universe.online) {
          logic(scope, 'syncAccountSnippets_begin');
          this._universe.downloadBodies(
            newHeaders.slice(
              0, $syncbase.CRONSYNC_MAX_SNIPPETS_TO_FETCH_PER_ACCOUNT),
            {
              maximumBytesToFetch: $syncbase.MAX_SNIPPET_BYTES
            },
            function() {
              debug('Notifying for ' + newHeaders.length + ' headers');
              logic(scope, 'syncAccountSnippets_end');
              logic(scope, 'syncAccount_end');
              inboxDone([newHeaders.length, notifyHeaders]);
            }.bind(this));
        } else {
          logic(scope, 'syncAccount_end');
          debug('UNIVERSE OFFLINE. Notifying for ' + newHeaders.length +
                ' headers');
          inboxDone([newHeaders.length, notifyHeaders]);
        }
      } else {
        logic(scope, 'syncAccount_end');
        inboxDone();
      }

      // Kill the slice.  This will release the connection and result in its
      // death if we didn't schedule snippet downloads above.
      slice.die();
    }.bind(this));

    this._activeSlices.push(slice);
    // Pass true to force contacting the server.
    storage.sliceOpenMostRecent(slice, true);

    // Check the outbox; if it has pending messages, attempt to send them.
    var outboxFolder = account.getFirstFolderWithType('outbox');
    if (outboxFolder) {
      var outboxStorage = account.getFolderStorageForFolderId(outboxFolder.id);
      if (outboxStorage.getKnownMessageCount() > 0) {
        var outboxDone = latch.defer('outbox');
        logic(scope, 'sendOutbox_begin');
        this._universe.sendOutboxMessages(
          account,
          {
            reason: 'syncAccount'
          },
          function() {
            logic(scope, 'sendOutbox_end');
            outboxDone();
          }.bind(this));
      }
    }

    // After both inbox and outbox syncing are algorithmically done,
    // wait for any ongoing job operations to complete so that the app
    // is not killed in the middle of a sync.
    latch.then(function(latchResults) {
      // Right now, we ignore the outbox sync's results; we only care
      // about the inbox.
      var inboxResult = latchResults.inbox[0];
      this._universe.waitForAccountOps(account, function() {
        // Also wait for any account save to finish. Most
        // likely failure will be new message headers not
        // getting saved if the callback is not fired
        // until after account saves.
        account.runAfterSaves(function() {
          doneCallback(inboxResult);
        });
      });
    }.bind(this));
  },

  onRequestSync: function(accountIds) {
    logic(this, 'requestSyncFired', { accountIds: accountIds });

    if (!accountIds)
      return;

    var accounts = this._universe.accounts,
        targetAccounts = [],
        ids = [];

    this._cronsyncing = true;
    logic(this, 'cronSync_begin');
    this._universe.__notifyStartedCronSync(accountIds);

    // Make sure the acount IDs are still valid. This is to protect agains
    // an account deletion that did not clean up any sync tasks correctly.
    accountIds.forEach(function(id) {
      accounts.some(function(account) {
        if (account.id === id) {
          targetAccounts.push(account);
          ids.push(id);
          return true;
        }
      });
    });

    // Flip switch to say account syncing is in progress.
    this._syncAccountsDone = false;

    // Make sure next sync is set up. In the case of a cold start
    // background sync, this is a bit redundant in that the startup
    // of the mailuniverse would trigger this work. However, if the
    // app is already running, need to be sure next sync is set up,
    // so ensure the next sync is set up here. Do it here instead of
    // after a sync in case an error in sync would prevent the next
    // sync from getting scheduled.
    this.ensureSync();

    var syncMax = targetAccounts.length,
        syncCount = 0,
        accountsResults = {
          accountIds: accountIds
        };

    var done = function() {
      syncCount += 1;
      if (syncCount < syncMax)
        return;

      // Kill off any slices that still exist from the last sync.
      this._killSlices();

      // Wrap up the sync
      this._syncAccountsDone = true;
      this._onSyncDone = function() {
        if (this._synced.length) {
          accountsResults.updates = this._synced;
          this._synced = [];
        }

        this._universe.__notifyStoppedCronSync(accountsResults);
        logic(this, 'syncAccounts_end', { accountsResults: accountsResults });
      }.bind(this);

      this._checkSyncDone();
    }.bind(this);

    // Nothing new to sync, probably old accounts. Just return and indicate
    // that syncing is done.
    if (!ids.length) {
      done();
      return;
    }

    logic(this, 'syncAccounts_begin');
    targetAccounts.forEach(function(account) {
      this.syncAccount(account, function (result) {
        if (result) {
          this._synced.push({
            id: account.id,
            address: account.identities[0].address,
            count: result[0],
            latestMessageInfos: result[1]
          });
        }
        done();
      }.bind(this));
    }.bind(this));
  },

  /**
   * Checks for "sync all done", which means the ensureSync call completed, and
   * new sync tasks for next sync are set, and the account syncs have finished.
   * If those two things are true, then notify the universe that the sync is
   * done.
   */
  _checkSyncDone: function() {
    if (!this._completedEnsureSync || !this._syncAccountsDone)
      return;

    // _onSyncDone implies this was a cronsync, !_onSyncDone implies just an
    // ensureSync.  See comments in the constructor.
    if (this._onSyncDone) {
      this._onSyncDone();
      this._onSyncDone = null;
      logic(this, 'cronSync_end');
    }
  },

  /**
   * Called from cronsync-main once ensureSync as set
   * any sync tasks needed. Need to wait for it before
   * signaling sync is done because otherwise the app
   * could get closed down before the sync task additions
   * succeed.
   */
  onSyncEnsured: function() {
    this._completedEnsureSync = true;
    logic(this, 'ensureSync_end');
    this._checkSyncDone();
  },

  shutdown: function() {
    $router.unregister('cronsync');
    this._killSlices();
  }
};


}); // end define
