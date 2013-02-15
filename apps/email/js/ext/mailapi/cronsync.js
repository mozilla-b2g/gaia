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
 * We use mozAlarm to schedule ourselves to wake up when our next
 * synchronization should occur.
 *
 * All synchronization occurs in parallel because we want the interval that we
 * force the device's radio into higher power modes to be as short as possible.
 *
 * IMPORTANT ARCHITECTURAL NOTE:  This logic is part of the back-end, not the
 * front-end.  We want to serve up the notifications, but we want the front-end
 * to be the one that services them when the user clicks on them.
 **/

define('mailapi/cronsync',
  [
    'rdcommon/log',
    './allback',
    'module',
    'exports'
  ],
  function(
    $log,
    $allback,
    $module,
    exports
  ) {


/**
 * Sanity demands we do not check more frequently than once a minute.
 */
const MINIMUM_SYNC_INTERVAL_MS = 60 * 1000;

/**
 * How long should we let a synchronization run before we give up on it and
 * potentially try and kill it (if we can)?
 */
const MAX_SYNC_DURATION_MS = 3 * 60 * 1000;

/**
 * Caps the number of notifications we generate per account.  It would be
 * sitcom funny to let this grow without bound, but would end badly in reality.
 */
const MAX_MESSAGES_TO_REPORT_PER_ACCOUNT = 5;

/**
 * Implements the interface of `MailSlice` as presented to `FolderStorage`, but
 * it is only interested in accumulating a list of new messages that have not
 * already been read.
 *
 * FUTURE WORK: Listen for changes that make a message that was previously
 * believed to be new no longer new, such as having been marked read by
 * another client.  We don't care about that right now because we lack the
 * ability to revoke notifications via the mozNotifications API.
 */
function CronSlice(storage, desiredNew, callback) {
  this._storage = storage;
  this._callback = callback;

  this.startTS = null;
  this.startUID = null;
  this.endTS = null;
  this.endUID = null;
  this.waitingOnData = false;
  this._accumulating = false;

  // Maintain the list of all headers for the IMAP sync logic's benefit for now.
  // However, we don't bother sorting it; we just care about the length.
  this.headers = [];
  this._desiredNew = desiredNew;
  this._newHeaders = [];
  // XXX for now, assume that the 10 most recent headers will cover us.  Being
  // less than (or the same as) the initial fill sync of 15 is advantageous in
  // that it avoids us triggering a deepening sync on IMAP.
  this.desiredHeaders = 10;
  this.ignoreHeaders = false;
}
CronSlice.prototype = {
  set ignoreHeaders(ignored) {
    // ActiveSync likes to turn on ignoreHeaders mode because it only cares
    // about the newest messages and it may be told about messages in a stupid
    // order.  But old 'new' messages are still 'new' to us and we have punted
    // on analysis, so we are fine with the potential lossage.  Also, the
    // batch information loses the newness bit we care about...
    //
    // And that's why we ignore the manipulation and always return false in
    // the getter.
  },
  get ignoreHeaders() {
    return false;
  },

  // (copied verbatim for consistency)
  sendEmptyCompletion: function() {
    this.setStatus('synced', true, false);
  },

  setStatus: function(status, requested, moreExpected, flushAccumulated) {
    if (requested && !moreExpected && this._callback) {
console.log('sync done!');
      this._callback(this._newHeaders);
      this._callback = null;
      this.die();
    }
  },

  batchAppendHeaders: function(headers, insertAt, moreComing) {
    this.headers = this.headers.concat(headers);
    // Do nothing, batch-appended headers are always coming from the database
    // and so are not 'new' from our perspective.
  },

  onHeaderAdded: function(header, syncDriven, messageIsNew) {
    this.headers.push(header);
    // we don't care if it's not new or was read (on another client)
    if (!messageIsNew || header.flags.indexOf('\\Seen') !== -1)
      return;

    // We don't care if we already know about enough new messages.
    // (We could also try and decide which messages are most important, but
    // since this behaviour is not really based on any UX-provided guidance, it
    // would be silly to do that without said guidance.)
    if (this._newHeaders.length >= this._desiredNew)
      return;
    this._newHeaders.push(header);
  },

  onHeaderModified: function(header) {
    // Do nothing, modified headers are obviously already known to us.
  },

  onHeaderRemoved: function(header) {
    this.headers.pop();
    // Do nothing, this would be silly.
  },

  die: function() {
    this._storage.dyingSlice(this);
  },
};

function generateNotificationForMessage(header, onClick, onClose) {
  // NB: We don't need to use NotificationHelper because we end up doing
  // something similar ourselves.
console.log('generating notification for:', header.suid, header.subject);
  var notif = navigator.mozNotification.createNotification(
    header.author.name || header.author.address,
    header.subject,
    // XXX it makes no sense that the back-end knows the path of the icon,
    // but this specific function may need to vary based on host environment
    // anyways...
    gIconUrl);
  notif.onclick = onClick.bind(null, header, notif);
  notif.onclose = onClose.bind(null, header, notif);
  notif.show();
  return notif;
}

var gApp, gIconUrl;
navigator.mozApps.getSelf().onsuccess = function(event) {
  gApp = event.target.result;
  gIconUrl = gApp.installOrigin + '/style/icons/Email.png';
};
/**
 * Try and bring up the given header in the front-end.
 *
 * XXX currently, we just cause the app to display, but we don't do anything
 * to cause the actual message to be displayed.  Right now, since the back-end
 * and the front-end are in the same app, we can easily tell ourselves to do
 * things, but in the separated future, we might want to use a webactivity,
 * and as such we should consider using that initially too.
 */
function displayHeaderInFrontend(header) {
  gApp.launch();
}

/**
 * Creates the synchronizer.  It is does not do anything until the first call
 * to setSyncInterval.
 */
function CronSyncer(universe, _logParent) {
  this._universe = universe;
  this._syncIntervalMS = 0;

  this._LOG = LOGFAB.CronSyncer(this, null, _logParent);

  /**
   * @dictof[
   *   @key[accountId String]
   *   @value[@dict[
   *     @key[clickHandler Function]
   *     @key[closeHandler Function]
   *     @key[notes Array]
   *   ]]
   * ]{
   *   Terminology-wise, 'notes' is less awkward than 'notifs'...
   * }
   */
  this._outstandingNotesPerAccount = {};

  this._initialized = false;
  this._hackTimeout = null;

  this._activeSlices = [];
}
exports.CronSyncer = CronSyncer;
CronSyncer.prototype = {
  /**
   * Remove any/all scheduled alarms.
   */
  _clearAlarms: function() {
    // mozalarms doesn't work on desktop; comment out and use setTimeout.
    if (this._hackTimeout !== null) {
      window.clearTimeout(this._hackTimeout);
      this._hackTimeout = null;
    }
/*
    var req = navigator.mozAlarms.getAll();
    req.onsuccess = function(event) {
      var alarms = event.target.result;
      for (var i = 0; i < alarms.length; i++) {
        navigator.mozAlarms.remove(alarms[i].id);
      }
    }.bind(this);
*/
  },

  _scheduleNextSync: function() {
    if (!this._syncIntervalMS)
      return;
    console.log("scheduling sync for " + (this._syncIntervalMS / 1000) +
                " seconds in the future.");
    this._hackTimeout = window.setTimeout(this.onAlarm.bind(this),
                                          this._syncIntervalMS);
/*
    try {
      console.log('mpozAlarms', navigator.mozAlarms);
      var req = navigator.mozAlarms.add(
        new Date(Date.now() + this._syncIntervalMS),
        'ignoreTimezone', {});
      console.log('req:', req);
      req.onsuccess = function() {
        console.log('scheduled!');
      };
      req.onerror = function(event) {
        console.warn('alarm scheduling problem!');
        console.warn(' err:',
                     event.target && event.target.error &&
                     event.target.error.name);
      };
    }
    catch (ex) {
      console.error('problem initiating request:', ex);
    }
*/
  },

  setSyncIntervalMS: function(syncIntervalMS) {
    console.log('setSyncIntervalMS:', syncIntervalMS);
    var pendingAlarm = false;
    if (!this._initialized) {
      this._initialized = true;
      // mozAlarms doesn't work on b2g-desktop
      /*
      pendingAlarm = navigator.mozHasPendingMessage('alarm');
      navigator.mozSetMessageHandler('alarm', this.onAlarm.bind(this));
     */
    }

    // leave zero intact, otherwise round up to the minimum.
    if (syncIntervalMS && syncIntervalMS < MINIMUM_SYNC_INTERVAL_MS)
      syncIntervalMS = MINIMUM_SYNC_INTERVAL_MS;

    this._syncIntervalMS = syncIntervalMS;

    // If we have a pending alarm, then our app was loaded to service the
    // alarm, so we should just let the alarm fire which will also take
    // care of rescheduling everything.
    if (pendingAlarm)
      return;

    this._clearAlarms();
    this._scheduleNextSync();
  },

  /**
   * Synchronize the given account.  Right now this is just the Inbox for the
   * account.
   *
   * XXX For IMAP, we really want to use the standard iterative growth logic
   * but generally ignoring the number of headers in the slice and instead
   * just doing things by date.  Since making that correct without breaking
   * things or making things really ugly will take a fair bit of work, we are
   * initially just using the UI-focused logic for this.
   *
   * XXX because of this, we totally ignore IMAP's number of days synced
   * value.  ActiveSync handles that itself, so our ignoring it makes no
   * difference for it.
   */
  syncAccount: function(account, doneCallback) {
    // - Skip syncing if we are offline or the account is disabled
    if (!this._universe.online || !account.enabled) {
      doneCallback(null);
      return;
    }

    var inboxFolder = account.getFirstFolderWithType('inbox');
    var storage = account.getFolderStorageForFolderId(inboxFolder.id);

    // XXX check when the folder was most recently synchronized and skip this
    // sync if it is sufficiently recent.

    // - Figure out how many additional notifications we can generate
    var outstandingInfo;
    if (this._outstandingNotesPerAccount.hasOwnProperty(account.id)) {
      outstandingInfo = this._outstandingNotesPerAccount[account.id];
    }
    else {
      outstandingInfo = this._outstandingNotesPerAccount[account.id] = {
        clickHandler: function(header, note, event) {
          var idx = outstandingInfo.notes.indexOf(note);
          if (idx === -1)
            console.warn('bad note index!');
          outstandingInfo.notes.splice(idx);
          // trigger the display of the app!
          displayHeaderInFrontend(header);
        },
        closeHandler: function(header, note, event) {
          var idx = outstandingInfo.notes.indexOf(note);
          if (idx === -1)
            console.warn('bad note index!');
          outstandingInfo.notes.splice(idx);
        },
        notes: [],
      };
    }

    var desiredNew = MAX_MESSAGES_TO_REPORT_PER_ACCOUNT -
                       outstandingInfo.notes.length;

    // - Initiate a sync of the folder covering the desired time range.
    this._LOG.syncAccount_begin(account.id);
    var slice = new CronSlice(storage, desiredNew, function(newHeaders) {
      this._LOG.syncAccount_end(account.id);
      doneCallback(null);
      this._activeSlices.splice(this._activeSlices.indexOf(slice), 1);
      for (var i = 0; i < newHeaders.length; i++) {
        var header = newHeaders[i];
        outstandingInfo.notes.push(
          generateNotificationForMessage(header,
                                         outstandingInfo.clickHandler,
                                         outstandingInfo.closeHandler));
      }
    }.bind(this));
    this._activeSlices.push(slice);
    // use forceDeepening to ensure that a synchronization happens.
    storage.sliceOpenFromNow(slice, 3, true);

  },

  onAlarm: function() {
    this._LOG.alarmFired();
    // It would probably be better if we only added the new alarm after we
    // complete our sync, but we could have a problem if our sync progress
    // triggered our death, so we don't do that.
    this._scheduleNextSync();

    // Kill off any slices that still exist from the last sync.
    for (var iSlice = 0; iSlice < this._activeSlices.length; iSlice++) {
      this._activeSlices[iSlice].die();
    }

    var doneOrGaveUp = function doneOrGaveUp(results) {
      // XXX add any life-cycle stuff here, like amending the schedule for the
      // next firing based on how long it took us.  Or if we need to compute
      // smarter sync notifications across all accounts, do it here.
    }.bind(this);

    var accounts = this._universe.accounts, accountIds = [], account, i;
    for (i = 0; i < accounts.length; i++) {
      account = accounts[i];
      accountIds.push(account.id);
    }
    var callbacks = $allback.allbackMaker(accountIds, doneOrGaveUp);
    for (i = 0; i < accounts.length; i++) {
      account = accounts[i];
      this.syncAccount(account, callbacks[account.id]);
    }
  },

  shutdown: function() {
    // no actual shutdown is required; we want our alarm to stick around.
  }
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  CronSyncer: {
    type: $log.DAEMON,
    events: {
      alarmFired: {},
    },
    TEST_ONLY_events: {
    },
    asyncJobs: {
      syncAccount: { id: false },
    },
    errors: {
    },
    calls: {
    },
    TEST_ONLY_calls: {
    },
  },
});

}); // end define
