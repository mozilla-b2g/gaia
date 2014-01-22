
/**
 * Error-handling/backoff logic.
 *
 * - All existing-account network-accessing functionality uses this module to
 *   track the state of accounts and resources within accounts that are may
 *   experience some type of time-varying failures.
 * - Account autoconfiguration probing logic does not use this module; it just
 *   checks whether there is a network connection.
 *
 * - Accounts define 'endpoints' with us when they are instantiated for each
 *   server connection type they have.  For IMAP, this means an SMTP endpoint
 *   and an IMAP endpoint.
 * - These 'endpoints' may have internal 'resources' which may manifest failures
 *   of their own if-and-only-if it is expected that there could be transient
 *   failures within the endpoint.  For IMAP, it is possible for IMAP servers to
 *   not let us into certain folders because there are other active connections
 *   inside them.  If something can't fail, there is no need to name it as a
 *   resource.
 *
 * - All endpoints have exactly one status: 'healthy', 'unreachable', or
 *   'broken'.  Unreachable implies we are having trouble talking with the
 *   endpoint because of network issues.  Broken implies that although we can
 *   talk to the endpoint, it doesn't want to talk to us for reasons of being
 *   offline for maintenance or account migration or something like that.
 * - Endpoint resources can only be 'broken' and are only tracked if they are
 *   broken.
 *
 * - If we encounter a network error for an otherwise healthy endpoint then we
 *   try again once right away, as a lot of network errors only become evident
 *   once we have a new, good network.
 * - On subsequent network errors for the previously healthy endpoint where we
 *   have already retried, we try after a ~1 second delay and then a ~5 second
 *   delay.  Then we give up and put the endpoint in the unreachable or broken
 *   state, as appropriate.  These choice of delays are entirely arbitrary.
 *
 * - We only try once to connect to endpoints that are in a degraded state.  We
 *   do not retry because that would be wasteful.
 *
 * - Once we put an endpoint in a degraded (unreachable or broken) state, this
 *   module never does anything to try and probe for the endpoint coming back
 *   on its own.  We rely on the existing periodic synchronization logic or
 *   user actions to trigger a new attempt.  WE MAY NEED TO CHANGE THIS AT
 *   SOME POINT since it's possible that the user may have queued an email for
 *   sending that they want delivered sooner than the cron logic triggers, but
 *   that's way down the road.
 **/

define('mailapi/errbackoff',
  [
    './date',
    'rdcommon/log',
    'module',
    'exports'
  ],
  function(
    $date,
    $log,
    $module,
    exports
  ) {

var BACKOFF_DURATIONS = exports.BACKOFF_DURATIONS = [
  { fixedMS: 0,    randomMS: 0 },
  { fixedMS: 800,  randomMS: 400 },
  { fixedMS: 4500, randomMS: 1000 },
];

var BAD_RESOURCE_RETRY_DELAYS_MS = [
  1000,
  60 * 1000,
  2 * 60 * 1000,
];

var setTimeoutFunc = window.setTimeout.bind(window);

exports.TEST_useTimeoutFunc = function(func) {
  setTimeoutFunc = func;
  for (var i = 0; i < BACKOFF_DURATIONS.length; i++) {
    BACKOFF_DURATIONS[i].randomMS = 0;
  }
};

/**
 * @args[
 *   @param[listener @dict[
 *     @key[onEndpointStateChange @func[
 *       @args[state]
 *     ]]
 *   ]]
 * ]
 */
function BackoffEndpoint(name, listener, parentLog) {
  /** @oneof[
   *    @case['healthy']
   *    @case['unreachable']
   *    @case['broken']
   *    @case['shutdown']{
   *      We are shutting down; ignore any/all errors and avoid performing
   *      activities that would result in new network traffic, etc.
   *    }
   *  ]
   */
  this.state = 'healthy';
  this._iNextBackoff = 0;
  this._LOG = LOGFAB.BackoffEndpoint(this, parentLog, name);
  this._LOG.state(this.state);

  this._badResources = {};

  this.listener = listener;
}
BackoffEndpoint.prototype = {
  _setState: function(newState) {
    if (this.state === newState)
      return;
    this.state = newState;
    this._LOG.state(newState);
    if (this.listener)
      this.listener.onEndpointStateChange(newState);
  },

  noteConnectSuccess: function() {
    this._setState('healthy');
    this._iNextBackoff = 0;
  },

  /**
   * Logs a connection failure and returns true if a retry attempt should be
   * made.
   *
   * @args[
   *   @param[reachable Boolean]{
   *     If true, we were able to connect to the endpoint, but failed to login
   *     for some reason.
   *   }
   * ]
   * @return[shouldRetry Boolean]{
   *   Returns true if we should retry creating the connection, false if we
   *   should give up.
   * }
   */
  noteConnectFailureMaybeRetry: function(reachable) {
    this._LOG.connectFailure(reachable);
    if (this.state === 'shutdown')
      return false;

    if (reachable) {
      this._setState('broken');
      return false;
    }

    if (this._iNextBackoff > 0)
      this._setState(reachable ? 'broken' : 'unreachable');

    // (Once this saturates, we never perform retries until the connection is
    // healthy again.  We do attempt re-connections when triggered by user
    // activity or synchronization logic; they just won't get retries.)
    if (this._iNextBackoff >= BACKOFF_DURATIONS.length)
      return false;

    return true;
  },

  /**
   * Logs a connection problem where we can talk to the server but we are
   * confident there is no reason retrying.  In some cases, like bad
   * credentials, this is part of what you want to do, but you will still also
   * want to put the kibosh on additional requests at a higher level since
   * servers can lock people out if they make repeated bad authentication
   * requests.
   */
  noteBrokenConnection: function() {
    this._LOG.connectFailure(true);
    this._setState('broken');

    this._iNextBackoff = BACKOFF_DURATIONS.length;
  },

  scheduleConnectAttempt: function(connectFunc) {
    if (this.state === 'shutdown')
      return;

    // If we have already saturated our retries then there won't be any
    // automatic retries and this request is assumed to want us to try and
    // create a connection right now.
    if (this._iNextBackoff >= BACKOFF_DURATIONS.length) {
      connectFunc();
      return;
    }

    var backoff = BACKOFF_DURATIONS[this._iNextBackoff++],
        delay = backoff.fixedMS +
                Math.floor(Math.random() * backoff.randomMS);
    setTimeoutFunc(connectFunc, delay);
  },

  noteBadResource: function(resourceId) {
    var now = $date.NOW();
    if (!this._badResources.hasOwnProperty(resourceId)) {
      this._badResources[resourceId] = { count: 1, last: now };
    }
    else {
      var info = this._badResources[resourceId];
      info.count++;
      info.last = now;
    }
  },

  resourceIsOkayToUse: function(resourceId) {
    if (!this._badResources.hasOwnProperty(resourceId))
      return true;
    var info = this._badResources[resourceId], now = $date.NOW();
  },

  shutdown: function() {
    this._setState('shutdown');
  },
};

exports.createEndpoint = function(name, listener, parentLog) {
  return new BackoffEndpoint(name, listener, parentLog);
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  BackoffEndpoint: {
    type: $log.TASK,
    subtype: $log.CLIENT,
    stateVars: {
      state: false,
    },
    events: {
      connectFailure: { reachable: true },
    },
    errors: {
    }
  },
});

}); // end define
;
define('mailapi/composite/incoming',[
  'rdcommon/log', '../a64', '../accountmixins', '../mailslice',
  '../searchfilter', '../util', 'require', 'exports'],
  function(log, $a64, $acctmixins, $mailslice,
  $searchfilter, $util, require, exports) {

var bsearchForInsert = $util.bsearchForInsert;

function cmpFolderPubPath(a, b) {
  return a.path.localeCompare(b.path);
}

/**
 * A base class for IMAP and POP accounts.
 *
 * A lot of the functionality related to handling folders,
 * orchestrating jobs, etc., is common to both IMAP and POP accounts.
 * This class factors out the common functionality, allowing the
 * ImapAccount and Pop3Account classes to only provide
 * protocol-specific code.
 *
 * @param {Class} FolderSyncer The class to instantiate for folder sync.
 *
 * The rest of the parameters match those passed to Pop3Account and
 * ImapAccount.
 */
function CompositeIncomingAccount(
      FolderSyncer,
      universe, compositeAccount, accountId, credentials,
      connInfo, folderInfos, dbConn, _parentLog, existingProtoConn) {

  this.universe = universe;
  this.compositeAccount = compositeAccount;
  this.id = accountId;
  this.accountDef = compositeAccount.accountDef;
  this.enabled = true;
  this._alive = true;
  this._credentials = credentials;
  this._connInfo = connInfo;
  this._db = dbConn;

  // Yes, the pluralization is suspect, but unambiguous.
  /** @dictof[@key[FolderId] @value[FolderStorage] */
  var folderStorages = this._folderStorages = {};
  /** @dictof[@key[FolderId] @value[FolderMeta] */
  var folderPubs = this.folders = [];

  // This is a class, not an instance, hence the camel case.
  this.FolderSyncer = FolderSyncer;

  /**
   * The list of dead folder id's that we need to nuke the storage for when
   * we next save our account status to the database.
   */
  this._deadFolderIds = null;

  /**
   * The canonical folderInfo object we persist to the database.
   */
  this._folderInfos = folderInfos;
  /**
   * @dict[
   *   @param[nextFolderNum Number]{
   *     The next numeric folder number to be allocated.
   *   }
   *   @param[nextMutationNum Number]{
   *     The next mutation id to be allocated.
   *   }
   *   @param[lastFolderSyncAt DateMS]{
   *     When was the last time we ran `syncFolderList`?
   *   }
   *   @param[capability @listof[String]]{
   *     The post-login capabilities from the server.
   *   }
   *   @param[rootDelim String]{
   *     The root hierarchy delimiter.  It is possible for servers to not
   *     support hierarchies, but we just declare that those servers are not
   *     acceptable for use.
   *   }
   *   @param[overflowMap @dictof[
   *     @key[uidl String]
   *     @value[@dict[
   *       @key[size Number]
   *     ]]
   *   ]]{
   *     The list of messages that will NOT be downloaded by a sync
   *     automatically, but instead need to be fetched with a "Download
   *     more messages..." operation. (POP3 only.)
   *   }
   *   @param[uidlMap @dictof[
   *     @key[uidl String]
   *     @value[headerID String]
   *   ]]{
   *     A mapping of UIDLs to message header IDs. (POP3 only.)
   *   }
   * ]{
   *   Meta-information about the account derived from probing the account.
   *   This information gets flushed on database upgrades.
   * }
   */
  this.meta = this._folderInfos.$meta;
  /**
   * @listof[SerializedMutation]{
   *   The list of recently issued mutations against us.  Mutations are added
   *   as soon as they are requested and remain until evicted based on a hard
   *   numeric limit.  The limit is driven by our unit tests rather than our
   *   UI which currently only allows a maximum of 1 (high-level) undo.  The
   *   status of whether the mutation has been run is tracked on the mutation
   *   but does not affect its presence or position in the list.
   *
   *   Right now, the `MailUniverse` is in charge of this and we just are a
   *   convenient place to stash the data.
   * }
   */
  this.mutations = this._folderInfos.$mutations;
  for (var folderId in folderInfos) {
    if (folderId[0] === '$')
      continue;
    var folderInfo = folderInfos[folderId];

    folderStorages[folderId] =
      new $mailslice.FolderStorage(this, folderId, folderInfo, this._db,
                                   FolderSyncer, this._LOG);
    folderPubs.push(folderInfo.$meta);
  }
  this.folders.sort(function(a, b) {
    return a.path.localeCompare(b.path);
  });

  // Ensure we have an inbox.  This is a folder that must exist with a standard
  // name, so we can create it without talking to the server.
  var inboxFolder = this.getFirstFolderWithType('inbox');
  if (!inboxFolder) {
    this._learnAboutFolder('INBOX', 'INBOX', null, 'inbox', '/', 0, true);
  }
}
exports.CompositeIncomingAccount = CompositeIncomingAccount;
CompositeIncomingAccount.prototype = {
  ////////////////////////////////////////////////////////////////
  // ACCOUNT OVERRIDES
  runOp: $acctmixins.runOp,
  getFirstFolderWithType: $acctmixins.getFirstFolderWithType,
  getFolderByPath: $acctmixins.getFolderByPath,
  saveAccountState: $acctmixins.saveAccountState,
  runAfterSaves: $acctmixins.runAfterSaves,

  /**
   * Make a given folder known to us, creating state tracking instances, etc.
   */
  _learnAboutFolder: function(name, path, parentId, type, delim, depth,
                              suppressNotification) {
    var folderId = this.id + '/' + $a64.encodeInt(this.meta.nextFolderNum++);
    var folderInfo = this._folderInfos[folderId] = {
      $meta: {
        id: folderId,
        name: name,
        type: type,
        path: path,
        parentId: parentId,
        delim: delim,
        depth: depth,
        lastSyncedAt: 0
      },
      $impl: {
        nextId: 0,
        nextHeaderBlock: 0,
        nextBodyBlock: 0,
      },
      accuracy: [],
      headerBlocks: [],
      bodyBlocks: [],
      serverIdHeaderBlockMapping: null, // IMAP/POP3 does not need the mapping
    };
    this._folderStorages[folderId] =
      new $mailslice.FolderStorage(this, folderId, folderInfo, this._db,
                                   this.FolderSyncer, this._LOG);

    var folderMeta = folderInfo.$meta;
    var idx = bsearchForInsert(this.folders, folderMeta, cmpFolderPubPath);
    this.folders.splice(idx, 0, folderMeta);

    if (!suppressNotification)
      this.universe.__notifyAddedFolder(this, folderMeta);
    return folderMeta;
  },

  _forgetFolder: function(folderId, suppressNotification) {
    var folderInfo = this._folderInfos[folderId],
        folderMeta = folderInfo.$meta;
    delete this._folderInfos[folderId];
    var folderStorage = this._folderStorages[folderId];
    delete this._folderStorages[folderId];
    var idx = this.folders.indexOf(folderMeta);
    this.folders.splice(idx, 1);
    if (this._deadFolderIds === null)
      this._deadFolderIds = [];
    this._deadFolderIds.push(folderId);
    folderStorage.youAreDeadCleanupAfterYourself();

    if (!suppressNotification)
      this.universe.__notifyRemovedFolder(this, folderMeta);
  },

  /**
   * Completely reset the state of a folder.  For use by unit tests and in the
   * case of UID validity rolls.  No notification is generated, although slices
   * are repopulated.
   *
   * FYI: There is a nearly identical method in ActiveSync's account
   * implementation.
   */
  _recreateFolder: function(folderId, callback) {
    this._LOG.recreateFolder(folderId);
    var folderInfo = this._folderInfos[folderId];
    folderInfo.$impl = {
      nextId: 0,
      nextHeaderBlock: 0,
      nextBodyBlock: 0,
    };
    folderInfo.accuracy = [];
    folderInfo.headerBlocks = [];
    folderInfo.bodyBlocks = [];

    if (this._deadFolderIds === null)
      this._deadFolderIds = [];
    this._deadFolderIds.push(folderId);

    var self = this;
    this.saveAccountState(null, function() {
      var newStorage =
        new $mailslice.FolderStorage(self, folderId, folderInfo, self._db,
                                     self.FolderSyncer,
                                     self._LOG);
      for (var iter in Iterator(self._folderStorages[folderId]._slices)) {
        var slice = iter[1];
        slice._storage = newStorage;
        slice.reset();
        newStorage.sliceOpenMostRecent(slice);
      }
      self._folderStorages[folderId]._slices = [];
      self._folderStorages[folderId] = newStorage;

      callback(newStorage);
    }, 'recreateFolder');
  },

  /**
   * We are being told that a synchronization pass completed, and that we may
   * want to consider persisting our state.
   */
  __checkpointSyncCompleted: function(callback) {
    this.saveAccountState(null, callback, 'checkpointSync');
  },

  /**
   * Delete an existing folder WITHOUT ANY ABILITY TO UNDO IT. Current
   * UX does not desire this, but the unit tests do.
   *
   * XXX: This is not quite right for POP3; address when we expose
   * deleting folders to the UI when we need to create jobs too.
   *
   * Callback is like the createFolder one, why not.
   */
  deleteFolder: function(folderId, callback) {
    if (!this._folderInfos.hasOwnProperty(folderId))
      throw new Error("No such folder: " + folderId);

    if (!this.universe.online) {
      if (callback)
        callback('offline');
      return;
    }

    var folderMeta = this._folderInfos[folderId].$meta;

    var rawConn = null, self = this;
    function gotConn(conn) {
      rawConn = conn;
      rawConn.delBox(folderMeta.path, deletionCallback);
    }
    function deletionCallback(err) {
      if (err)
        done('unknown');
      else
        done(null);
    }
    function done(errString) {
      if (rawConn) {
        self.__folderDoneWithConnection(rawConn, false, false);
        rawConn = null;
      }
      if (!errString) {
        self._LOG.deleteFolder(folderMeta.path);
        self._forgetFolder(folderId);
      }
      if (callback)
        callback(errString, folderMeta);
    }
    this.__folderDemandsConnection(null, 'deleteFolder', gotConn);
  },

  getFolderStorageForFolderId: function(folderId) {
    if (this._folderStorages.hasOwnProperty(folderId))
      return this._folderStorages[folderId];
    throw new Error('No folder with id: ' + folderId);
  },

  getFolderStorageForMessageSuid: function(messageSuid) {
    var folderId = messageSuid.substring(0, messageSuid.lastIndexOf('/'));
    if (this._folderStorages.hasOwnProperty(folderId))
      return this._folderStorages[folderId];
    throw new Error('No folder with id: ' + folderId);
  },

  getFolderMetaForFolderId: function(folderId) {
    if (this._folderInfos.hasOwnProperty(folderId))
      return this._folderInfos[folderId].$meta;
    return null;
  },

  /**
   * Create a view slice on the messages in a folder, starting from the most
   * recent messages and synchronizing further as needed.
   */
  sliceFolderMessages: function(folderId, bridgeHandle) {
    var storage = this._folderStorages[folderId],
        slice = new $mailslice.MailSlice(bridgeHandle, storage, this._LOG);

    storage.sliceOpenMostRecent(slice);
  },

  searchFolderMessages: function(folderId, bridgeHandle, phrase, whatToSearch) {
    var storage = this._folderStorages[folderId],
        slice = new $searchfilter.SearchSlice(bridgeHandle, storage, phrase,
                                              whatToSearch, this._LOG);
    // the slice is self-starting, we don't need to call anything on storage
  },

  shutdownFolders: function() {
    // - kill all folder storages (for their loggers)
    for (var iFolder = 0; iFolder < this.folders.length; iFolder++) {
      var folderPub = this.folders[iFolder],
          folderStorage = this._folderStorages[folderPub.id];
      folderStorage.shutdown();
    }
  },

  scheduleMessagePurge: function(folderId, callback) {
    this.universe.purgeExcessMessages(this.compositeAccount, folderId,
                                      callback);
  },

  /**
   * Create the essential Sent and Trash folders if they do not already exist.
   *
   * XXX Our folder type detection logic probably needs to get more multilingual
   * and us as well.  When we do this, we can steal the localized strings from
   * Thunderbird to bootstrap.
   */
  ensureEssentialFolders: function(callback) {
    var essentialFolders = {'trash': 'Trash', 'sent': 'Sent'};
    var pendingCallbacks = 1;

    function next() {
      if (!--pendingCallbacks) {
        callback && callback(null);
      }
    }

    for (var type in essentialFolders) {
      if (!this.getFirstFolderWithType(type)) {
        pendingCallbacks++;
        this.universe.createFolder(
          this.id, null, essentialFolders[type], false, next);
      }
    }

    next();
  },

  /**
   * We receive this notification from our _backoffEndpoint.
   */
  onEndpointStateChange: function(state) {
    switch (state) {
      case 'healthy':
        this.universe.__removeAccountProblem(this.compositeAccount,
                                             'connection');
        break;
      case 'unreachable':
      case 'broken':
        this.universe.__reportAccountProblem(this.compositeAccount,
                                             'connection');
        break;
    }
  },
};

exports.LOGFAB_DEFINITION = {
  CompositeIncomingAccount: {
    type: log.ACCOUNT,
    events: {
      createFolder: {},
      deleteFolder: {},
      recreateFolder: { id: false },

      createConnection: {},
      reuseConnection: {},
      releaseConnection: {},
      deadConnection: {},
      unknownDeadConnection: {},
      connectionMismatch: {},

      saveAccountState: { reason: false },
      /**
       * XXX: this is really an error/warning, but to make the logging less
       * confusing, treat it as an event.
       */
      accountDeleted: { where: false },

      /**
       * The maximum connection limit has been reached, we are intentionally
       * not creating an additional one.
       */
      maximumConnsNoNew: {},
    },
    TEST_ONLY_events: {
      deleteFolder: { path: false },

      createConnection: { label: false },
      reuseConnection: { label: false },
      releaseConnection: { label: false },
      deadConnection: { },
      connectionMismatch: {},
    },
    errors: {
      connectionError: {},
      folderAlreadyHasConn: { folderId: false },
      opError: { mode: false, type: false, ex: log.EXCEPTION },
    },
    asyncJobs: {
      runOp: { mode: true, type: true, error: false, op: false },
    },
    TEST_ONLY_asyncJobs: {
    },
  },
};

}); // end define
;
define('mailapi/imap/folder',
  [
    'rdcommon/log',
    '../a64',
    '../allback',
    '../date',
    '../syncbase',
    '../util',
    'module',
    'require',
    'exports'
  ],
  function(
    $log,
    $a64,
    $allback,
    $date,
    $sync,
    $util,
    $module,
    require,
    exports
  ) {

/**
 * Lazily evaluated modules
 */
var $imaptextparser = null;
var $imapsnippetparser = null;
var $imapbodyfetcher = null;
var $imapchew = null;
var $imapsync = null;

var allbackMaker = $allback.allbackMaker,
    bsearchForInsert = $util.bsearchForInsert,
    bsearchMaybeExists = $util.bsearchMaybeExists,
    cmpHeaderYoungToOld = $util.cmpHeaderYoungToOld,
    DAY_MILLIS = $date.DAY_MILLIS,
    NOW = $date.NOW,
    BEFORE = $date.BEFORE,
    ON_OR_BEFORE = $date.ON_OR_BEFORE,
    SINCE = $date.SINCE,
    TIME_DIR_AT_OR_BEYOND = $date.TIME_DIR_AT_OR_BEYOND,
    TIME_DIR_ADD = $date.TIME_DIR_ADD,
    TIME_DIR_DELTA = $date.TIME_DIR_DELTA,
    makeDaysAgo = $date.makeDaysAgo,
    makeDaysBefore = $date.makeDaysBefore,
    quantizeDate = $date.quantizeDate,
    PASTWARDS = 1, FUTUREWARDS = -1;

/**
 * Compact an array in-place with nulls so that the nulls are removed.  This
 * is done by a scan with an adjustment delta and a final splice to remove
 * the spares.
 */
function compactArray(arr) {
  // this could also be done with a write pointer.
  var delta = 0, len = arr.length;
  for (var i = 0; i < len; i++) {
    var obj = arr[i];
    if (obj === null) {
      delta++;
      continue;
    }
    if (delta)
      arr[i - delta] = obj;
  }
  if (delta)
    arr.splice(len - delta, delta);
  return arr;
}

/**
 * We don't care about deleted messages, it's best that we're not aware of them.
 * However, it's important to keep in mind that this means that EXISTS provides
 * us with an upper bound on the messages in the folder since we are blinding
 * ourselves to deleted messages.
 */
var BASELINE_SEARCH_OPTIONS = ['!DELETED'];

/**
 * Number of bytes to fetch from the server for snippets.
 */
var NUMBER_OF_SNIPPET_BYTES = 256;

/**
 * Maximum bytes to request from server in a fetch request (max uint32)
 */
var MAX_FETCH_BYTES = (Math.pow(2, 32) - 1);

/**
 * Folder connections do the actual synchronization logic.  They are associated
 * with one or more `ImapSlice` instances that issue the requests that trigger
 * synchronization.  Storage is handled by `FolderStorage` instances.  All of
 * the connection life-cycle nitty-gritty is handled by the `ImapAccount`.
 *
 * == Progress
 *
 * Our progress break-down is:
 * - [0.0, 0.1]: Getting the IMAP connection.
 * - (0.1, 0.25]: Getting usable SEARCH results.  Bisect back-off does not
 *     update progress.
 * - (0.25, 1.0]: Fetching revised flags, headers, and bodies.  Since this
 *     is primarily a question of network latency, we weight things based
 *     on round-trip requests required with reduced cost for number of packets
 *     required.
 *   - Revised flags: 20 + 1 * number of known headers
 *   - New headers: 20 + 5 * number of new headers
 *   - Bodies: 30 * number of new headers
 *
 * == IDLE
 *
 * We plan to IDLE in folders that we have active slices in.  We are assuming
 * the most basic IDLE implementation where it will tell us when the number
 * of messages increases (EXISTS), or decreases (EXPUNGE and EXISTS), with no
 * notifications when flags change.  (This is my current understanding of how
 * gmail operates from internet searches; we're not quite yet to protocol
 * experimentation yet.)
 *
 * The idea is accordingly that we will use IDLE notifications as a hint that
 * we should do a SEARCH for new messages.  It is that search that will update
 * our accuracy information and only that.
 */
function ImapFolderConn(account, storage, _parentLog) {
  this._account = account;
  this._storage = storage;
  this._LOG = LOGFAB.ImapFolderConn(this, _parentLog, storage.folderId);

  this._conn = null;
  this.box = null;

  this._deathback = null;
}
ImapFolderConn.prototype = {
  /**
   * Acquire a connection and invoke the callback once we have it and we have
   * entered the folder.  This method should only be called when running
   * inside `runMutexed`.
   *
   * @args[
   *   @param[callback @func[
   *     @args[
   *       @param[folderConn ImapFolderConn]
   *       @param[storage FolderStorage]
   *     ]
   *   ]]
   *   @param[deathback Function]{
   *     Invoked if the connection dies.
   *   }
   *   @param[label String]{
   *     A debugging label to name the purpose of the connection.
   *   }
   *   @param[dieOnConnectFailure #:optional Boolean]{
   *     See `ImapAccount.__folderDemandsConnection`.
   *   }
   * ]
   */
  acquireConn: function(callback, deathback, label, dieOnConnectFailure) {
    var self = this;
    this._deathback = deathback;
    this._account.__folderDemandsConnection(
      this._storage.folderId, label,
      function gotconn(conn) {
        self._conn = conn;
        // Now we have a connection, but it's not in the folder.
        // (If we were doing fancier sync like QRESYNC, we would not enter
        // in such a blase fashion.)
        self._conn.openBox(self._storage.folderMeta.path,
                           function openedBox(err, box) {
            if (err) {
              console.error('Problem entering folder',
                            self._storage.folderMeta.path);
              self._conn = null;
              // hand the connection back, noting a resource problem
              self._account.__folderDoneWithConnection(
                self._conn, false, true);
              if (self._deathback) {
                var deathback = self._deathback;
                self.clearErrorHandler();
                deathback();
              }
              return;
            }
            self.box = box;
            callback(self, self._storage);
          });
      },
      function deadconn() {
        self._conn = null;
        if (self._deathback) {
          var deathback = self._deathback;
          self.clearErrorHandler();
          deathback();
        }
      },
      dieOnConnectFailure);
  },

  relinquishConn: function() {
    if (!this._conn)
      return;

    this.clearErrorHandler();
    this._account.__folderDoneWithConnection(this._conn, true, false);
    this._conn = null;
  },

  /**
   * If no connection, acquires one and also sets up
   * deathback if connection is lost.
   *
   * See `acquireConn` for argument docs.
   */
  withConnection: function (callback, deathback, label, dieOnConnectFailure) {
    if (!this._conn) {
      this.acquireConn(function () {
        this.withConnection(callback, deathback, label);
      }.bind(this), deathback, label, dieOnConnectFailure);
      return;
    }

    this._deathback = deathback;
    callback(this);
  },

  /**
   * Resets error handling that may be triggered during
   * loss of connection.
   */
  clearErrorHandler: function () {
    this._deathback = null;
  },

  reselectBox: function(callback) {
    this._conn.openBox(this._storage.folderMeta.path, callback);
  },

  /**
   * Perform a SEARCH for the purposes of folder synchronization.  In the event
   * we are unable to reach the server (we are offline, the server is down,
   * nework troubles), the `abortedCallback` will be invoked.  Note that it can
   * take many seconds for us to conclusively fail to reach the server.
   */
  _timelySyncSearch: function(searchOptions, searchedCallback,
                              abortedCallback, progressCallback) {
    // If we don't have a connection, get one, then re-call.
    if (!this._conn) {
      // XXX the abortedCallback should really only be used for the duration
      // of this request, but it will end up being used for the entire duration
      // our folder holds on to the connection.  This is not a great idea as
      // long as we are leaving the IMAP connection idling in the folder (which
      // causes us to not release the connection back to the account).  We
      // should tie this to the mutex or something else transactional.
      this.acquireConn(
        this._timelySyncSearch.bind(this, searchOptions, searchedCallback,
                                    abortedCallback, progressCallback),
        abortedCallback, 'sync', true);
      return;
    }
    // We do have a connection, hook-up our abortedCallback
    else {
      this._deathback = abortedCallback;
    }

    // Having a connection is 10% of the battle
    if (progressCallback)
      progressCallback(0.1);

    // Gmail IMAP servers cache search results until your connection
    // gets notified of new messages via an unsolicited server
    // response. Sending a command like NOOP is required to flush the
    // cache and force SEARCH to return new messages that have just
    // been received. Other IMAP servers don't need this as far as we know.
    // See <https://bugzilla.mozilla.org/show_bug.cgi?id=933079>.
    if (this._account.isGmail) {
      this._conn.noop();
    }

    this._conn.search(searchOptions, function(err, uids) {
        if (err) {
          console.error('Search error on', searchOptions, 'err:', err);
          abortedCallback();
          return;
        }
        searchedCallback(uids);
      });
  },

  syncDateRange: function() {
    var args = Array.slice(arguments);
    var self = this;

    require(['./protocol/sync'], function(_sync) {
      $imapsync = _sync;
      (self.syncDateRange = self._lazySyncDateRange).apply(self, args);
    });
  },

  /**
   * Perform a search to find all the messages in the given date range.
   * Meanwhile, load the set of messages from storage.  Infer deletion of the
   * messages we already know about that should exist in the search results but
   * do not.  Retrieve information on the messages we don't know anything about
   * and update the metadata on the messages we do know about.
   *
   * An alternate way to accomplish the new/modified/deleted detection for a
   * range might be to do a search over the UID range of new-to-us UIDs and
   * then perform retrieval on what we get back.  We would do a flag fetch for
   * all the UIDs we already know about and use that to both get updated
   * flags and infer deletions from UIDs that don't report back.  Except that
   * might not work because the standard doesn't seem to say that if we
   * specify gibberish UIDs that it should keep going for the UIDs that are
   * not gibberish.  Also, it's not clear what the performance impact of the
   * additional search constraint might be on server performance.  (Of course,
   * if the server does not have an index on internaldate, these queries are
   * going to be very expensive and the UID limitation would probably be a
   * mercy to the server.)
   *
   * @args[
   *   @param[startTS @oneof[null DateMS]]{
   *     If non-null, inclusive "SINCE" constraint to use, otherwise the
   *     constraint is omitted.
   *   }
   *   @param[endTS @oneof[null DateMS]]{
   *     If non-null, exclusive "BEFORE" constraint to use, otherwise the
   *     constraint is omitted.
   *   }
   * ]
   */
  _lazySyncDateRange: function(startTS, endTS, accuracyStamp,
                          doneCallback, progressCallback) {
    if (startTS && endTS && SINCE(startTS, endTS)) {
      this._LOG.illegalSync(startTS, endTS);
      doneCallback('invariant');
      return;
    }

console.log("syncDateRange:", startTS, endTS);
    var searchOptions = BASELINE_SEARCH_OPTIONS.concat(), self = this,
      storage = self._storage;
    var useBisectLimit = $sync.BISECT_DATE_AT_N_MESSAGES;
    if (startTS)
      searchOptions.push(['SINCE', startTS]);
    if (endTS)
      searchOptions.push(['BEFORE', endTS]);

    var callbacks = allbackMaker(
      ['search', 'db'],
      function syncDateRangeLogic(results) {
        var serverUIDs = results.search, headers = results.db,
            knownUIDs = [], uid, numDeleted = 0,
            modseq = self._conn._state.box.highestModSeq || '';

console.log('SERVER UIDS', serverUIDs.length, useBisectLimit);
        if (serverUIDs.length > useBisectLimit) {
          var effEndTS = endTS ||
                         quantizeDate(NOW() + DAY_MILLIS + self._account.tzOffset),
              curDaysDelta = Math.round((effEndTS - startTS) / DAY_MILLIS);
          // We are searching more than one day, we can shrink our search.

console.log('BISECT CASE', serverUIDs.length, 'curDaysDelta', curDaysDelta);
          if (curDaysDelta > 1) {
            // mark the bisection abort...
            self._LOG.syncDateRange_end(null, null, null, startTS, endTS,
                                        null, null);
            var bisectInfo = {
              oldStartTS: startTS,
              oldEndTS: endTS,
              numHeaders: serverUIDs.length,
              curDaysDelta: curDaysDelta,
              newStartTS: startTS,
              newEndTS: endTS,
            };
            // If we were being used for a refresh, they may want us to stop
            // and change their sync strategy.
            if (doneCallback('bisect', bisectInfo, null) === 'abort') {
              self.clearErrorHandler();
              doneCallback('bisect-aborted', null);
              return null;
            }
            return self.syncDateRange(
              bisectInfo.newStartTS, bisectInfo.newEndTS, accuracyStamp,
              doneCallback, progressCallback);
          }
        }

        if (progressCallback)
          progressCallback(0.25);

        // -- infer deletion, flag to distinguish known messages
        // rather than splicing lists and causing shifts, we null out values.
        for (var iMsg = 0; iMsg < headers.length; iMsg++) {
          var header = headers[iMsg];
          var idxUid = serverUIDs.indexOf(header.srvid);
          // deleted!
          if (idxUid === -1) {
            storage.deleteMessageHeaderAndBodyUsingHeader(header);
            numDeleted++;
            headers[iMsg] = null;
            continue;
          }
          // null out the UID so the non-null values in the search are the
          // new messages to us.
          serverUIDs[idxUid] = null;
          // but save the UID so we can do a flag-check.
          knownUIDs.push(header.srvid);
        }

        var newUIDs = compactArray(serverUIDs); // (re-labeling, same array)
        if (numDeleted)
          compactArray(headers);

        var uidSync = new $imapsync.Sync({
          connection: self._conn,
          storage: self._storage,
          newUIDs: newUIDs,
          knownUIDs: knownUIDs,
          knownHeaders: headers
        });

        uidSync.onprogress = progressCallback;

        uidSync.oncomplete = function(newCount, knownCount) {
            self._LOG.syncDateRange_end(newCount, knownCount, numDeleted,
                                        startTS, endTS, null, null);

            self._storage.markSyncRange(startTS, endTS, modseq,
                                        accuracyStamp);
            if (completed)
              return;

            completed = true;
            self.clearErrorHandler();
            doneCallback(null, null, newCount + knownCount,
                         skewedStartTS, skewedEndTS);
        };

        return;
      });

    // - Adjust DB time range for server skew on INTERNALDATE
    // See https://github.com/mozilla-b2g/gaia-email-libs-and-more/issues/12
    // for more in-depth details.  The nutshell is that the server will secretly
    // apply a timezone to the question we ask it and will not actually tell us
    // dates lined up with UTC.  Accordingly, we don't want our DB query to
    // be lined up with UTC but instead the time zone.
    //
    // So if our timezone offset is UTC-4, that means that we will actually be
    // getting results in that timezone, whose midnight is actually 4am UTC.
    // In other words, we care about the time in UTC-0, so we subtract the
    // offset.
    var skewedStartTS = startTS - this._account.tzOffset,
        skewedEndTS = endTS ? endTS - this._account.tzOffset : null,
        completed = false;
    console.log('Skewed DB lookup. Start: ',
                skewedStartTS, new Date(skewedStartTS).toUTCString(),
                'End: ', skewedEndTS,
                skewedEndTS ? new Date(skewedEndTS).toUTCString() : null);
    this._LOG.syncDateRange_begin(null, null, null, startTS, endTS,
                                  skewedStartTS, skewedEndTS);
    this._timelySyncSearch(
      searchOptions, callbacks.search,
      function abortedSearch() {
        if (completed)
          return;
        completed = true;
        this._LOG.syncDateRange_end(0, 0, 0, startTS, endTS, null, null);
        doneCallback('aborted');
      }.bind(this),
      progressCallback);
    this._storage.getAllMessagesInImapDateRange(skewedStartTS, skewedEndTS,
                                                callbacks.db);
  },

  searchDateRange: function(endTS, startTS, searchParams,
                            slice) {
    var searchOptions = BASELINE_SEARCH_OPTIONS.concat(searchParams);
    if (startTS)
      searchOptions.push(['SINCE', startTS]);
    if (endTS)
      searchOptions.push(['BEFORE', endTS]);
  },

  /**
   * Downloads all the body representations for a given message.
   *
   *
   *    folder.downloadBodyReps(
   *      header,
   *      {
   *        // maximum number of bytes to fetch total (across all bodyReps)
   *        maximumBytesToFetch: N
   *      }
   *      callback
   *    );
   *
   */
  downloadBodyReps: function() {
    var args = Array.slice(arguments);
    var self = this;

    require(
      [
        './imapchew',
        './protocol/bodyfetcher',
        './protocol/textparser',
        './protocol/snippetparser'
      ],
      function(
        _imapchew,
        _bodyfetcher,
        _textparser,
        _snippetparser
      ) {

        $imapchew =_imapchew;
        $imapbodyfetcher = _bodyfetcher;
        $imaptextparser = _textparser;
        $imapsnippetparser = _snippetparser;

        (self.downloadBodyReps = self._lazyDownloadBodyReps).apply(self, args);
    });
  },

  /**
   * Initiates a request to download all body reps. If a snippet has not yet
   * been generated this will also generate the snippet...
   */
  _lazyDownloadBodyReps: function(header, options, callback) {
    if (typeof(options) === 'function') {
      callback = options;
      options = null;
    }

    options = options || {};

    var self = this;

    var gotBody = function gotBody(bodyInfo) {
      // target for snippet generation
      var bodyRepIdx = $imapchew.selectSnippetBodyRep(header, bodyInfo);

      // assume user always wants entire email unless option is given...
      var overallMaximumBytes = options.maximumBytesToFetch;

      var bodyParser = $imaptextparser.TextParser;

      // build the list of requests based on downloading required.
      var requests = [];
      bodyInfo.bodyReps.forEach(function(rep, idx) {
        // attempt to be idempotent by only requesting the bytes we need if we
        // actually need them...
        if (rep.isDownloaded)
          return;

        var request = {
          uid: header.srvid,
          partInfo: rep._partInfo,
          bodyRepIndex: idx,
          createSnippet: idx === bodyRepIdx
        };

        // default to the entire remaining email. We use the estimate * largish
        // multiplier so even if the size estimate is wrong we should fetch more
        // then the requested number of bytes which if truncated indicates the
        // end of the bodies content.
        var bytesToFetch = Math.min(rep.sizeEstimate * 5, MAX_FETCH_BYTES);

        if (overallMaximumBytes !== undefined) {
          // when we fetch partial results we need to use the snippet parser.
          bodyParser = $imapsnippetparser.SnippetParser;

          // issued enough downloads
          if (overallMaximumBytes <= 0) {
            return;
          }

          // if our estimate is greater then expected number of bytes
          // request the maximum allowed.
          if (rep.sizeEstimate > overallMaximumBytes) {
            bytesToFetch = overallMaximumBytes;
          }

          // subtract the estimated byte size
          overallMaximumBytes -= rep.sizeEstimate;
        }

        // For a byte-serve request, we need to request at least 1 byte, so
        // request some bytes.  This is a logic simplification that should not
        // need to be used because imapchew.js should declare 0-byte files
        // fully downloaded when their parts are created, but better a wasteful
        // network request than breaking here.
        if (bytesToFetch <= 0)
          bytesToFetch = 64;

        // we may only need a subset of the total number of bytes.
        if (overallMaximumBytes !== undefined || rep.amountDownloaded) {
          // request the remainder
          request.bytes = [
            rep.amountDownloaded,
            bytesToFetch
          ];
        }

        requests.push(request);
      });

      // we may not have any requests bail early if so.
      if (!requests.length) {
        callback(null, bodyInfo); // no requests === success
        return;
      }

      var fetch = new $imapbodyfetcher.BodyFetcher(
        self._conn,
        bodyParser,
        requests
      );

      self._handleBodyFetcher(fetch, header, bodyInfo, function(err) {
        callback(err, bodyInfo);
      });
    };

    this._storage.getMessageBody(header.suid, header.date, gotBody);
  },

  /**
   * Download a snippet and a portion of the bodyRep to go along with it... In
   * all cases we expect the bodyReps to be completely empty as we also will
   * generate the snippet in the case of completely downloading a snippet.
   */
  _downloadSnippet: function(header, callback) {
    var self = this;
    this._storage.getMessageBody(header.suid, header.date, function(body) {
      // attempt to find a rep
      var bodyRepIndex = $imapchew.selectSnippetBodyRep(header, body);

      // no suitable snippet we are done.
      if (bodyRepIndex === -1)
        return callback();

      var rep = body.bodyReps[bodyRepIndex];
      var requests = [{
        uid: header.srvid,
        bodyRepIndex: bodyRepIndex,
        partInfo: rep._partInfo,
        bytes: [0, NUMBER_OF_SNIPPET_BYTES],
        createSnippet: true
      }];

      var fetch = new $imapbodyfetcher.BodyFetcher(
        self._conn,
        $imapsnippetparser.SnippetParser,
        requests
      );

      self._handleBodyFetcher(
        fetch,
        header,
        body,
        callback
      );
    });
  },

  /**
   * Wrapper around common bodyRep updates...
   */
  _handleBodyFetcher: function(fetcher, header, body, callback) {
    var event = {
      changeDetails: {
        bodyReps: []
      }
    };

    var self = this;

    fetcher.onparsed = function(req, resp) {
      $imapchew.updateMessageWithFetch(header, body, req, resp, self._LOG);

      header.bytesToDownloadForBodyDisplay =
        $imapchew.calculateBytesToDownloadForImapBodyDisplay(body);

      // Always update the header so that we can save
      // bytesToDownloadForBodyDisplay, which will tell the UI whether
      // or not we can show the message body right away.
      self._storage.updateMessageHeader(
        header.date,
        header.id,
        false,
        header
      );

      event.changeDetails.bodyReps.push(req.bodyRepIndex);
    };

    fetcher.onerror = function(e) {
      callback(e);
    };

    fetcher.onend = function() {
      self._storage.updateMessageBody(
        header,
        body,
        {},
        event
      );

      self._storage.runAfterDeferredCalls(callback);
    };
  },

  /**
   * The actual work of downloadBodies, lazily replaces downloadBodies once
   * module deps are loaded.
   */
  _lazyDownloadBodies: function(headers, options, callback) {
    var pending = 1, downloadsNeeded = 0;

    var self = this;
    var anyErr;
    function next(err) {
      if (err && !anyErr)
        anyErr = err;

      if (!--pending) {
        self._storage.runAfterDeferredCalls(function() {
          callback(anyErr, /* number downloaded */ downloadsNeeded - pending);
        });
      }
    }

    for (var i = 0; i < headers.length; i++) {
      // We obviously can't do anything with null header references.
      // To avoid redundant work, we also don't want to do any fetching if we
      // already have a snippet.  This could happen because of the extreme
      // potential for a caller to spam multiple requests at us before we
      // service any of them.  (Callers should only have one or two outstanding
      // jobs of this and do their own suppression tracking, but bugs happen.)
      if (!headers[i] || headers[i].snippet !== null) {
        continue;
      }

      pending++;
      // This isn't absolutely guaranteed to be 100% correct, but is good enough
      // for indicating to the caller that we did some work.
      downloadsNeeded++;
      this.downloadBodyReps(headers[i], options, next);
    }

    // by having one pending item always this handles the case of not having any
    // snippets needing a download and also returning in the next tick of the
    // event loop.
    window.setZeroTimeout(next);
  },

  /**
   * Download snippets or entire bodies for a set of headers.
   */
  downloadBodies: function() {
    var args = Array.slice(arguments);
    var self = this;

    require(
      ['./imapchew', './protocol/bodyfetcher', './protocol/snippetparser'],
      function(
        _imapchew,
        _bodyfetcher,
        _snippetparser
      ) {

        $imapchew =_imapchew;
        $imapbodyfetcher = _bodyfetcher;
        $imapsnippetparser = _snippetparser;

        (self.downloadBodies = self._lazyDownloadBodies).apply(self, args);
    });
  },

  downloadMessageAttachments: function(uid, partInfos, callback, progress) {
    require(['mailparser/mailparser'], function($mailparser) {
      var conn = this._conn;
      var self = this;
      var mparser = new $mailparser.MailParser();

      // I actually implemented a usable shim for the checksum purposes, but we
      // don't actually care about the checksum, so why bother doing the work?
      var dummyChecksummer = {
        update: function() {},
        digest: function() { return null; },
      };

      function setupBodyParser(partInfo) {
        mparser._state = 0x2; // body
        mparser._remainder = '';
        mparser._currentNode = null;
        mparser._currentNode = mparser._createMimeNode(null);
        mparser._currentNode.attachment = true;
        mparser._currentNode.checksum = dummyChecksummer;
        mparser._currentNode.content = undefined;
        // nb: mparser._multipartTree is an empty list (always)
        mparser._currentNode.meta.contentType = partInfo.type;
        mparser._currentNode.meta.transferEncoding = partInfo.encoding;
        mparser._currentNode.meta.charset = null; //partInfo.charset;
        mparser._currentNode.meta.textFormat = null; //partInfo.textFormat;
      }
      function bodyParseBuffer(buffer) {
        process.immediate = true;
        mparser.write(buffer);
        process.immediate = false;
      }
      function finishBodyParsing() {
        process.immediate = true;
        mparser._process(true);
        process.immediate = false;
        // this is a Buffer!
        return mparser._currentNode.content;
      }

      var anyError = null, pendingFetches = 0, bodies = [];
      partInfos.forEach(function(partInfo) {
        var opts = {
          request: {
            struct: false,
            headers: false,
            body: partInfo.part
          }
        };
        pendingFetches++;
        var fetcher = conn.fetch(uid, opts);

        setupBodyParser(partInfo);
        fetcher.on('error', function(err) {
          if (!anyError)
            anyError = err;
          if (--pendingFetches === 0) {
            try {
              callback(anyError, bodies);
            }
            catch (ex) {
              self._LOG.callbackErr(ex);
            }
          }
        });
        fetcher.on('message', function(msg) {
          setupBodyParser(partInfo);
          msg.on('data', bodyParseBuffer);
          msg.on('end', function() {
            bodies.push(new Blob([finishBodyParsing()], { type: partInfo.type }));

            if (--pendingFetches === 0) {
              try {
                callback(anyError, bodies);
              }
              catch (ex) {
                self._LOG.callbackErr(ex);
              }
            }
          });
        });
      });
    }.bind(this));
  },

  shutdown: function() {
    this._LOG.__die();
  },
};

function ImapFolderSyncer(account, folderStorage, _parentLog) {
  this._account = account;
  this.folderStorage = folderStorage;

  this._LOG = LOGFAB.ImapFolderSyncer(this, _parentLog, folderStorage.folderId);


  this._syncSlice = null;
  /**
   * The timestamp to use for `markSyncRange` for all syncs in this higher
   * level sync.  Accuracy time-info does not need high precision, so this
   * results in fewer accuracy structures and simplifies our decision logic
   * in `sliceOpenMostRecent`.
   */
  this._curSyncAccuracyStamp = null;
  /**
   * @oneof[
   *   @case[1]{
   *     Growing older/into the past.
   *   }
   *   @case[-1]{
   *     Growing into the present/future.
   *   }
   * ]{
   *   Sync growth direction.  Numeric values chosen to be consistent with
   *   slice semantics (which are oriented like they are because the slices
   *   display messages from newest to oldest).
   * }
   */
  this._curSyncDir = 1;
  /**
   * Synchronization is either 'grow' or 'refresh'.  Growth is when we just
   * want to learn about some new messages.  Refresh is when we know we have
   * already synchronized a time region and want to fully update it and so will
   * keep going until we hit our `syncThroughTS` threshold.
   */
  this._curSyncIsGrow = null;
  /**
   * The timestamp that will anchor the next synchronization.
   */
  this._nextSyncAnchorTS = null;
  /**
   * In the event of a bisection, this is the timestamp to fall back to rather
   * than continuing from our
   */
  this._fallbackOriginTS = null;
  /**
   * The farthest timestamp that we should synchronize through.  The value
   * null is potentially meaningful if we are synchronizing FUTUREWARDS.
   */
  this._syncThroughTS = null;
  /**
   * The number of days we are looking into the past in the current sync step.
   */
  this._curSyncDayStep = null;
  /**
   * If non-null, then we must synchronize all the way through the provided date
   * before we begin increasing _curSyncDayStep.  This helps us avoid
   * oscillation where we make the window too large, shrink it, but then find
   * find nothing.  Since we know that there are going to be a lot of messages
   * before we hit this date, it makes sense to keep taking smaller sync steps.
   */
  this._curSyncDoNotGrowBoundary = null;
  /**
   * The callback to invoke when we complete the sync, regardless of success.
   */
  this._curSyncDoneCallback = null;

  this.folderConn = new ImapFolderConn(account, folderStorage, this._LOG);
}
exports.ImapFolderSyncer = ImapFolderSyncer;
ImapFolderSyncer.prototype = {
  /**
   * Although we do have some errbackoff stuff we do, we can always try to
   * synchronize.  The errbackoff is just a question of when we will retry.
   */
  syncable: true,

  /**
   * Can we grow this sync range?  IMAP always lets us do this.
   */
  get canGrowSync() {
    // localdrafts is offline-only, so we can't ask the server for messages.
    return this.folderStorage.folderMeta.type !== 'localdrafts';
  },

  /**
   * Perform an initial synchronization of a folder from now into the past,
   * starting with the specified step size.
   */
  initialSync: function(slice, initialDays, syncCallback,
                        doneCallback, progressCallback) {
    syncCallback('sync', false /* Ignore Headers */);
    // We want to enter the folder and get the box info so we can know if we
    // should trigger our SYNC_WHOLE_FOLDER_AT_N_MESSAGES logic.
    // _timelySyncSearch is what will get called next either way, and it will
    // just reuse the connection and will correctly update the deathback so
    // that our deathback is no longer active.
    this.folderConn.withConnection(
      function(folderConn, storage) {
        // Flag to sync the whole range if we
        var syncWholeTimeRange = false;
        if (folderConn && folderConn.box &&
            folderConn.box.messages.total <
              $sync.SYNC_WHOLE_FOLDER_AT_N_MESSAGES) {
          syncWholeTimeRange = true;
        }

        this._startSync(
          slice, PASTWARDS, // sync into the past
          'grow',
          null, // start syncing from the (unconstrained) future
          $sync.OLDEST_SYNC_DATE, // sync no further back than this constant
          null,
          syncWholeTimeRange ? null : initialDays,
          doneCallback, progressCallback);
      }.bind(this),
      function died() {
        doneCallback('aborted');
      },
      'initialSync', true);
  },

  /**
   * Perform a refresh synchronization covering the requested time range.  This
   * may be converted into multiple smaller synchronizations, but the completion
   * notification will only be generated once the entire time span has been
   * synchronized.
   */
  refreshSync: function(slice, dir, startTS, endTS, origStartTS,
                        doneCallback, progressCallback) {
    // timezone compensation happens in the caller
    this._startSync(
      slice, dir,
      'refresh', // this is a refresh, not a grow!
      dir === PASTWARDS ? endTS : startTS,
      dir === PASTWARDS ? startTS : endTS,
      origStartTS,
      /* syncStepDays */ null, doneCallback, progressCallback);
  },

  /**
   * Synchronize into a time period not currently covered.  Growth has an
   * explicit direction and explicit origin timestamp.
   *
   * @args[
   *   @param[slice]
   *   @param[growthDirection[
   *   @param[anchorTS]
   *   @param[syncStepDays]
   *   @param[doneCallback]
   *   @param[progressCallback]
   * ]
   * @return[Boolean]{
   *   Returns false if no sync is necessary.
   * }
   */
  growSync: function(slice, growthDirection, anchorTS, syncStepDays,
                     doneCallback, progressCallback) {
    var syncThroughTS;
    if (growthDirection === PASTWARDS) {
      syncThroughTS = $sync.OLDEST_SYNC_DATE;
    }
    else { // FUTUREWARDS
      syncThroughTS = null;
    }

    this._startSync(slice, growthDirection, 'grow',
                    anchorTS, syncThroughTS, null, syncStepDays,
                    doneCallback, progressCallback);
  },

  _startSync: function ifs__startSync(slice, dir, syncTypeStr,
                                      originTS, syncThroughTS, fallbackOriginTS,
                                      syncStepDays,
                                      doneCallback, progressCallback) {
    var startTS, endTS;
    this._syncSlice = slice;
    this._curSyncAccuracyStamp = NOW();
    this._curSyncDir = dir;
    this._curSyncIsGrow = (syncTypeStr === 'grow');
    this._fallbackOriginTS = fallbackOriginTS;
    if (dir === PASTWARDS) {
      endTS = originTS;
      if (syncStepDays) {
        if (endTS)
          this._nextSyncAnchorTS = startTS = endTS - syncStepDays * DAY_MILLIS;
        else
          this._nextSyncAnchorTS = startTS = makeDaysAgo(syncStepDays,
                                                         this._account.tzOffset);
      }
      else {
        startTS = syncThroughTS;
        this._nextSyncAnchorTS = null;
      }
    }
    else { // FUTUREWARDS
      startTS = originTS;
      if (syncStepDays) {
        this._nextSyncAnchorTS = endTS = startTS + syncStepDays * DAY_MILLIS;
      }
      else {
        endTS = syncThroughTS;
        this._nextSyncAnchorTS = null;
      }
    }
    this._syncThroughTS = syncThroughTS;
    this._curSyncDayStep = syncStepDays;
    this._curSyncDoNotGrowBoundary = null;
    this._curSyncDoneCallback = doneCallback;

    this.folderConn.syncDateRange(startTS, endTS, this._curSyncAccuracyStamp,
                                  this.onSyncCompleted.bind(this),
                                  progressCallback);
  },

  _doneSync: function ifs__doneSync(err) {
    // The desired number of headers is always a rough request value which is
    // intended to be a new thing for each request.  So we don't want extra
    // desire building up, so we set it to what we have every time.
    //
    this._syncSlice.desiredHeaders = this._syncSlice.headers.length;

    if (this._curSyncDoneCallback)
      this._curSyncDoneCallback(err);

    // Save our state even if there was an error because we may have accumulated
    // some partial state.
    this._account.__checkpointSyncCompleted();

    this._syncSlice = null;
    this._curSyncAccuracyStamp = null;
    this._curSyncDir = null;
    this._nextSyncAnchorTS = null;
    this._syncThroughTS = null;
    this._curSyncDayStep = null;
    this._curSyncDoNotGrowBoundary = null;
    this._curSyncDoneCallback = null;
  },

  /**
   * Whatever synchronization we last triggered has now completed; we should
   * either trigger another sync if we still want more data, or close out the
   * current sync.
   *
   * ## Block Flushing
   *
   * We only cause a call to `ImapAccount.__checkpointSyncCompleted` (via a call
   * to `_doneSync`) to happen and cause dirty blocks to be written to disk when
   * we are done with synchronization.  This is because this method declares
   * victory once a non-trivial amount of work has been done.  In the event that
   * the sync is encountering a lot of deleted messages and so keeps loading
   * blocks, the memory burden is limited because we will be emptying those
   * blocks out so actual memory usage (after GC) is commensurate with the
   * number of (still-)existing messages.  And those are what this method uses
   * to determine when it is done.
   *
   * In the cases where we are synchronizing a ton of messages on a single day,
   * we could perform checkpoints during the process, but realistically any
   * device we are operating on should probably have enough memory to deal with
   * these surges, so we're not doing that yet.
   *
   * @args[
   *   @param[err]
   *   @param[bisectInfo]
   *   @param[messagesSeen Number]
   *   @param[effStartTS DateMS]{
   *     Effective start date in UTC after compensating for server tz offset.
   *   }
   *   @param[effEndTS @oneof[DateMS null]]{
   *     Effective end date in UTC after compensating for server tz offset.
   *     If the end date was open-ended, then null is passed instead.
   *   }
   * ]
   */
  onSyncCompleted: function ifs_onSyncCompleted(err, bisectInfo, messagesSeen,
                                                effStartTS, effEndTS) {
    // In the event the time range had to be bisected, update our info so if
    // we need to take another step we do the right thing.
    if (err === 'bisect') {
      var curDaysDelta = bisectInfo.curDaysDelta,
          numHeaders = bisectInfo.numHeaders;

      // If we had a fallback TS because we were synced to the dawn of time,
      // use that and start by just cutting the range in thirds rather than
      // doing a weighted bisection since the distribution might include
      // a number of messages earlier than our fallback startTS.
      if (this._curSyncDir === FUTUREWARDS && this._fallbackOriginTS) {
        this.folderStorage.clearSyncedToDawnOfTime(this._fallbackOriginTS);
        bisectInfo.oldStartTS = this._fallbackOriginTS;
        this._fallbackOriginTS = null;
        var effOldEndTS = bisectInfo.oldEndTS ||
                          quantizeDate(NOW() + DAY_MILLIS +
                                       this._account.tzOffset);
        curDaysDelta = Math.round((effOldEndTS - bisectInfo.oldStartTS) /
                                  DAY_MILLIS);
        numHeaders = $sync.BISECT_DATE_AT_N_MESSAGES * 1.5;
      }
      // Sanity check the time delta; if we grew the bounds to the dawn
      // of time, then our interpolation is useless and it's better for
      // us to crank things way down, even if it's erroneously so.
      else if (curDaysDelta > 1000)
        curDaysDelta = 30;

      // - Interpolate better time bounds.
      // Assume a linear distribution of messages, but overestimated by
      // a factor of two so we undershoot.  Also make sure that we subtract off
      // at least 2 days at a time.  This is to ensure that in the case where
      // endTS is null and we end up using makeDaysAgo that we actually shrink
      // by at least 1 day (because of how rounding works for makeDaysAgo).
      var shrinkScale = $sync.BISECT_DATE_AT_N_MESSAGES /
                          (numHeaders * 2),
          dayStep = Math.max(1,
                             Math.min(curDaysDelta - 2,
                                      Math.ceil(shrinkScale * curDaysDelta)));
      this._curSyncDayStep = dayStep;

      if (this._curSyncDir === PASTWARDS) {
        bisectInfo.newEndTS = bisectInfo.oldEndTS;
        this._nextSyncAnchorTS = bisectInfo.newStartTS =
          makeDaysBefore(bisectInfo.newEndTS, dayStep, this._account.tzOffset);
        this._curSyncDoNotGrowBoundary = bisectInfo.oldStartTS;
      }
      else { // FUTUREWARDS
        bisectInfo.newStartTS = bisectInfo.oldStartTS;
        this._nextSyncAnchorTS = bisectInfo.newEndTS =
          makeDaysBefore(bisectInfo.newStartTS, -dayStep, this._account.tzOffset);
        this._curSyncDoNotGrowBoundary = bisectInfo.oldEndTS;
      }

      // We return now without calling _doneSync because we are not done; the
      // caller (syncDateRange) will re-trigger itself and keep going.
      return;
    }
    else if (err) {
      this._doneSync(err);
      return;
    }

    console.log("Sync Completed!", this._curSyncDayStep, "days",
                messagesSeen, "messages synced");

    // - Slice is dead = we are done
    if (this._syncSlice.isDead) {
      this._doneSync();
      return;
    }

    // If it now appears we know about all the messages in the folder, then we
    // are done syncing and can mark the entire folder as synchronized.  This
    // requires that:
    // - The direction is pastwards. (We check the oldest header, so this
    //   is important.  We don't really need to do a future-wards variant since
    //   we always use pastwards for refreshes and the future-wards variant
    //   really does not need a fast-path since the cost of stepping to 'today'
    //   is much cheaper thana the cost of walking all the way to 1990.)
    // - The number of messages we know about is the same as the number the
    //   server most recently told us are in the folder.
    // - (There are no messages in the folder at all OR)
    // - We have synchronized past the oldest known message header.  (This,
    //   in combination with the fact that we always open from the most recent
    //   set of messages we know about, that we fully synchronize all time
    //   intervals (for now!), and our pastwards-direction for refreshes means
    //   that we can conclude we have synchronized across all messages and
    //   this is a sane conclusion to draw.)
    //
    // NB: If there are any deleted messages, this logic will not save us
    // because we ignored those messages.  This is made less horrible by issuing
    // a time-date that expands as we go further back in time.
    //
    // (I have considered asking to see deleted messages too and ignoring them;
    // that might be suitable.  We could also just be a jerk and force an
    // expunge.)
    var folderMessageCount = this.folderConn && this.folderConn.box &&
                             this.folderConn.box.messages.total,
        dbCount = this.folderStorage.getKnownMessageCount(),
        syncedThrough =
          ((this._curSyncDir === PASTWARDS) ? effStartTS : effEndTS);
console.log("folder message count", folderMessageCount,
            "dbCount", dbCount,
            "syncedThrough", syncedThrough,
            "oldest known", this.folderStorage.getOldestMessageTimestamp());
    if (this._curSyncDir === PASTWARDS &&
        folderMessageCount === dbCount &&
        (!folderMessageCount ||
         TIME_DIR_AT_OR_BEYOND(this._curSyncDir, syncedThrough,
                               this.folderStorage.getOldestMessageTimestamp()))
       ) {
      // expand the accuracy range to cover everybody
      this.folderStorage.markSyncedToDawnOfTime();
      this._doneSync();
      return;
    }
    // If we've synchronized to the limits of syncing in the given direction,
    // we're done.
    if (!this._nextSyncAnchorTS ||
        TIME_DIR_AT_OR_BEYOND(this._curSyncDir, this._nextSyncAnchorTS,
                              this._syncThroughTS)) {
      this._doneSync();
      return;
    }

    // - Done if this is a grow and we don't want/need any more headers.
    if (this._curSyncIsGrow &&
        this._syncSlice.headers.length >= this._syncSlice.desiredHeaders) {
        // (limited syncs aren't allowed to expand themselves)
      console.log("SYNCDONE Enough headers retrieved.",
                  "have", this._syncSlice.headers.length,
                  "want", this._syncSlice.desiredHeaders,
                  "conn knows about", this.folderConn.box.messages.total,
                  "sync date", this._curSyncStartTS,
                  "[oldest defined as", $sync.OLDEST_SYNC_DATE, "]");
      this._doneSync();
      return;
    }

    // - Increase our search window size if we aren't finding anything
    // Our goal is that if we are going backwards in time and aren't finding
    // anything, we want to keep expanding our window
    var daysToSearch, lastSyncDaysInPast;
    // If we saw messages, there is no need to increase the window size.  We
    // also should not increase the size if we explicitly shrank the window and
    // left a do-not-expand-until marker.
    if (messagesSeen || (this._curSyncDoNotGrowBoundary !== null &&
         !TIME_DIR_AT_OR_BEYOND(this._curSyncDir, this._nextSyncAnchorTS,
                                this._curSyncDoNotGrowBoundary))) {
      daysToSearch = this._curSyncDayStep;
    }
    else {
      this._curSyncDoNotGrowBoundary = null;
      // This may be a fractional value because of DST
      lastSyncDaysInPast = ((quantizeDate(NOW() + this._account.tzOffset)) -
                           this._nextSyncAnchorTS) / DAY_MILLIS;
      daysToSearch = Math.ceil(this._curSyncDayStep *
                               $sync.TIME_SCALE_FACTOR_ON_NO_MESSAGES);

      // These values used to be more conservative, but the importance of these
      // guards was reduced when we switched to only syncing headers.
      // At current constants (sync=3, scale=2), our doubling in the face of
      // clamping is: 3, 6, 12, 24, 45, ... 90,
      if (lastSyncDaysInPast < 180) {
        if (daysToSearch > 45)
          daysToSearch = 45;
      }
      else if (lastSyncDaysInPast < 365) { // 1 year
        if (daysToSearch > 90)
          daysToSearch = 90;
      }
      else if (lastSyncDaysInPast < 730) { // 2 years
        if (daysToSearch > 120)
          daysToSearch = 120;
      }
      else if (lastSyncDaysInPast < 1825) { // 5 years
        if (daysToSearch > 180)
          daysToSearch = 180;
      }
      else if (lastSyncDaysInPast < 3650) { // 10 years
        if (daysToSearch > 365)
          daysToSearch = 365;
      }
      else if (daysToSearch > 730) {
        daysToSearch = 730;
      }
      this._curSyncDayStep = daysToSearch;
    }

    // - Move the time range back in time more.
    var startTS, endTS;
    if (this._curSyncDir === PASTWARDS) {
      endTS = this._nextSyncAnchorTS;
      this._nextSyncAnchorTS = startTS = makeDaysBefore(endTS, daysToSearch,
                                                        this._account.tzOffset);
    }
    else { // FUTUREWARDS
      startTS = this._nextSyncAnchorTS;
      this._nextSyncAnchorTS = endTS = makeDaysBefore(startTS, -daysToSearch,
                                                      this._account.tzOffset);
    }
    this.folderConn.syncDateRange(startTS, endTS, this._curSyncAccuracyStamp,
                                  this.onSyncCompleted.bind(this));
  },

  /**
   * Invoked when there are no longer any live slices on the folder and no more
   * active/enqueued mutex ops.
   */
  allConsumersDead: function() {
    this.folderConn.relinquishConn();
  },

  shutdown: function() {
    this.folderConn.shutdown();
    this._LOG.__die();
  },
};

/**
 * ALL SPECULATIVE RIGHT NOW.
 *
 * Like ImapFolderStorage, but with only one folder and messages named by their
 * X-GM-MSGID value rather than their UID(s).
 *
 * Deletion processing operates slightly differently than for normal IMAP
 * because a message can be removed from one of the folders we synchronize on,
 * but not all of them.  We don't want to be overly deletionary in that case,
 * so we maintain a list of folder id's that are keeping each message alive.
 */
function GmailMessageStorage() {
}
GmailMessageStorage.prototype = {
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  ImapFolderConn: {
    type: $log.CONNECTION,
    subtype: $log.CLIENT,
    events: {
    },
    TEST_ONLY_events: {
    },
    errors: {
      callbackErr: { ex: $log.EXCEPTION },

      htmlParseError: { ex: $log.EXCEPTION },
      htmlSnippetError: { ex: $log.EXCEPTION },
      textChewError: { ex: $log.EXCEPTION },
      textSnippetError: { ex: $log.EXCEPTION },

      // Attempted to sync with an empty or inverted range.
      illegalSync: { startTS: false, endTS: false },
    },
    asyncJobs: {
      syncDateRange: {
        newMessages: true, existingMessages: true, deletedMessages: true,
        start: false, end: false, skewedStart: false, skewedEnd: false,
      },
    },
  },
  ImapFolderSyncer: {
    type: $log.DATABASE,
    events: {
    }
  },
}); // end LOGFAB

}); // end define
;
/**
 * Abstractions for dealing with the various mutation operations.
 *
 * NB: Moves discussion is speculative at this point; we are just thinking
 * things through for architectural implications.
 *
 * == Speculative Operations ==
 *
 * We want our UI to update as soon after requesting an operation as possible.
 * To this end, we have logic to locally apply queued mutation operations.
 * Because we may want to undo operations when we are offline (and have not
 * been able to talk to the server), we also need to be able to reflect these
 * changes locally independent of telling the server.
 *
 * In the case of moves/copies, we issue a(n always locally created) id for the
 * message immediately and just set the server UID (srvid) to 0 to be populated
 * by the sync process.
 *
 * == Data Integrity ==
 *
 * Our strategy is always to avoid server data-loss, so data-destruction actions
 * must always take place after successful confirmation of persistence actions.
 * (Just keeping the data in-memory is not acceptable because we could crash,
 * etc.)
 *
 * This is in contrast to our concern about losing simple, frequently performed
 * idempotent user actions in a crash.  We assume that A) crashes will be
 * rare, B) the user will not be surprised or heart-broken if a message they
 * marked read a second before a crash needs to manually be marked read after
 * restarting the app/device, and C) there are performance/system costs to
 * saving the state which makes this a reasonable trade-off.
 *
 * It is also our strategy to avoid cluttering up the place as a side-effect
 * of half-done things.  For example, if we are trying to move N messages,
 * but only copy N/2 because of a timeout, we want to make sure that we
 * don't naively retry and then copy those first N/2 messages a second time.
 * This means that we track sub-steps explicitly, and that operations that we
 * have issued and may or may not have been performed by the server will be
 * checked before they are re-attempted.  (Although IMAP batch operations
 * are atomic, and our IndexedDB commits are atomic, they are atomic independent
 * of each other and so we could have been notified that the copy completed
 * but not persisted the fact to our database.)
 *
 * In the event we restore operations from disk that were enqueued but
 * apparently not run, we compel them to run a check operation before they are
 * performed because it's possible (depending on the case) for us to have run
 * them without saving the account state first.  This is a trade-off between the
 * cost of checking and the cost of issuing commits to the database frequently
 * based on the expected likelihood of a crash on our part.  Per comments above,
 * we expect crashes to be rare and not particularly correlated with operations,
 * so it's better for the device (both flash and performance) if we don't
 * continually checkpoint our state.
 *
 * All non-idempotent operations / operations that could result in data loss or
 * duplication require that we save our account state listing the operation.  In
 * the event of a crash, this allows us to know that we have to check the state
 * of the operation for completeness before attempting to run it again and
 * allowing us to finish half-done things.  For particular example, because
 * moves consist of a copy followed by flagging a message deleted, it is of the
 * utmost importance that we don't get in a situation where we have copied the
 * messages but not deleted them and we crash.  In that case, if we failed to
 * persist our plans, we will have duplicated the message (and the IMAP server
 * would have no reason to believe that was not our intent.)
 **/

define('mailapi/imap/jobs',
  [
    'rdcommon/log',
    'mix',
    '../jobmixins',
    'mailapi/drafts/jobs',
    'module',
    'exports'
  ],
  function(
    $log,
    mix,
    $jobmixins,
    draftsJobs,
    $module,
    exports
  ) {

/**
 * The evidence suggests the job has not yet been performed.
 */
var CHECKED_NOTYET = 'checked-notyet';
/**
 * The operation is idempotent and atomic, just perform the operation again.
 * No checking performed.
 */
var UNCHECKED_IDEMPOTENT = 'idempotent';
/**
 * The evidence suggests that the job has already happened.
 */
var CHECKED_HAPPENED = 'happened';
/**
 * The job is no longer relevant because some other sequence of events
 * have mooted it.  For example, we can't change tags on a deleted message
 * or move a message between two folders if it's in neither folder.
 */
var CHECKED_MOOT = 'moot';
/**
 * A transient error (from the checker's perspective) made it impossible to
 * check.
 */
var UNCHECKED_BAILED = 'bailed';
/**
 * The job has not yet been performed, and the evidence is that the job was
 * not marked finished because our database commits are coherent.  This is
 * appropriate for retrieval of information, like the downloading of
 * attachments.
 */
var UNCHECKED_COHERENT_NOTYET = 'coherent-notyet';

/**
 * @typedef[MutationState @dict[
 *   @key[suidToServerId @dictof[
 *     @key[SUID]
 *     @value[ServerID]
 *   ]]{
 *     Tracks the server id (UID on IMAP) for an account as it is currently
 *     believed to exist on the server.  We persist this because the actual
 *     header may have been locally moved to another location already, so
 *     there may not be storage for the information in the folder when
 *     subsequent non-local operations run (such as another move or adding
 *     a tag).
 *
 *     This table is entirely populated by the actual (non-local) move
 *     operations.  Entries remain in this table until they are mooted by a
 *     subsequent move or the table is cleared once all operations for the
 *     account complete.
 *   }
 *   @key[moveMap @dictof[
 *     @key[oldSuid SUID]
 *     @value[newSuid SUID]
 *   ]]{
 *     Expresses the relationship between moved messages by local-operations.
 *   }
 * ]]
 *
 * @typedef[MutationStateDelta @dict[
 *   @key[serverIdMap @dictof[
 *     @key[suid SUID]
 *     @value[srvid @oneof[null ServerID]]
 *   ]]{
 *     New values for `MutationState.suidToServerId`; set/updated by by
 *     non-local operations once the operation has been performed.  A null
 *     `srvid` is used to convey the header no longer exists at the previous
 *     name.
 *   }
 *   @key[moveMap @dictof[
 *     @key[oldSuid SUID]
 *     @value[newSuid SUID]
 *   ]]{
 *     Expresses the relationship between moved messages by local-operations.
 *   }
 * ]]{
 *   A set of attributes that can be set on an operation to cause changes to
 *   the `MutationState` for the account.  This forms part of the interface
 *   of the operations.  The operations don't manipulate the table directly
 *   to reduce code duplication, ease debugging, and simplify unit testing.
 * }
 **/

function ImapJobDriver(account, state, _parentLog) {
  this.account = account;
  this.resilientServerIds = false;
  this._heldMutexReleasers = [];

  this._LOG = LOGFAB.ImapJobDriver(this, _parentLog, this.account.id);

  this._state = state;
  // (we only need to use one as a proxy for initialization)
  if (!state.hasOwnProperty('suidToServerId')) {
    state.suidToServerId = {};
    state.moveMap = {};
  }

  this._stateDelta = {
    serverIdMap: null,
    moveMap: null,
  };
}
exports.ImapJobDriver = ImapJobDriver;
ImapJobDriver.prototype = {
  /**
   * Request access to an IMAP folder to perform a mutation on it.  This
   * acquires a write mutex on the FolderStorage and compels the ImapFolderConn
   * in question to acquire an IMAP connection if it does not already have one.
   *
   * The callback will be invoked with the folder and raw connections once
   * they are available.  The raw connection will be actively in the folder.
   *
   * There is no need to explicitly release the connection when done; it will
   * be automatically released when the mutex is released if desirable.
   *
   * This will ideally be migrated to whatever mechanism we end up using for
   * mailjobs.
   *
   * @args[
   *   @param[folderId]
   *   @param[needConn Boolean]{
   *     True if we should try and get a connection from the server.  Local ops
   *     should pass false.
   *   }
   *   @param[callback @func[
   *     @args[
   *       @param[folderConn ImapFolderConn]
   *       @param[folderStorage FolderStorage]
   *     ]
   *   ]]
   *   @param[deathback Function]
   *   @param[label String]{
   *     The label to identify this usage for debugging purposes.
   *   }
   * ]
   */
  _accessFolderForMutation: function(folderId, needConn, callback, deathback,
                                     label) {
    var storage = this.account.getFolderStorageForFolderId(folderId),
        self = this;
    storage.runMutexed(label, function(releaseMutex) {
      var syncer = storage.folderSyncer;
      var action = function () {
        self._heldMutexReleasers.push(releaseMutex);
        try {
          callback(syncer.folderConn, storage);
        }
        catch (ex) {
          self._LOG.callbackErr(ex);
        }
      };

      // localdrafts is a synthetic folder and so we never want a connection
      // for it.  This is a somewhat awkward place to make this decision, but
      // it does work.
      if (needConn && storage.folderMeta.type !== 'localdrafts') {
        syncer.folderConn.withConnection(function () {
          // When we release the mutex, the folder may not
          // release its connection, so be sure to reset
          // error handling (deathback).  We are slightly
          // abusing the mutex releasing mutex mechanism
          // here. And we do want to do this before calling
          // the actual mutex releaser since we might
          // otherwise interact with someone else who just
          // acquired the mutex, (only) theoretically.
          self._heldMutexReleasers.push(function() {
            syncer.folderConn.clearErrorHandler();
          });

          action();
        },
        // Always pass true for dieOnConnectFailure; we don't want any of our
        // operations hanging out waiting for retry backoffs.  The ops want to
        // only run when we believe we are online with a good connection.
        deathback, label, true);
      } else {
        action();
      }
    });
  },

  _partitionAndAccessFoldersSequentially:
    $jobmixins._partitionAndAccessFoldersSequentially,

  /**
   * Request access to a connection for some type of IMAP manipulation that does
   * not involve a folder known to the system (which should then be accessed via
   * _accessfolderForMutation).
   *
   * The connection will be automatically released when the operation completes,
   * there is no need to release it directly.
   */
  _acquireConnWithoutFolder: function(label, callback, deathback) {
    this._LOG.acquireConnWithoutFolder_begin(label);
    var self = this;
    this.account.__folderDemandsConnection(
      null, label,
      function(conn) {
        self._LOG.acquireConnWithoutFolder_end(label);
        self._heldMutexReleasers.push(function() {
          self.account.__folderDoneWithConnection(conn, false, false);
        });
        try {
          callback(conn);
        }
        catch (ex) {
          self._LOG.callbackErr(ex);
        }
      },
      deathback
    );
  },

  postJobCleanup: $jobmixins.postJobCleanup,

  allJobsDone: $jobmixins.allJobsDone,

  //////////////////////////////////////////////////////////////////////////////
  // downloadBodies: Download the bodies from a list of messages

  local_do_downloadBodies: $jobmixins.local_do_downloadBodies,

  do_downloadBodies: $jobmixins.do_downloadBodies,

  check_downloadBodies: $jobmixins.check_downloadBodies,

  //////////////////////////////////////////////////////////////////////////////
  // downloadBodyReps: Download the bodies from a single message

  local_do_downloadBodyReps: $jobmixins.local_do_downloadBodyReps,

  do_downloadBodyReps: $jobmixins.do_downloadBodyReps,

  check_downloadBodyReps: $jobmixins.check_downloadBodyReps,

  //////////////////////////////////////////////////////////////////////////////
  // download: Download one or more attachments from a single message

  local_do_download: $jobmixins.local_do_download,

  do_download: $jobmixins.do_download,

  check_download: $jobmixins.check_download,

  local_undo_download: $jobmixins.local_undo_download,

  undo_download: $jobmixins.undo_download,

  //////////////////////////////////////////////////////////////////////////////
  // modtags: Modify tags on messages

  local_do_modtags: $jobmixins.local_do_modtags,

  do_modtags: function(op, jobDoneCallback, undo) {
    var addTags = undo ? op.removeTags : op.addTags,
        removeTags = undo ? op.addTags : op.removeTags;

    var aggrErr = null;

    this._partitionAndAccessFoldersSequentially(
      op.messages, true,
      function perFolder(folderConn, storage, serverIds, namers, callWhenDone) {
        var modsToGo = 0;
        function tagsModded(err) {
          if (err) {
            console.error('failure modifying tags', err);
            aggrErr = 'unknown';
            return;
          }
          op.progress += (undo ? -serverIds.length : serverIds.length);
          if (--modsToGo === 0)
            callWhenDone();
        }
        var uids = [];
        for (var i = 0; i < serverIds.length; i++) {
          var srvid = serverIds[i];
          // The header may have disappeared from the server, in which case the
          // header is moot.
          if (srvid)
            uids.push(srvid);
        }
        // Be done if all of the headers were moot.
        if (!uids.length) {
          callWhenDone();
          return;
        }
        if (addTags) {
          modsToGo++;
          folderConn._conn.addFlags(uids, addTags, tagsModded);
        }
        if (removeTags) {
          modsToGo++;
          folderConn._conn.delFlags(uids, removeTags, tagsModded);
        }
      },
      function allDone() {
        jobDoneCallback(aggrErr);
      },
      function deadConn() {
        aggrErr = 'aborted-retry';
      },
      /* reverse if we're undoing */ undo,
      'modtags');
  },

  check_modtags: function(op, callback) {
    callback(null, UNCHECKED_IDEMPOTENT);
  },

  local_undo_modtags: $jobmixins.local_undo_modtags,

  undo_modtags: function(op, callback) {
    // Undoing is just a question of flipping the add and remove lists.
    return this.do_modtags(op, callback, true);
  },

  //////////////////////////////////////////////////////////////////////////////
  // delete: Delete messages

  local_do_delete: $jobmixins.local_do_delete,

  /**
   * Move the message to the trash folder.  In Gmail, there is no move target,
   * we just delete it and gmail will (by default) expunge it immediately.
   */
  do_delete: function(op, doneCallback) {
    var trashFolder = this.account.getFirstFolderWithType('trash');
    this.do_move(op, doneCallback, trashFolder.id);
  },

  check_delete: function(op, doneCallback) {
    var trashFolder = this.account.getFirstFolderWithType('trash');
    this.check_move(op, doneCallback, trashFolder.id);
  },

  local_undo_delete: $jobmixins.local_undo_delete,

  undo_delete: function(op, doneCallback) {
  },

  //////////////////////////////////////////////////////////////////////////////
  // move: Move messages between folders (in a single account)
  //
  // ## General Strategy ##
  //
  // Local Do:
  //
  // - Move the header to the target folder's storage, updating the op with the
  //   message-id header of the message for each message so that the check
  //   operation has them available.
  //
  //   This requires acquiring a write mutex to the target folder while also
  //   holding one on the source folder.  We are assured there is no deadlock
  //   because only operations are allowed to manipulate multiple folders at
  //   once, and only one operation is in-flight per an account at a time.
  //   (And cross-account moves are not handled by this operation.)
  //
  //   Insertion is done using the INTERNALDATE (which must be maintained by the
  //   COPY operation) and a freshly allocated id, just like if we had heard
  //   about the header from the server.
  //
  // Do:
  //
  // - Acquire a connection to the target folder so that we can know the UIDNEXT
  //   value prior to performing the copy.  FUTURE: Don't do this if the server
  //   supports UIDPLUS.
  //
  // (Do the following in a loop per-source folder)
  //
  // - Copy the messages to the target folder via COPY.
  //
  // - Figure out the UIDs of our moved messages.  FUTURE: If the server is
  //   UIDPLUS, we already know these from the results of the previous command.
  //   NOW: Issue a fetch on the message-id headers of the messages in the
  //   range UIDNEXT:*.  Use these results to map the UIDs to the messages we
  //   copied above.  In the event of duplicate message-id's, ordering doesn't
  //   matter, we just pick the first one.  Update our UIDNEXT value in case
  //   there is another pass through the loop.
  //
  // - Issue deletes on the messages from the source folder.
  //
  // Check: XXX TODO POSTPONED FOR PRELIMINARY LANDING
  //
  // NB: Our check implementation actually is a correcting check implemenation;
  // we will make things end up the way they should be.  We do this because it
  // is simpler than
  //
  // - Acquire a connection to the target folder.  Issue broad message-id
  //   header searches to find if the messages appear to be in the folder
  //   already, note which are already present.  This needs to take the form
  //   of a SEARCH followed by a FETCH to map UIDs to message-id's.  In theory
  //   the IMAP copy command should be atomic, but I'm not sure we can trust
  //   that and we also have the problem where there could already be duplicate
  //   message-id headers in the target which could confuse us if our check is
  //   insufficiently thorough.  The FETCH needs to also retrieve the flags
  //   for the message so we can track deletion state.
  //
  // (Do the following in a loop per source folder)
  //
  // - Acquire connections for each source folder.  Issue message-id searches
  //   like we did for the target including header results.  In theory we might
  //   remember the UIDs for check acceleration purposes, but that would not
  //   cover if we tried to perform an undo, so we go for thorough.
  //
  // -
  //
  // ## Possible Problems and their Solutions ##
  //
  // Moves are fairly complicated in terms of moving parts, so let's enumate the
  // way things could go wrong so we can make sure we address them and describe
  // how we address them.  Note that it's a given that we will have run our
  // local modifications prior to trying to talk to the server, which reduces
  // the potential badness.
  //
  // #1: We attempt to resynchronize the source folder for a move prior to
  //     running the operation against the server, resulting in us synchronizing
  //     a duplicate header into existence that will not be detected until the
  //     next resync of the time range (which will be strictly after when we
  //     actually run the mutation.
  //
  // #2: Operations scheduled against speculative headers.  It is quite possible
  //     for the user to perform actions against one of the locally /
  //     speculatively moved headers while we are offline/have not yet played
  //     the operation/are racing the UI while playing the operation.  We
  //     obviously want these changes to succeed.
  //
  // Our solutions:
  //
  // #1: Prior to resynchronizing a folder, we check if there are any operations
  //     that block synchronization.  An un-run move with a source of that
  //     folder counts as such an operation.  We can determine this by either
  //     having sufficient knowledge to inspect an operation or have operations
  //     directly modify book-keeping structures in the folders as part of their
  //     actions.  (Add blocker on local_(un)do, remove on (un)do.)  We choose
  //     to implement the inspection operation by having all operations
  //     implement a simple helper to tell us if the operation blocks entry.
  //     The theory is this will be less prone to bugs since it will be clear
  //     that operations need to implement the method, whereas it would be less
  //     clear that operations need to do call the folder-state mutating
  //     options.
  //
  // #2: Operations against speculative headers are a concern only from a naming
  //     perspective for operations.  Operations are strictly run in the order
  //     they are enqueued, so we know that the header will have been moved and
  //     be in the right folder.  Additionally, because both the UI and
  //     operations name messages using an id we issue rather than the server
  //     UID, there is no potential for naming inconsistencies.  The UID will be
  //     resolved at operation run-time which only requires that the move
  //     operation either was UIDPLUS or we manually sussed out the target id
  //     (which we do for simplicity).
  //
  // XXX problem: repeated moves and UIDs.
  // what we do know:
  // - in order to know about a message, we must have a current UID of the
  //   message on the server where it currently lives.
  // what we could do:
  // - have successor move operations moot/replace their predecessor.  So a
  //   move from A to B, and then from B to C will just become a move from A to
  //   C from the perspective of the online op that will eventually be run.  We
  //   could potentially build this on top of a renaming strategy.  So if we
  //   move z-in-A to z-in-B, and then change a tag on z-in-B, and then move
  //   z-in-B to z-in-C, renaming and consolidatin would make this a move of
  //   z-in-A to z-in-C followed by a tag change on z-in-C.
  // - produce micro-IMAP-ops as a byproduct of our local actions that are
  //   stored on the operation.  So in the A/move to B/tag/move to C case above,
  //   we would not consolidate anything, just produce a transaction journal.
  //   The A-move-to-B case would be covered by serializing the information
  //   for the IMAP COPY and deletion.  In the UIDPLUS case, we have an
  //   automatic knowledge of the resulting new target UID; in the non-UIDPLUS
  //   case we can open the target folder and find out the new UID as part of
  //   the micro-op.  The question here is then how we chain these various
  //   results together in the multi-move case, or when we write the result to
  //   the target:
  //   - maintain an output value map for the operations.  When there is just
  //     the one move, the output for the UID for each move is the current
  //     header name of the message, which we will load and write the value
  //     into.  When there are multiple moves, the output map is adjusted and
  //     used to indicate that we should stash the UID in quasi-persistent
  //     storage for a subsequent move operation.  (This could be thought of
  //     as similar to the renaming logic, but explicit.)


  local_do_move: $jobmixins.local_do_move,

  do_move: function(op, jobDoneCallback, targetFolderId) {
    var state = this._state, stateDelta = this._stateDelta, aggrErr = null;
    if (!stateDelta.serverIdMap)
      stateDelta.serverIdMap = {};
    if (!targetFolderId)
      targetFolderId = op.targetFolder;

    this._partitionAndAccessFoldersSequentially(
      op.messages, true,
      function perFolder(folderConn, sourceStorage, serverIds, namers,
                         perFolderDone){
        // XXX process UIDPLUS output when present, avoiding this step.
        var guidToNamer = {}, waitingOnHeaders = namers.length,
            reportedHeaders = 0, retriesLeft = 3, targetConn;

        // - got the target folder conn, now do the copies
        function gotTargetConn(targetConn, targetStorage) {
          var uidnext = targetConn.box._uidnext;
          folderConn._conn.copy(serverIds, targetStorage.folderMeta.path,
                                copiedMessages_reselect);

          function copiedMessages_reselect() {
            // Force a re-select of the folder to try and force the server to
            // perceive the move.  This was necessary for me at least on my
            // dovceot test setup.  Although we had heard that the COPY
            // completed, our FETCH was too fast, although an IDLE did report
            // the new messages after that.

            // We need to use a callback here because imap.js's state
            // checking is immediate, so it's very possible to race the folder
            // selection and lose.
            targetConn.reselectBox(copiedMessages_findNewUIDs);
          }
          // - copies are done, find the UIDs
          function copiedMessages_findNewUIDs() {
            var fetcher = targetConn._conn.fetch(
              uidnext + ':*',
              {
                request: {
                  headers: ['MESSAGE-ID'],
                  struct: false,
                  body: false
                }
              });
            // because we aren't waiting for body data, we can just process the
            // 'message' event directly without registering for an 'end' event
            // on it.
            fetcher.on('message', function(msg) {
              msg.on('end', fetchedMessageData);
            });
            // We don't need to wait for 'end' since we know how many of these
            // we care about.
            fetcher.on('error', function(err) {
              aggrErr = err;
              perFolderDone();
            });
            fetcher.on('end', function() {
              if (reportedHeaders < namers.length) {
                // If we didn't hear about all the headers, let's retry in
                // a little bit.
                if (--retriesLeft === 0) {
                  aggrErr = 'aborted-retry';
                  perFolderDone();
                  return;
                }

                window.setTimeout(copiedMessages_findNewUIDs, 500);
              }
            });
          }
          function fetchedMessageData(msg) {
            var guid = msg.msg.meta.messageId;
            if (!guidToNamer.hasOwnProperty(guid))
              return;
            reportedHeaders++;
            var namer = guidToNamer[guid];
            stateDelta.serverIdMap[namer.suid] = msg.id;
            uidnext = msg.id + 1;
            var newSuid = state.moveMap[namer.suid];
            var newId =
                  parseInt(newSuid.substring(newSuid.lastIndexOf('/') + 1));
            targetStorage.updateMessageHeader(
              namer.date, newId, false,
              function(header) {
                // If the header isn't there because it got moved, then null
                // will be returned and it's up to the next move operation to
                // fix this up.
                if (header)
                  header.srvid = msg.id;
                else
                  console.warn('did not find header for', namer.suid,
                               newSuid, namer.date, newId);
                if (--waitingOnHeaders === 0)
                  foundUIDs_deleteOriginals();
                return true;
              });
          }
        }

        function foundUIDs_deleteOriginals() {
          folderConn._conn.addFlags(serverIds, ['\\Deleted'],
                                    deletedMessages);
        }
        function deletedMessages(err) {
          if (err)
            aggrErr = true;
          perFolderDone();
        }

        // Build a guid-to-namer map and deal with any messages that no longer
        // exist on the server.  Do it backwards so we can splice.
        for (var i = namers.length - 1; i >= 0; i--) {
          var srvid = serverIds[i];
          if (!srvid) {
            serverIds.splice(i, 1);
            namers.splice(i, 1);
            continue;
          }
          var namer = namers[i];
          guidToNamer[namer.guid] = namer;
        }
        // it's possible all the messages could be gone, in which case we
        // are done with this folder already!
        if (serverIds.length === 0) {
          perFolderDone();
          return;
        }

        // There is nothing to do on localdrafts folders, server-wise.
        if (sourceStorage.folderMeta.type === 'localdrafts') {
          perFolderDone();
        }
        else if (sourceStorage.folderId === targetFolderId) {
          if (op.type === 'move') {
            // A move from a folder to itself is a no-op.
            perFolderDone();
          }
          else { // op.type === 'delete'
            // If the op is a delete and the source and destination folders
            // match, we're deleting from trash, so just perma-delete it.
            foundUIDs_deleteOriginals();
          }
        }
        else {
          // Resolve the target folder again.
          this._accessFolderForMutation(targetFolderId, true, gotTargetConn,
                                        function targetFolderDead() {},
                                        'move target');
        }
      }.bind(this),
      function() {
        jobDoneCallback(aggrErr);
      },
      null,
      false,
      'local move source');
  },

  /**
   * See section block comment for more info.
   *
   * XXX implement checking logic for move
   */
  check_move: function(op, doneCallback, targetFolderId) {
    // get a connection in the target folder
    // do a search on message-id's to check if the messages got copied across.
    doneCallback(null, 'moot');
  },

  local_undo_move: $jobmixins.local_undo_move,

  /**
   * Move the message back to its original folder.
   *
   * - If the source message has not been expunged, remove the Deleted flag from
   *   the source folder.
   * - If the source message was expunged, copy the message back to the source
   *   folder.
   * - Delete the message from the target folder.
   *
   * XXX implement undo functionality for move
   */
  undo_move: function(op, doneCallback, targetFolderId) {
    doneCallback('moot');
  },


  //////////////////////////////////////////////////////////////////////////////
  // append: Add a message to a folder
  //
  // Message should look like:
  // {
  //    messageText: the message body,
  //    date: the date to use as the INTERNALDATE of the message,
  //    flags: the initial set of flags for the message
  // }

  local_do_append: function(op, doneCallback) {
    doneCallback(null);
  },

  /**
   * Append a message to a folder.
   */
  do_append: function(op, callback) {
    var folderConn, self = this,
        storage = this.account.getFolderStorageForFolderId(op.folderId),
        folderMeta = storage.folderMeta,
        iNextMessage = 0;

    var gotFolderConn = function gotFolderConn(_folderConn) {
      if (!_folderConn) {
        done('unknown');
        return;
      }
      folderConn = _folderConn;
      if (folderConn._conn.hasCapability('MULTIAPPEND'))
        multiappend();
      else
        append();
    };
    var deadConn = function deadConn() {
      callback('aborted-retry');
    };
    var multiappend = function multiappend() {
      iNextMessage = op.messages.length;
      folderConn._conn.multiappend(op.messages, appended);
    };
    var append = function append() {
      var message = op.messages[iNextMessage++];
      folderConn._conn.append(
        message.messageText,
        message, // (it will ignore messageText)
        appended);
    };
    var appended = function appended(err) {
      if (err) {
        console.error('failure appending message', err);
        done('unknown');
        return;
      }
      if (iNextMessage < op.messages.length)
        append();
      else
        done(null);
    };
    var done = function done(errString) {
      if (folderConn)
        folderConn = null;
      callback(errString);
    };

    this._accessFolderForMutation(op.folderId, true, gotFolderConn, deadConn,
                                  'append');
  },

  /**
   * Check if the message ended up in the folder.
   *
   * TODO implement
   */
  check_append: function(op, doneCallback) {
    // XXX search on the message-id in the folder to verify its presence.
    doneCallback(null, 'moot');
  },

  // TODO implement
  local_undo_append: function(op, doneCallback) {
    doneCallback(null);
  },

  // TODO implement
  undo_append: function(op, doneCallback) {
    doneCallback('moot');
  },

  //////////////////////////////////////////////////////////////////////////////
  // syncFolderList
  //
  // Synchronize our folder list.  This should always be an idempotent operation
  // that makes no sense to undo/redo/etc.

  local_do_syncFolderList: function(op, doneCallback) {
    doneCallback(null);
  },

  do_syncFolderList: function(op, doneCallback) {
    var account = this.account, reported = false;
    this._acquireConnWithoutFolder(
      'syncFolderList',
      function gotConn(conn) {
        account._syncFolderList(conn, function(err) {
            if (!err)
              account.meta.lastFolderSyncAt = Date.now();
            // request an account save
            if (!reported)
              doneCallback(err ? 'aborted-retry' : null, null, !err);
            reported = true;
          });
      },
      function deadConn() {
        if (!reported)
          doneCallback('aborted-retry');
        reported = true;
      });
  },

  check_syncFolderList: function(op, doneCallback) {
    doneCallback('idempotent');
  },

  local_undo_syncFolderList: function(op, doneCallback) {
    doneCallback('moot');
  },

  undo_syncFolderList: function(op, doneCallback) {
    doneCallback('moot');
  },

  //////////////////////////////////////////////////////////////////////////////
  // createFolder: Create a folder

  local_do_createFolder: function(op, doneCallback) {
    // we never locally perform this operation.
    doneCallback(null);
  },

  do_createFolder: function(op, callback) {
    var path, delim, parentFolderId = null;
    if (op.parentFolderId) {
      if (!this.account._folderInfos.hasOwnProperty(op.parentFolderId))
        throw new Error("No such folder: " + op.parentFolderId);
      var parentFolder = this.account._folderInfos[op.parentFolderId];
      delim = parentFolder.$meta.delim;
      path = parentFolder.$meta.path + delim;
      parentFolderId = parentFolder.$meta.id;
    }
    else {
      path = '';
      delim = this.account.meta.rootDelim;
    }
    if (typeof(op.folderName) === 'string')
      path += op.folderName;
    else
      path += op.folderName.join(delim);
    if (op.containOnlyOtherFolders)
      path += delim;

    var rawConn = null, self = this;
    function gotConn(conn) {
      // create the box
      rawConn = conn;
      rawConn.addBox(path, addBoxCallback);
    }
    function addBoxCallback(err) {
      if (err) {
        // If the folder already exists, we are done.
        if (err.serverResponse &&
            /\[ALREADYEXISTS\]/.test(err.serverResponse)) {
          done(null);
          return;
        }
        console.error('Error creating box:', err);
        // XXX implement the already-exists check...
        done('unknown');
        return;
      }
      // Do a list on the folder so that we get the right attributes and any
      // magical case normalization performed by the server gets observed by
      // us.
      rawConn.getBoxes('', path, gotBoxes);
    }
    function gotBoxes(err, boxesRoot) {
      if (err) {
        console.error('Error looking up box:', err);
        done('unknown');
        return;
      }
      // We need to re-derive the path.  The hierarchy will only be that
      // required for our new folder, so we traverse all children and create
      // the leaf-node when we see it.
      var folderMeta = null;
      function walkBoxes(boxLevel, pathSoFar, pathDepth) {
        for (var boxName in boxLevel) {
          var box = boxLevel[boxName],
              boxPath = pathSoFar ? (pathSoFar + boxName) : boxName;
          if (box.children) {
            walkBoxes(box.children, boxPath + box.delim, pathDepth + 1);
          }
          else {
            var type = self.account._determineFolderType(box, boxPath, rawConn);
            folderMeta = self.account._learnAboutFolder(
              boxName, boxPath, parentFolderId, type, box.delim, pathDepth);
          }
        }
      }
      walkBoxes(boxesRoot, '', 0);
      if (folderMeta)
        done(null, folderMeta);
      else
        done('unknown');
    }
    function done(errString, folderMeta) {
      if (rawConn)
        rawConn = null;
      if (callback)
        callback(errString, folderMeta);
    }
    function deadConn() {
      callback('aborted-retry');
    }
    this._acquireConnWithoutFolder('createFolder', gotConn, deadConn);
  },

  check_createFolder: function(op, doneCallback) {
  },

  local_undo_createFolder: function(op, doneCallback) {
    doneCallback(null);
  },

  // TODO: port deleteFolder to be an op and invoke it here
  undo_createFolder: function(op, doneCallback) {
    doneCallback('moot');
  },

  //////////////////////////////////////////////////////////////////////////////
  // purgeExcessMessages

  local_do_purgeExcessMessages: function(op, doneCallback) {
    this._accessFolderForMutation(
      op.folderId, false,
      function withMutex(_ignoredConn, storage) {
        storage.purgeExcessMessages(function(numDeleted, cutTS) {
          // Indicate that we want a save performed if any messages got deleted.
          doneCallback(null, null, numDeleted > 0);
        });
      },
      null,
      'purgeExcessMessages');
  },

  do_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  check_purgeExcessMessages: function(op, doneCallback) {
    // this is a local-only modification, so this doesn't really matter
    return UNCHECKED_IDEMPOTENT;
  },

  local_undo_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  undo_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  //////////////////////////////////////////////////////////////////////////////
};

function HighLevelJobDriver() {
}
HighLevelJobDriver.prototype = {
  /**
   * Perform a cross-folder move:
   *
   * - Fetch the entirety of a message from the source location.
   * - Append the entirety of the message to the target location.
   * - Delete the message from the source location.
   */
  do_xmove: function() {
  },

  check_xmove: function() {

  },

  /**
   * Undo a cross-folder move.  Same idea as for normal undo_move; undelete
   * if possible, re-copy if not.  Delete the target once we're confident
   * the message made it back into the folder.
   */
  undo_xmove: function() {
  },

  /**
   * Perform a cross-folder copy:
   * - Fetch the entirety of a message from the source location.
   * - Append the message to the target location.
   */
  do_xcopy: function() {
  },

  check_xcopy: function() {
  },

  /**
   * Just delete the message from the target location.
   */
  undo_xcopy: function() {
  },
};

mix(ImapJobDriver.prototype, draftsJobs.draftsMixins);

var LOGFAB = exports.LOGFAB = $log.register($module, {
  ImapJobDriver: {
    type: $log.DAEMON,
    events: {
      savedAttachment: { storage: true, mimeType: true, size: true },
      saveFailure: { storage: false, mimeType: false, error: false },
    },
    TEST_ONLY_events: {
      saveFailure: { filename: false },
    },
    asyncJobs: {
      acquireConnWithoutFolder: { label: false },
    },
    errors: {
      callbackErr: { ex: $log.EXCEPTION },
    },
  },
});

}); // end define
;
/**
 *
 **/

define('mailapi/imap/account',
  [
    'rdcommon/log',
    '../a64',
    '../allback',
    '../errbackoff',
    '../mailslice',
    '../searchfilter',
    '../util',
    '../composite/incoming',
    './folder',
    './jobs',
    'module',
    'require',
    'exports'
  ],
  function(
    $log,
    $a64,
    $allback,
    $errbackoff,
    $mailslice,
    $searchfilter,
    $util,
    incoming,
    $imapfolder,
    $imapjobs,
    $module,
    require,
    exports
  ) {
var bsearchForInsert = $util.bsearchForInsert;
var allbackMaker = $allback.allbackMaker;
var CompositeIncomingAccount = incoming.CompositeIncomingAccount;

function cmpFolderPubPath(a, b) {
  return a.path.localeCompare(b.path);
}

/**
 * Account object, root of all interaction with servers.
 *
 * Passwords are currently held in cleartext with the rest of the data.  Ideally
 * we would like them to be stored in some type of keyring coupled to the TCP
 * API in such a way that we never know the API.  Se a vida e.
 *
 */
function ImapAccount(universe, compositeAccount, accountId, credentials,
                     connInfo, folderInfos,
                     dbConn,
                     _parentLog, existingProtoConn) {
  this._LOG = LOGFAB.ImapAccount(this, _parentLog, accountId);
  CompositeIncomingAccount.apply(
      this, [$imapfolder.ImapFolderSyncer].concat(Array.slice(arguments)));

  /**
   * The maximum number of connections we are allowed to have alive at once.  We
   * want to limit this both because we generally aren't sophisticated enough
   * to need to use many connections at once (unless we have bugs), and because
   * servers may enforce a per-account connection limit which can affect both
   * us and other clients on other devices.
   *
   * Thunderbird's default for this is 5.
   *
   * gmail currently claims to have a limit of 15 connections per account:
   * http://support.google.com/mail/bin/answer.py?hl=en&answer=97150
   *
   * I am picking 3 right now because it should cover the "I just sent a
   * messages from the folder I was in and then switched to another folder",
   * where we could have stuff to do in the old folder, new folder, and sent
   * mail folder.  I have also seem claims of connection limits of 3 for some
   * accounts out there, so this avoids us needing logic to infer a need to
   * lower our connection limit.
   */
  this._maxConnsAllowed = 3;
  /**
   * The `ImapConnection` we are attempting to open, if any.  We only try to
   * open one connection at a time.
   */
  this._pendingConn = null;
  this._ownedConns = [];
  /**
   * @listof[@dict[
   *   @key[folderId]
   *   @key[callback]
   * ]]{
   *   The list of requested connections that have not yet been serviced.  An
   * }
   */
  this._demandedConns = [];
  this._backoffEndpoint = $errbackoff.createEndpoint('imap:' + this.id, this,
                                                     this._LOG);

  if (existingProtoConn)
    this._reuseConnection(existingProtoConn);

  this.tzOffset = compositeAccount.accountDef.tzOffset;
  this._jobDriver = new $imapjobs.ImapJobDriver(
                          this, this._folderInfos.$mutationState, this._LOG);

  /**
   * Flag to allow us to avoid calling closeBox to close a folder.  This avoids
   * expunging deleted messages.
   */
  this._TEST_doNotCloseFolder = false;
}

exports.Account = exports.ImapAccount = ImapAccount;
ImapAccount.prototype = Object.create(CompositeIncomingAccount.prototype);
var properties = {
  type: 'imap',
  supportsServerFolders: true,
  toString: function() {
    return '[ImapAccount: ' + this.id + ']';
  },

  get isGmail() {
    return this.meta.capability.indexOf('X-GM-EXT-1') !== -1;
  },

  //////////////////////////////////////////////////////////////////////////////
  // Connection Pool-ish stuff

  get numActiveConns() {
    return this._ownedConns.length;
  },

  /**
   * Mechanism for an `ImapFolderConn` to request an IMAP protocol connection.
   * This is to potentially support some type of (bounded) connection pooling
   * like Thunderbird uses.  The rationale is that many servers cap the number
   * of connections we are allowed to maintain, plus it's hard to justify
   * locally tying up those resources.  (Thunderbird has more need of watching
   * multiple folders than ourselves, but we may still want to synchronize a
   * bunch of folders in parallel for latency reasons.)
   *
   * The provided connection will *not* be in the requested folder; it's up to
   * the folder connection to enter the folder.
   *
   * @args[
   *   @param[folderId #:optional FolderId]{
   *     The folder id of the folder that will be using the connection.  If
   *     it's not a folder but some task, then pass null (and ideally provide
   *     a useful `label`).
   *   }
   *   @param[label #:optional String]{
   *     A human readable explanation of the activity for debugging purposes.
   *   }
   *   @param[callback @func[@args[@param[conn]]]]{
   *     The callback to invoke once the connection has been established.  If
   *     there is a connection present in the reuse pool, this may be invoked
   *     immediately.
   *   }
   *   @param[deathback Function]{
   *     A callback to invoke if the connection dies or we feel compelled to
   *     reclaim it.
   *   }
   *   @param[dieOnConnectFailure #:optional Boolean]{
   *     Should we invoke the deathback for this request if we fail to establish
   *     a connection in a timely manner?  This will be immediately invoked if
   *     we are offline or if we exhaust our retries for establishing
   *     connections with the server.
   *   }
   * ]
   */
  __folderDemandsConnection: function(folderId, label, callback, deathback,
                                      dieOnConnectFailure) {
    // If we are offline, invoke the deathback soon and don't bother trying to
    // get a connection.
    if (dieOnConnectFailure && !this.universe.online) {
      window.setZeroTimeout(deathback);
      return;
    }

    var demand = {
      folderId: folderId,
      label: label,
      callback: callback,
      deathback: deathback,
      dieOnConnectFailure: Boolean(dieOnConnectFailure)
    };
    this._demandedConns.push(demand);

    // No line-cutting; bail if there was someone ahead of us.
    if (this._demandedConns.length > 1)
      return;

    // - try and reuse an existing connection
    if (this._allocateExistingConnection())
      return;

    // - we need to wait for a new conn or one to free up
    this._makeConnectionIfPossible();

    return;
  },

  /**
   * Trigger the deathbacks for all connection demands where dieOnConnectFailure
   * is true.
   */
  _killDieOnConnectFailureDemands: function() {
    for (var i = 0; i < this._demandedConns.length; i++) {
      var demand = this._demandedConns[i];
      if (demand.dieOnConnectFailure) {
        demand.deathback.call(null);
        this._demandedConns.splice(i--, 1);
      }
    }
  },

  /**
   * Try and find an available connection and assign it to the first connection
   * demand.
   *
   * @return[Boolean]{
   *   True if we allocated a demand to a conncetion, false if we did not.
   * }
   */
  _allocateExistingConnection: function() {
    if (!this._demandedConns.length)
      return false;
    var demandInfo = this._demandedConns[0];

    var reusableConnInfo = null;
    for (var i = 0; i < this._ownedConns.length; i++) {
      var connInfo = this._ownedConns[i];
      // It's concerning if the folder already has a connection...
      if (demandInfo.folderId && connInfo.folderId === demandInfo.folderId)
        this._LOG.folderAlreadyHasConn(demandInfo.folderId);

      if (connInfo.inUseBy)
        continue;

      connInfo.inUseBy = demandInfo;
      this._demandedConns.shift();
      this._LOG.reuseConnection(demandInfo.folderId, demandInfo.label);
      demandInfo.callback(connInfo.conn);
      return true;
    }

    return false;
  },

  /**
   * Close all connections that aren't currently in use.
   */
  closeUnusedConnections: function() {
    for (var i = this._ownedConns.length - 1; i >= 0; i--) {
      var connInfo = this._ownedConns[i];
      if (connInfo.inUseBy)
        continue;
      // this eats all future notifications, so we need to splice...
      connInfo.conn.die();
      this._ownedConns.splice(i, 1);
      this._LOG.deadConnection();
    }
  },

  _makeConnectionIfPossible: function() {
    if (this._ownedConns.length >= this._maxConnsAllowed) {
      this._LOG.maximumConnsNoNew();
      return;
    }
    if (this._pendingConn)
      return;

    this._pendingConn = true;
    var boundMakeConnection = this._makeConnection.bind(this);
    this._backoffEndpoint.scheduleConnectAttempt(boundMakeConnection);
  },

  _makeConnection: function(listener, whyFolderId, whyLabel) {
    // Mark a pending connection synchronously; the require call will not return
    // until at least the next turn of the event loop.
    this._pendingConn = true;
    // Dynamically load the probe/imap code to speed up startup.
    require(['imap', './probe'], function ($imap, $imapprobe) {
      this._LOG.createConnection(whyFolderId, whyLabel);
      var opts = {
        host: this._connInfo.hostname,
        port: this._connInfo.port,
        crypto: this._connInfo.crypto,

        username: this._credentials.username,
        password: this._credentials.password,

        blacklistedCapabilities: this._connInfo.blacklistedCapabilities,
      };
      if (this._LOG) opts._logParent = this._LOG;
      var conn = this._pendingConn = new $imap.ImapConnection(opts);
      var connectCallbackTriggered = false;
      // The login callback should get invoked in all cases, but a recent code
      // inspection for the prober suggested that there may be some cases where
      // things might fall-through, so let's just convert them.  We need some
      // type of handler since imap.js currently calls the login callback and
      // then the 'error' handler, generating an error if there is no error
      // handler.
      conn.on('error', function(err) {
        if (!connectCallbackTriggered)
          loginCb(err);
      });
      var loginCb;
      conn.connect(loginCb = function(err) {
        connectCallbackTriggered = true;
        this._pendingConn = null;
        if (err) {
          var normErr = $imapprobe.normalizeError(err);
          console.error('Connect error:', normErr.name, 'formal:', err, 'on',
                        this._connInfo.hostname, this._connInfo.port);
          if (normErr.reportProblem)
            this.universe.__reportAccountProblem(this.compositeAccount,
                                                 normErr.name);


          if (listener)
            listener(normErr.name);
          conn.die();

          // track this failure for backoff purposes
          if (normErr.retry) {
            if (this._backoffEndpoint.noteConnectFailureMaybeRetry(
                                        normErr.reachable))
              this._makeConnectionIfPossible();
            else
              this._killDieOnConnectFailureDemands();
          }
          else {
            this._backoffEndpoint.noteBrokenConnection();
            this._killDieOnConnectFailureDemands();
          }
        }
        else {
          this._bindConnectionDeathHandlers(conn);
          this._backoffEndpoint.noteConnectSuccess();
          this._ownedConns.push({
            conn: conn,
            inUseBy: null,
          });
          this._allocateExistingConnection();
          if (listener)
            listener(null);
          // Keep opening connections if there is more work to do
          // (and possible).
          if (this._demandedConns.length)
            this._makeConnectionIfPossible();
        }
      }.bind(this));
    }.bind(this));
  },

  /**
   * Treat a connection that came from the IMAP prober as a connection we
   * created ourselves.
   */
  _reuseConnection: function(existingProtoConn) {
    // We don't want the probe being kept alive and we certainly don't need its
    // listeners.
    existingProtoConn.removeAllListeners();
    this._ownedConns.push({
        conn: existingProtoConn,
        inUseBy: null,
      });
    this._bindConnectionDeathHandlers(existingProtoConn);
  },

  _bindConnectionDeathHandlers: function(conn) {
    // on close, stop tracking the connection in our list of live connections
    conn.on('close', function() {
      for (var i = 0; i < this._ownedConns.length; i++) {
        var connInfo = this._ownedConns[i];
        if (connInfo.conn === conn) {
          this._LOG.deadConnection(connInfo.inUseBy &&
                                   connInfo.inUseBy.folderId);
          if (connInfo.inUseBy && connInfo.inUseBy.deathback)
            connInfo.inUseBy.deathback(conn);
          connInfo.inUseBy = null;
          this._ownedConns.splice(i, 1);
          return;
        }
      }
      this._LOG.unknownDeadConnection();
    }.bind(this));
    conn.on('error', function(err) {
      this._LOG.connectionError(err);
      // this hears about connection errors too
      console.warn('Conn steady error:', err, 'on',
                   this._connInfo.hostname, this._connInfo.port);
    }.bind(this));
  },

  __folderDoneWithConnection: function(conn, closeFolder, resourceProblem) {
    for (var i = 0; i < this._ownedConns.length; i++) {
      var connInfo = this._ownedConns[i];
      if (connInfo.conn === conn) {
        if (resourceProblem)
          this._backoffEndpoint(connInfo.inUseBy.folderId);
        this._LOG.releaseConnection(connInfo.inUseBy.folderId,
                                    connInfo.inUseBy.label);
        connInfo.inUseBy = null;
        // (this will trigger an expunge if not read-only...)
        if (closeFolder && !resourceProblem && !this._TEST_doNotCloseFolder)
          conn.closeBox(function() {});
        return;
      }
    }
    this._LOG.connectionMismatch();
  },

  //////////////////////////////////////////////////////////////////////////////
  // Folder synchronization

  /**
   * Helper in conjunction with `_syncFolderComputeDeltas` for use by the
   * syncFolderList operation/job.  The op is on the hook for the connection's
   * lifecycle.
   */
  _syncFolderList: function(conn, callback) {
    conn.getBoxes(this._syncFolderComputeDeltas.bind(this, conn, callback));
  },
  _determineFolderType: function(box, path, conn) {
    var type = null;
    // NoSelect trumps everything.
    if (box.attribs.indexOf('NOSELECT') !== -1) {
      type = 'nomail';
    }
    else {
      // Standards-ish:
      // - special-use: http://tools.ietf.org/html/rfc6154
      //   IANA registrations:
      //   http://www.iana.org/assignments/imap4-list-extended
      // - xlist:
      //   https://developers.google.com/google-apps/gmail/imap_extensions

      // Process the attribs for goodness.
      for (var i = 0; i < box.attribs.length; i++) {
        switch (box.attribs[i]) {
          // TODO: split the 'all' cases into their own type!
          case 'ALL': // special-use
          case 'ALLMAIL': // xlist
          case 'ARCHIVE': // special-use
            type = 'archive';
            break;
          case 'DRAFTS': // special-use xlist
            type = 'drafts';
            break;
          case 'FLAGGED': // special-use
            type = 'starred';
            break;
          case 'IMPORTANT': // (undocumented) xlist
            type = 'important';
            break;
          case 'INBOX': // xlist
            type = 'inbox';
            break;
          case 'JUNK': // special-use
            type = 'junk';
            break;
          case 'SENT': // special-use xlist
            type = 'sent';
            break;
          case 'SPAM': // xlist
            type = 'junk';
            break;
          case 'STARRED': // xlist
            type = 'starred';
            break;

          case 'TRASH': // special-use xlist
            type = 'trash';
            break;

          case 'HASCHILDREN': // 3348
          case 'HASNOCHILDREN': // 3348

          // - standard bits we don't care about
          case 'MARKED': // 3501
          case 'UNMARKED': // 3501
          case 'NOINFERIORS': // 3501
            // XXX use noinferiors to prohibit folder creation under it.
          // NOSELECT

          default:
        }
      }

      // heuristic based type assignment based on the name
      if (!type) {
        // ensure that we treat folders at the root, see bug 854128
        var personalNS = conn.namespaces.personal;
        var prefix = personalNS.length ? personalNS[0].prefix : '';
        var isAtNamespaceRoot = path === (prefix + box.displayName);
        // If our name is our path, we are at the absolute root of the tree.
        // This will be the case for INBOX even if there is a namespace.
        if (isAtNamespaceRoot || path === box.displayName) {
          switch (box.displayName.toUpperCase()) {
            case 'DRAFT':
            case 'DRAFTS':
              type = 'drafts';
              break;
            case 'INBOX':
              // Inbox is special; the path needs to case-insensitively match.
              if (path.toUpperCase() === 'INBOX')
                type = 'inbox';
              break;
            // Yahoo provides "Bulk Mail" for yahoo.fr.
            case 'BULK MAIL':
            case 'JUNK':
            case 'SPAM':
              type = 'junk';
              break;
            case 'SENT':
              type = 'sent';
              break;
            case 'TRASH':
              type = 'trash';
              break;
            // This currently only exists for consistency with Thunderbird, but
            // may become useful in the future when we need an outbox.
            case 'UNSENT MESSAGES':
              type = 'queue';
              break;
          }
	}
      }

      if (!type)
        type = 'normal';
    }
    return type;
  },
  _syncFolderComputeDeltas: function(conn, callback, err, boxesRoot) {
    var self = this;
    if (err) {
      callback(err);
      return;
    }

    // - build a map of known existing folders
    var folderPubsByPath = {};
    var folderPub;
    for (var iFolder = 0; iFolder < this.folders.length; iFolder++) {
      folderPub = this.folders[iFolder];
      folderPubsByPath[folderPub.path] = folderPub;
    }

    // - walk the boxes
    function walkBoxes(boxLevel, pathSoFar, pathDepth, parentId) {
      for (var boxName in boxLevel) {
        var box = boxLevel[boxName], meta,
            path = pathSoFar ? (pathSoFar + boxName) : boxName,
            folderId;

        // - normalize jerk-moves
        var type = self._determineFolderType(box, path, conn);
        // gmail finds it amusing to give us the localized name/path of its
        // inbox, but still expects us to ask for it as INBOX.
        if (type === 'inbox')
          path = 'INBOX';

        // - already known folder
        if (folderPubsByPath.hasOwnProperty(path)) {
          // Because we speculatively create the Inbox, both its display name
          // and delimiter may be incorrect and need to be updated.
          meta = folderPubsByPath[path];
          meta.name = box.displayName;
          meta.delim = box.delim;

          // mark it with true to show that we've seen it.
          folderPubsByPath[path] = true;
        }
        // - new to us!
        else {
          meta = self._learnAboutFolder(box.displayName, path, parentId, type,
                                        box.delim, pathDepth);
        }

        if (box.children)
          walkBoxes(box.children, pathSoFar + boxName + box.delim,
                    pathDepth + 1, meta.id);
      }
    }
    walkBoxes(boxesRoot, '', 0, null);

    // - detect deleted folders
    // track dead folder id's so we can issue a
    var deadFolderIds = [];
    for (var folderPath in folderPubsByPath) {
      folderPub = folderPubsByPath[folderPath];
      // (skip those we found above)
      if (folderPub === true)
        continue;
      // Never delete our localdrafts folder.
      if (folderPub.type === 'localdrafts')
        continue;
      // It must have gotten deleted!
      this._forgetFolder(folderPub.id);
    }

    // Add a localdrafts folder if we don't have one.
    var localDrafts = this.getFirstFolderWithType('localdrafts');
    if (!localDrafts) {
      // Try and add the folder next to the existing drafts folder, or the
      // sent folder if there is no drafts folder.  Otherwise we must have an
      // inbox and we want to live under that.
      var sibling = this.getFirstFolderWithType('drafts') ||
                    this.getFirstFolderWithType('sent');
      var parentId = sibling ? sibling.parentId
                             : this.getFirstFolderWithType('inbox').id;
      // parentId will be null if we are already top-level
      var parentFolder;
      if (parentId) {
        parentFolder = this._folderInfos[parentId].$meta;
      }
      else {
        parentFolder = {
          path: '', delim: '', depth: -1
        };
      }
      var localDraftPath = parentFolder.path + parentFolder.delim +
            'localdrafts';
      // Since this is a synthetic folder; we just directly choose the name
      // that our l10n mapping will transform.
      this._learnAboutFolder('localdrafts', localDraftPath,  parentId,
                             'localdrafts', parentFolder.delim,
                             parentFolder.depth + 1);
    }

    callback(null);
  },

  /**
   * Asynchronously save the sent message to the sent folder, if applicable.
   * This should only be called once the SMTP send has completed.
   *
   * If non-gmail, append a bcc-including version of the message into the sent
   * folder.  For gmail, the SMTP server automatically copies the message into
   * the sent folder so we don't need to do this.
   *
   * There are several notable limitations with the current implementation:
   * - We do not write a copy of the message into the sent folder locally, so
   *   the message must be downloaded/synchronized for the user to see it.
   * - The operation to append the message does not get persisted to disk, so
   *   in the event the app crashes or is closed, a copy of the message will
   *   not end up in the sent folder.  This has always been the emergent
   *   phenomenon for IMAP, except previously we would persist the operation
   *   and then mark it moot at 'check' time.  Our new technique of not saving
   *   the operation is preferable for disk space reasons.  (NB: We could
   *   persist it, but the composite Blob we build would be flattened which
   *   could generate an I/O storm, cause temporary double-storage use, etc.)
   */
  saveSentMessage: function(composer) {
    // (gmail automatically copies the message into the sent folder; we don't
    // have to do anything)
    if (this.isGmail) {
      return;
    }

    composer.withMessageBlob({ includeBcc: true }, function(blob) {
      var message = {
        messageText: blob,
        // do not specify date; let the server use its own timestamping
        // since we want the approximate value of 'now' anyways.
        flags: ['Seen'],
      };

      var sentFolder = this.getFirstFolderWithType('sent');
      if (sentFolder) {
        this.universe.appendMessages(sentFolder.id,
                                     [message]);
      }
    }.bind(this));
  },

  shutdown: function(callback) {
    CompositeIncomingAccount.prototype.shutdownFolders.call(this);

    this._backoffEndpoint.shutdown();

    // - close all connections
    var liveConns = this._ownedConns.length;
    function connDead() {
      if (--liveConns === 0)
        callback();
    }
    for (var i = 0; i < this._ownedConns.length; i++) {
      var connInfo = this._ownedConns[i];
      if (callback) {
        connInfo.inUseBy = { deathback: connDead };
        try {
          connInfo.conn.logout();
        }
        catch (ex) {
          liveConns--;
        }
      }
      else {
        connInfo.conn.die();
      }
    }

    this._LOG.__die();
    if (!liveConns && callback)
      callback();
  },

  checkAccount: function(listener) {
    this._makeConnection(listener, null, 'check');
  },

  accountDeleted: function() {
    this._alive = false;
    this.shutdown();
  },


  //////////////////////////////////////////////////////////////////////////////

};

// XXX: Use mix.js when it lands in the streaming patch.
for (var k in properties) {
  Object.defineProperty(ImapAccount.prototype, k,
                        Object.getOwnPropertyDescriptor(properties, k));
}

// Share the log configuration with composite, since we desire general
// parity between IMAP and POP3 for simplicity when possible.
var LOGFAB = exports.LOGFAB = $log.register($module, {
  ImapAccount: incoming.LOGFAB_DEFINITION.CompositeIncomingAccount
});

}); // end define
;
/**
 * Remoted network API that tries to look like node.js's "net" API.  We are
 * expected/required to run in a worker thread where we don't have direct
 * access to mozTCPSocket so everything has to get remitted to the main thread.
 * Our counterpart is mailapi/worker-support/net-main.js
 *
 *
 * ## Sending lots of data: flow control, Blobs ##
 *
 * mozTCPSocket provides a flow-control mechanism (the return value to send
 * indicates whether we've crossed a buffering boundary and 'ondrain' tells us
 * when all buffered data has been sent), but does not yet support enqueueing
 * Blobs for processing (which is part of the proposed standard at
 * http://www.w3.org/2012/sysapps/raw-sockets/).  Also, the raw-sockets spec
 * calls for generating the 'drain' event once our buffered amount goes back
 * under the internal buffer target rather than waiting for it to hit zero like
 * mozTCPSocket.
 *
 * Our main desire right now for flow-control is to avoid using a lot of memory
 * and getting killed by the OOM-killer.  As such, flow control is not important
 * to us if we're just sending something that we're already keeping in memory.
 * The things that will kill us are giant things like attachments (or message
 * bodies we are quoting/repeating, potentially) that we are keeping as Blobs.
 *
 * As such, rather than echoing the flow-control mechanisms over to this worker
 * context, we just allow ourselves to write() a Blob and have the net-main.js
 * side take care of streaming the Blobs over the network.
 *
 * Note that successfully sending a lot of data may entail holding a wake-lock
 * to avoid having the network device we are using turned off in the middle of
 * our sending.  The network-connection abstraction is not currently directly
 * involved with the wake-lock management, but I could see it needing to beef up
 * its error inference in terms of timeouts/detecting disconnections so we can
 * avoid grabbing a wi-fi wake-lock, having our connection quietly die, and then
 * we keep holding the wi-fi wake-lock for much longer than we should.
 *
 * ## Supported API Surface ##
 *
 * We make sure to expose the following subset of the node.js API because we
 * have consumers that get upset if these do not exist:
 *
 * Attributes:
 * - encrypted (false, this is not the tls byproduct)
 * - destroyed
 *
 * Methods:
 * - setKeepAlive(Boolean)
 * - write(Buffer)
 * - end
 *
 * Events:
 * - "connect"
 * - "close"
 * - "end"
 * - "data"
 * - "error"
 **/
define('net',['require','exports','module','util','events','mailapi/worker-router'],function(require, exports, module) {

function debug(str) {
  //dump("NetSocket: (" + Date.now() + ") :" + str + "\n");
}

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    router = require('mailapi/worker-router');

var routerMaker = router.registerInstanceType('netsocket');

function NetSocket(port, host, crypto) {
  var cmdMap = {
    onopen: this._onconnect.bind(this),
    onerror: this._onerror.bind(this),
    ondata: this._ondata.bind(this),
    onclose: this._onclose.bind(this)
  };
  var routerInfo = routerMaker.register(function(data) {
    cmdMap[data.cmd](data.args);
  });
  this._sendMessage = routerInfo.sendMessage;
  this._unregisterWithRouter = routerInfo.unregister;

  var args = [host, port,
              {
                // Bug 784816 is changing useSSL into useSecureTransport for
                // spec compliance.  Use both during the transition period.
                useSSL: crypto, useSecureTransport: crypto,
                binaryType: 'arraybuffer'
              }];
  this._sendMessage('open', args);

  EventEmitter.call(this);

  this.destroyed = false;
}
exports.NetSocket = NetSocket;
util.inherits(NetSocket, EventEmitter);
NetSocket.prototype.setTimeout = function() {
};
NetSocket.prototype.setKeepAlive = function(shouldKeepAlive) {
};
// The semantics of node.js's socket.write does not take ownership and that's
// how our code uses it, so we can't use transferrables by default.  However,
// there is an optimization we want to perform related to Uint8Array.subarray().
//
// All the subarray does is create a view on the underlying buffer.  This is
// important and notable because the structured clone implementation for typed
// arrays and array buffers is *not* clever; it just serializes the entire
// underlying buffer and the typed array as a view on that.  (This does have
// the upside that you can transfer a whole bunch of typed arrays and only one
// copy of the buffer.)  The good news is that ArrayBuffer.slice() does create
// an entirely new copy of the buffer, so that works with our semantics and we
// can use that to transfer only what needs to be transferred.
NetSocket.prototype.write = function(u8array) {
  if (u8array instanceof Blob) {
    // We always send blobs in their entirety; you should slice the blob and
    // give us that if that's what you want.
    this._sendMessage('write', [u8array]);
    return;
  }

  var sendArgs;
  // Slice the underlying buffer and transfer it if the array is a subarray
  if (u8array.byteOffset !== 0 ||
      u8array.length !== u8array.buffer.byteLength) {
    var buf = u8array.buffer.slice(u8array.byteOffset,
                                   u8array.byteOffset + u8array.length);
    this._sendMessage('write',
                      [buf, 0, buf.byteLength],
                      [buf]);
  }
  else {
    this._sendMessage('write',
                      [u8array.buffer, u8array.byteOffset, u8array.length]);
  }
};
NetSocket.prototype.upgradeToSecure = function() {
  this._sendMessage('upgradeToSecure', []);
};
NetSocket.prototype.end = function() {
  if (this.destroyed)
    return;
  this._sendMessage('end');
  this.destroyed = true;
  this._unregisterWithRouter();
};

NetSocket.prototype._onconnect = function() {
  this.emit('connect');
};
NetSocket.prototype._onerror = function(err) {
  this.emit('error', err);
};
NetSocket.prototype._ondata = function(data) {
  var buffer = Buffer(data);
  this.emit('data', buffer);
};
NetSocket.prototype._onclose = function() {
  this.emit('close');
  this.emit('end');
};

exports.connect = function(port, host, crypto) {
  return new NetSocket(port, host, !!crypto);
};

}); // end define
;
define('pop3/transport',['exports'], function(exports) {

  /**
   * This file contains the following classes:
   *
   * - Pop3Parser: Parses incoming POP3 requests
   * - Pop3Protocol: Uses the Pop3Parser to match requests up with responses
   * - Request: Encapsulates a request to the server
   * - Response: Encapsulates a response from the server
   *
   * The Pop3Client (in pop3.js) hooks together a socket and an
   * instance of Pop3Protocol to form a complete client. See pop3.js
   * for a more detailed description of the hierarchy.
   */

  var setTimeout = window.setTimeout.bind(window);
  var clearTimeout = window.clearTimeout.bind(window);

  var MAX_LINE_LENGTH = 512; // per POP3 spec, including CRLF
  var CR = '\r'.charCodeAt(0);
  var LF = '\n'.charCodeAt(0);
  var PERIOD = '.'.charCodeAt(0);
  var PLUS = '+'.charCodeAt(0);
  var MINUS = '-'.charCodeAt(0);
  var SPACE = ' '.charCodeAt(0);

  var textEncoder = new TextEncoder('utf-8', { fatal: false });
  var textDecoder = new TextDecoder('utf-8', { fatal: false });

  function concatBuffers(a, b) {
    var buffer = new Uint8Array(a.byteLength + b.byteLength);
    buffer.set(a, 0);
    buffer.set(b, a.byteLength);
    return buffer;
  }

  /**
   * Pop3Parser receives binary data (presumably from a socket) and
   * parse it according to the POP3 spec:
   *
   *   var parser = new Pop3Parser();
   *   parser.push(myBinaryData);
   *   var rsp = parser.extractResponse(false);
   *   if (rsp) {
   *     // do something with the response
   *   }
   */
  function Pop3Parser() {
    this.buffer = new Uint8Array(0); // data not yet parsed into lines
    this.unprocessedLines = [];
  }

  /**
   * Add new data to be parsed. To actually parse the incoming data
   * (to see if there is enough data to extract a full response), call
   * `.extractResponse()`.
   *
   * @param {Uint8Array} data
   */
  Pop3Parser.prototype.push = function(data) {
    // append the data to be processed
    var buffer = this.buffer = concatBuffers(this.buffer, data);

    // pull out full lines
    for (var i = 0; i < buffer.length - 1; i++) {
      if (buffer[i] === CR && buffer[i + 1] === LF) {
        var end = i + 1;
        if (end > MAX_LINE_LENGTH) {
          // Sadly, servers do this, so we can't bail here.
        }
        this.unprocessedLines.push(buffer.slice(0, end + 1));
        buffer = this.buffer = buffer.slice(end + 1);
        i = -1;
      }
    }
  }

  /**
   * Attempt to parse and return a single message from the buffered
   * data. Since the POP3 protocol does not provide a foolproof way to
   * determine whether a given message is multiline without tracking
   * request state, you must specify whether or not the response is
   * expected to be multiline.
   *
   * Multiple responses may be available; you should call
   * `.extractResponse()` repeatedly until no more responses are
   * available. This method returns null if there was not enough data
   * to parse and return a response.
   *
   * @param {boolean} multiline true to parse a multiline response.
   * @return {Response|null}
   */
  Pop3Parser.prototype.extractResponse = function(multiline) {
    if (!this.unprocessedLines.length) {
      return null;
    }
    if (this.unprocessedLines[0][0] !== PLUS) {
      multiline = false; // Negative responses are never multiline.
    }
    if (!multiline) {
      return new Response([this.unprocessedLines.shift()], false);
    } else {
      var endLineIndex = -1;
      for (var i = 1; i < this.unprocessedLines.length; i++) {
        var line = this.unprocessedLines[i];
        if (line.byteLength === 3 &&
            line[0] === PERIOD && line[1] === CR && line[2] === LF) {
          endLineIndex = i;
          break;
        }
      }
      if (endLineIndex === -1) {
        return null;
      }
      var lines = this.unprocessedLines.splice(0, endLineIndex + 1);
      lines.pop(); // remove final ".\r\n" line
      // the first line cannot be stuffed (it's the command OK/ERR
      // response). Other lines may be period-stuffed.
      for (var i = 1; i < endLineIndex; i++) {
        if (lines[i][0] === PERIOD) {
          lines[i] = lines[i].slice(1);
        }
      }
      return new Response(lines, true);
    }
  }

  /**
   * Represent a POP3 response (both success and failure). You should
   * not have to instantiate this class directly; Pop3Parser returns
   * these objects from `Pop3Parser.extractResponse()`.
   *
   * @param {UInt8Array[]} lines
   * @param {boolean} isMultiline
   */
  function Response(lines, isMultiline) {
    this.lines = lines; // list of UInt8Arrays
    this.isMultiline = isMultiline;
    this.ok = (this.lines[0][0] === PLUS);
    this.err = !this.ok;
    this.request = null;
  }

  /**
   * Return the description text for the status line as a string.
   */
  Response.prototype.getStatusLine = function() {
    return this.getLineAsString(0).replace(/^(\+OK|-ERR) /, '');
  }

  /**
   * Return the line at `index` as a string.
   *
   * @param {int} index
   * @return {String}
   */
  Response.prototype.getLineAsString = function(index) {
    return textDecoder.decode(this.lines[index]);
  }

  /**
   * Return an array of strings, one for each line, including CRLFs.
   * If you want to parse the data from a response, use
   * `.getDataLines()`.
   *
   * @return {String[]}
   */
  Response.prototype.getLinesAsString = function() {
    var lines = [];
    for (var i = 0; i < this.lines.length; i++) {
      lines.push(this.getLineAsString(i));
    }
    return lines;
  }

  /**
   * Return an array of strings, _excluding_ CRLFs, starting from the
   * line after the +OK/-ERR line.
   */
  Response.prototype.getDataLines = function() {
    var lines = [];
    for (var i = 1; i < this.lines.length; i++) {
      var line = this.getLineAsString(i);
      lines.push(line.slice(0, line.length - 2)); // strip CRLF
    }
    return lines;
  }

  /**
   * Return the data portion of a multiline response as a string,
   * with the lines' CRLFs intact.
   */
  Response.prototype.getDataAsString = function() {
    var lines = [];
    for (var i = 1; i < this.lines.length; i++) {
      lines.push(this.getLineAsString(i));
    }
    return lines.join(''); // lines already have '\r\n'
  }

  /**
   * Return a string representation of the message, primarily for
   * debugging purposes.
   */
  Response.prototype.toString = function() {
    return this.getLinesAsString().join('\r\n');
  }

  /**
   * Represent a POP3 request, with enough data to allow the parser
   * to parse out a response and invoke a callback upon receiving a
   * response.
   *
   * @param {string} command The command, like RETR, USER, etc.
   * @param {string[]} args Arguments to the command, as an array.
   * @param {boolean} expectMultiline Whether or not the response will
   *                                  be multiline.
   * @param {function(err, rsp)} cb The callback to invoke when a
   *                                response is received.
   */
  function Request(command, args, expectMultiline, cb) {
    this.command = command;
    this.args = args;
    this.expectMultiline = expectMultiline;
    this.onresponse = cb || null;
  }

  exports.Request = Request;

  /**
   * Encode the request into a byte array suitable for transport over
   * a socket.
   */
  Request.prototype.toByteArray = function() {
    return textEncoder.encode(
      this.command + (this.args.length ? ' ' + this.args.join(' ') : '') + '\r\n');
  }

  /**
   * Trigger the response callback with '-ERR desc\r\n'.
   */
  Request.prototype._respondWithError = function(desc) {
    var rsp = new Response([textEncoder.encode(
      '-ERR ' + desc + '\r\n')], false);
    rsp.request = this;
    this.onresponse(rsp, null);
  }

  /**
   * Couple a POP3 parser with a request/response model, such that
   * you can easily hook Pop3Protocol up to a socket (or other
   * transport) to get proper request/response semantics.
   *
   * You must attach a handler to `.onsend`, which should fire data
   * across the wire. Similarly, you should call `.onreceive(data)` to
   * pass data back in from the socket.
   */
  function Pop3Protocol() {
    this.parser = new Pop3Parser();
    this.onsend = function(data) {
      throw new Error("You must implement Pop3Protocol.onsend to send data.");
    };
    this.unsentRequests = []; // if not pipelining, queue requests one at a time
    this.pipeline = false;
    this.pendingRequests = [];
    this.closed = false;
  }

  exports.Response = Response;
  exports.Pop3Protocol = Pop3Protocol;

  /**
   * Send a request to the server. Upon receiving a response, the
   * callback will be invoked, node-style, with an err or a response.
   * Negative replies (-ERR) are returned as an error to the callback;
   * positive replies (+OK) as a response. Socket errors are returned
   * as an error to the callback.
   *
   * @param {string} cmd The command like USER, RETR, etc.
   * @param {string[]} args An array of arguments to the command.
   * @param {boolean} expectMultiline Whether or not the response will
   *                                  be multiline.
   * @param {function(err, rsp)} cb The callback to invoke upon
   *                                receipt of a response.
   */
  Pop3Protocol.prototype.sendRequest = function(
    cmd, args, expectMultiline, cb) {
    var req;
    if (cmd instanceof Request) {
      req = cmd;
    } else {
      req = new Request(cmd, args, expectMultiline, cb);
    }

    if (this.closed) {
      req._respondWithError('(request sent after connection closed)');
      return;
    }

    if (this.pipeline || this.pendingRequests.length === 0) {
      this.onsend(req.toByteArray());
      this.pendingRequests.push(req);
    } else {
      this.unsentRequests.push(req);
    }
  }

  /**
   * Call this function to send received data to the parser. This
   * method automatically calls the appropriate response callback for
   * its respective request.
   */
  Pop3Protocol.prototype.onreceive = function(data) {
    this.parser.push(data);

    var response;
    while (true) {
      var req = this.pendingRequests[0];
      response = this.parser.extractResponse(req && req.expectMultiline);
      if (!response) {
        break;
      } else if (!req) {
        // It's unclear how to handle this in the most nondestructive way;
        // if we receive an unsolicited response, something has gone horribly
        // wrong, and it's unlikely that we'll be able to recover.
        console.error('Unsolicited response from server: ' + response);
        break;
      }
      response.request = req;
      this.pendingRequests.shift();
      if (this.unsentRequests.length) {
        this.sendRequest(this.unsentRequests.shift());
      }
      if (req.onresponse) {
        if (response.err) {
          req.onresponse(response, null);
        } else {
          req.onresponse(null, response);
        }
      }
    }
  }

  /**
   * Call this function when the socket attached to this protocol is
   * closed. Any current requests that have been enqueued but not yet
   * responded to will be sent a dummy "-ERR" response, indicating
   * that the underlying connection closed without actually
   * responding. This avoids the case where we hang if we never
   * receive a response from the server.
   */
  Pop3Protocol.prototype.onclose = function() {
    this.closed = true;
    var requestsToRespond = this.pendingRequests.concat(this.unsentRequests);
    this.pendingRequests = [];
    this.unsentRequests = [];
    for (var i = 0; i < requestsToRespond.length; i++) {
      var req = requestsToRespond[i];
      req._respondWithError('(connection closed, no response)');
    }
  }
});

define('mailparser/datetime',['require','exports','module'],function (require, exports, module) {
/* 
 * More info at: http://phpjs.org
 * 
 * This is version: 3.18
 * php.js is copyright 2010 Kevin van Zonneveld.
 * 
 * Portions copyright Brett Zamir (http://brett-zamir.me), Kevin van Zonneveld
 * (http://kevin.vanzonneveld.net), Onno Marsman, Theriault, Michael White
 * (http://getsprink.com), Waldo Malqui Silva, Paulo Freitas, Jonas Raoni
 * Soares Silva (http://www.jsfromhell.com), Jack, Philip Peterson, Ates Goral
 * (http://magnetiq.com), Legaev Andrey, Ratheous, Alex, Martijn Wieringa,
 * Nate, lmeyrick (https://sourceforge.net/projects/bcmath-js/), Philippe
 * Baumann, Enrique Gonzalez, Webtoolkit.info (http://www.webtoolkit.info/),
 * Ash Searle (http://hexmen.com/blog/), travc, Jani Hartikainen, Carlos R. L.
 * Rodrigues (http://www.jsfromhell.com), Ole Vrijenhoek, WebDevHobo
 * (http://webdevhobo.blogspot.com/), T.Wild,
 * http://stackoverflow.com/questions/57803/how-to-convert-decimal-to-hex-in-javascript,
 * pilus, GeekFG (http://geekfg.blogspot.com), Rafał Kukawski
 * (http://blog.kukawski.pl), Johnny Mast (http://www.phpvrouwen.nl), Michael
 * Grier, Erkekjetter, d3x, marrtins, Andrea Giammarchi
 * (http://webreflection.blogspot.com), stag019, mdsjack
 * (http://www.mdsjack.bo.it), Chris, Steven Levithan
 * (http://blog.stevenlevithan.com), Arpad Ray (mailto:arpad@php.net), David,
 * Joris, Tim de Koning (http://www.kingsquare.nl), Marc Palau, Michael White,
 * Public Domain (http://www.json.org/json2.js), gettimeofday, felix, Aman
 * Gupta, Pellentesque Malesuada, Thunder.m, Tyler Akins (http://rumkin.com),
 * Karol Kowalski, Felix Geisendoerfer (http://www.debuggable.com/felix),
 * Alfonso Jimenez (http://www.alfonsojimenez.com), Diplom@t
 * (http://difane.com/), majak, Mirek Slugen, Mailfaker
 * (http://www.weedem.fr/), Breaking Par Consulting Inc
 * (http://www.breakingpar.com/bkp/home.nsf/0/87256B280015193F87256CFB006C45F7),
 * Josh Fraser
 * (http://onlineaspect.com/2007/06/08/auto-detect-a-time-zone-with-javascript/),
 * Martin (http://www.erlenwiese.de/), Paul Smith, KELAN, Robin, saulius, AJ,
 * Oleg Eremeev, Steve Hilder, gorthaur, Kankrelune
 * (http://www.webfaktory.info/), Caio Ariede (http://caioariede.com), Lars
 * Fischer, Sakimori, Imgen Tata (http://www.myipdf.com/), uestla, Artur
 * Tchernychev, Wagner B. Soares, Christoph, nord_ua, class_exists, Der Simon
 * (http://innerdom.sourceforge.net/), echo is bad, XoraX
 * (http://www.xorax.info), Ozh, Alan C, Taras Bogach, Brad Touesnard, MeEtc
 * (http://yass.meetcweb.com), Peter-Paul Koch
 * (http://www.quirksmode.org/js/beat.html), T0bsn, Tim Wiel, Bryan Elliott,
 * jpfle, JT, Thomas Beaucourt (http://www.webapp.fr), David Randall, Frank
 * Forte, Eugene Bulkin (http://doubleaw.com/), noname, kenneth, Hyam Singer
 * (http://www.impact-computing.com/), Marco, Raphael (Ao RUDLER), Ole
 * Vrijenhoek (http://www.nervous.nl/), David James, Steve Clay, Jason Wong
 * (http://carrot.org/), T. Wild, Paul, J A R, LH, strcasecmp, strcmp, JB,
 * Daniel Esteban, strftime, madipta, Valentina De Rosa, Marc Jansen,
 * Francesco, Stoyan Kyosev (http://www.svest.org/), metjay, Soren Hansen,
 * 0m3r, Sanjoy Roy, Shingo, sankai, sowberry, hitwork, Rob, Norman "zEh"
 * Fuchs, Subhasis Deb, josh, Yves Sucaet, Ulrich, Scott Baker, ejsanders,
 * Nick Callen, Steven Levithan (stevenlevithan.com), Aidan Lister
 * (http://aidanlister.com/), Philippe Jausions
 * (http://pear.php.net/user/jausions), Zahlii, Denny Wardhana, Oskar Larsson
 * Högfeldt (http://oskar-lh.name/), Brian Tafoya
 * (http://www.premasolutions.com/), johnrembo, Gilbert, duncan, Thiago Mata
 * (http://thiagomata.blog.com), Alexander Ermolaev
 * (http://snippets.dzone.com/user/AlexanderErmolaev), Linuxworld, lmeyrick
 * (https://sourceforge.net/projects/bcmath-js/this.), Jon Hohle, Pyerre,
 * merabi, Saulo Vallory, HKM, ChaosNo1, djmix, Lincoln Ramsay, Adam Wallner
 * (http://web2.bitbaro.hu/), paulo kuong, jmweb, Orlando, kilops, dptr1988,
 * DxGx, Pedro Tainha (http://www.pedrotainha.com), Bayron Guevara, Le Torbi,
 * James, Douglas Crockford (http://javascript.crockford.com), Devan
 * Penner-Woelk, Jay Klehr, Kheang Hok Chin (http://www.distantia.ca/), Luke
 * Smith (http://lucassmith.name), Rival, Amir Habibi
 * (http://www.residence-mixte.com/), Blues (http://tech.bluesmoon.info/), Ben
 * Bryan, booeyOH, Dreamer, Cagri Ekin, Diogo Resende, Howard Yeend, Pul,
 * 3D-GRAF, jakes, Yannoo, Luke Godfrey, daniel airton wermann
 * (http://wermann.com.br), Allan Jensen (http://www.winternet.no), Benjamin
 * Lupton, davook, Atli Þór, Maximusya, Leslie Hoare, Bug?, setcookie, YUI
 * Library: http://developer.yahoo.com/yui/docs/YAHOO.util.DateLocale.html,
 * Blues at http://hacks.bluesmoon.info/strftime/strftime.js, Andreas,
 * Michael, Christian Doebler, Gabriel Paderni, Marco van Oort, Philipp
 * Lenssen, Arnout Kazemier (http://www.3rd-Eden.com), penutbutterjelly, Anton
 * Ongson, DtTvB (http://dt.in.th/2008-09-16.string-length-in-bytes.html),
 * meo, Greenseed, Yen-Wei Liu, mk.keck, William, rem, Jamie Beck
 * (http://www.terabit.ca/), Russell Walker (http://www.nbill.co.uk/),
 * Garagoth, Dino, Andrej Pavlovic, gabriel paderni, FGFEmperor, Scott Cariss,
 * Slawomir Kaniecki, ReverseSyntax, Mateusz "loonquawl" Zalega, Francois,
 * Kirk Strobeck, Billy, vlado houba, Jalal Berrami, date, Itsacon
 * (http://www.itsacon.net/), Martin Pool, Pierre-Luc Paour, ger, john
 * (http://www.jd-tech.net), mktime, Simon Willison
 * (http://simonwillison.net), Nick Kolosov (http://sammy.ru), marc andreu,
 * Arno, Nathan, Kristof Coomans (SCK-CEN Belgian Nucleair Research Centre),
 * Fox, nobbler, stensi, Matteo, Riddler (http://www.frontierwebdev.com/),
 * Tomasz Wesolowski, T.J. Leahy, rezna, Eric Nagel, Alexander M Beedie, baris
 * ozdil, Greg Frazier, Bobby Drake, Ryan W Tenney (http://ryan.10e.us), Tod
 * Gentille, Rafał Kukawski, FremyCompany, Manish, Cord, fearphage
 * (http://http/my.opera.com/fearphage/), Victor, Brant Messenger
 * (http://www.brantmessenger.com/), Matt Bradley, Luis Salazar
 * (http://www.freaky-media.com/), Tim de Koning, taith, Rick Waldron, Mick@el
 * 
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL KEVIN VAN ZONNEVELD BE LIABLE FOR ANY CLAIM, DAMAGES
 * OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */ 
this.strtotime = function(str, now) {
    // http://kevin.vanzonneveld.net
    // +   original by: Caio Ariede (http://caioariede.com)
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +      input by: David
    // +   improved by: Caio Ariede (http://caioariede.com)
    // +   improved by: Brett Zamir (http://brett-zamir.me)
    // +   bugfixed by: Wagner B. Soares
    // +   bugfixed by: Artur Tchernychev
    // %        note 1: Examples all have a fixed timestamp to prevent tests to fail because of variable time(zones)
    // *     example 1: strtotime('+1 day', 1129633200);
    // *     returns 1: 1129719600
    // *     example 2: strtotime('+1 week 2 days 4 hours 2 seconds', 1129633200);
    // *     returns 2: 1130425202
    // *     example 3: strtotime('last month', 1129633200);
    // *     returns 3: 1127041200
    // *     example 4: strtotime('2009-05-04 08:30:00');
    // *     returns 4: 1241418600
 
    var i, match, s, strTmp = '', parse = '';

    strTmp = str;
    strTmp = strTmp.replace(/\s{2,}|^\s|\s$/g, ' '); // unecessary spaces
    strTmp = strTmp.replace(/[\t\r\n]/g, ''); // unecessary chars

    if (strTmp == 'now') {
        return (new Date()).getTime()/1000; // Return seconds, not milli-seconds
    } else if (!isNaN(parse = Date.parse(strTmp))) {
        return (parse/1000);
    } else if (now) {
        now = new Date(now*1000); // Accept PHP-style seconds
    } else {
        now = new Date();
    }

    strTmp = strTmp.toLowerCase();

    var __is =
    {
        day:
        {
            'sun': 0,
            'mon': 1,
            'tue': 2,
            'wed': 3,
            'thu': 4,
            'fri': 5,
            'sat': 6
        },
        mon:
        {
            'jan': 0,
            'feb': 1,
            'mar': 2,
            'apr': 3,
            'may': 4,
            'jun': 5,
            'jul': 6,
            'aug': 7,
            'sep': 8,
            'oct': 9,
            'nov': 10,
            'dec': 11
        }
    };

    var process = function (m) {
        var ago = (m[2] && m[2] == 'ago');
        var num = (num = m[0] == 'last' ? -1 : 1) * (ago ? -1 : 1);

        switch (m[0]) {
            case 'last':
            case 'next':
                switch (m[1].substring(0, 3)) {
                    case 'yea':
                        now.setFullYear(now.getFullYear() + num);
                        break;
                    case 'mon':
                        now.setMonth(now.getMonth() + num);
                        break;
                    case 'wee':
                        now.setDate(now.getDate() + (num * 7));
                        break;
                    case 'day':
                        now.setDate(now.getDate() + num);
                        break;
                    case 'hou':
                        now.setHours(now.getHours() + num);
                        break;
                    case 'min':
                        now.setMinutes(now.getMinutes() + num);
                        break;
                    case 'sec':
                        now.setSeconds(now.getSeconds() + num);
                        break;
                    default:
                        var day;
                        if (typeof (day = __is.day[m[1].substring(0, 3)]) != 'undefined') {
                            var diff = day - now.getDay();
                            if (diff == 0) {
                                diff = 7 * num;
                            } else if (diff > 0) {
                                if (m[0] == 'last') {diff -= 7;}
                            } else {
                                if (m[0] == 'next') {diff += 7;}
                            }
                            now.setDate(now.getDate() + diff);
                        }
                }
                break;

            default:
                if (/\d+/.test(m[0])) {
                    num *= parseInt(m[0], 10);

                    switch (m[1].substring(0, 3)) {
                        case 'yea':
                            now.setFullYear(now.getFullYear() + num);
                            break;
                        case 'mon':
                            now.setMonth(now.getMonth() + num);
                            break;
                        case 'wee':
                            now.setDate(now.getDate() + (num * 7));
                            break;
                        case 'day':
                            now.setDate(now.getDate() + num);
                            break;
                        case 'hou':
                            now.setHours(now.getHours() + num);
                            break;
                        case 'min':
                            now.setMinutes(now.getMinutes() + num);
                            break;
                        case 'sec':
                            now.setSeconds(now.getSeconds() + num);
                            break;
                    }
                } else {
                    return false;
                }
                break;
        }
        return true;
    };

    match = strTmp.match(/^(\d{2,4}-\d{2}-\d{2})(?:\s(\d{1,2}:\d{2}(:\d{2})?)?(?:\.(\d+))?)?$/);
    if (match != null) {
        if (!match[2]) {
            match[2] = '00:00:00';
        } else if (!match[3]) {
            match[2] += ':00';
        }

        s = match[1].split(/-/g);

        for (i in __is.mon) {
            if (__is.mon[i] == s[1] - 1) {
                s[1] = i;
            }
        }
        s[0] = parseInt(s[0], 10);

        s[0] = (s[0] >= 0 && s[0] <= 69) ? '20'+(s[0] < 10 ? '0'+s[0] : s[0]+'') : (s[0] >= 70 && s[0] <= 99) ? '19'+s[0] : s[0]+'';
        return parseInt(this.strtotime(s[2] + ' ' + s[1] + ' ' + s[0] + ' ' + match[2])+(match[4] ? match[4]/1000 : ''), 10);
    }

    var regex = '([+-]?\\d+\\s'+
        '(years?|months?|weeks?|days?|hours?|min|minutes?|sec|seconds?'+
        '|sun\\.?|sunday|mon\\.?|monday|tue\\.?|tuesday|wed\\.?|wednesday'+
        '|thu\\.?|thursday|fri\\.?|friday|sat\\.?|saturday)'+
        '|(last|next)\\s'+
        '(years?|months?|weeks?|days?|hours?|min|minutes?|sec|seconds?'+
        '|sun\\.?|sunday|mon\\.?|monday|tue\\.?|tuesday|wed\\.?|wednesday'+
        '|thu\\.?|thursday|fri\\.?|friday|sat\\.?|saturday))'+
        '(\\sago)?';

    match = strTmp.match(new RegExp(regex, 'gi')); // Brett: seems should be case insensitive per docs, so added 'i'
    if (match == null) {
        return false;
    }

    for (i = 0; i < match.length; i++) {
        if (!process(match[i].split(' '))) {
            return false;
        }
    }

    return (now.getTime()/1000);
}
});
define('mailparser/streams',['require','exports','module','stream','util','mimelib','encoding','crypto'],function (require, exports, module) {
var Stream = require('stream').Stream,
    utillib = require('util'),
    mimelib = require('mimelib'),
    encodinglib = require('encoding'),
    crypto = require('crypto');

module.exports.Base64Stream = Base64Stream;
module.exports.QPStream = QPStream;
module.exports.BinaryStream = BinaryStream;

function Base64Stream(){
    Stream.call(this);
    this.writable = true;
    
    this.checksum = crypto.createHash("md5");
    this.length = 0;
    
    this.current = "";
}
utillib.inherits(Base64Stream, Stream);

Base64Stream.prototype.write = function(data){
    this.handleInput(data);
    return true;
};

Base64Stream.prototype.end = function(data){
    this.handleInput(data);
    this.emit("end");
    return {
        length: this.length,
        checksum: this.checksum.digest("hex")
    };
};

Base64Stream.prototype.handleInput = function(data){
    if(!data || !data.length){
        return;
    }
    
    data = (data || "").toString("utf-8");
    
    var remainder = 0;
    this.current += data.replace(/[^\w\+\/=]/g,'');
    var buffer = new Buffer(this.current.substr(0, this.current.length - this.current.length % 4),"base64");
    if(buffer.length){
        this.length += buffer.length;
        this.checksum.update(buffer);
        this.emit("data", buffer);
    }
    this.current = (remainder=this.current.length % 4)?this.current.substr(- remainder):"";
};

function QPStream(charset){
    Stream.call(this);
    this.writable = true;
    
    this.checksum = crypto.createHash("md5");
    this.length = 0;
    
    this.charset = charset || "UTF-8";
    this.current = undefined;
}
utillib.inherits(QPStream, Stream);

QPStream.prototype.write = function(data){
    this.handleInput(data);
    return true;
};

QPStream.prototype.end = function(data){
    this.handleInput(data);
    this.flush();
    this.emit("end");
    return {
        length: this.length,
        checksum: this.checksum.digest("hex")
    };
};

QPStream.prototype.handleInput = function(data){
    if(!data || !data.length){
        return;
    }
    
    data = (data || "").toString("utf-8");
    if(data.match(/^\r\n/)){
        data = data.substr(2);
    }
    
    if(typeof this.current !="string"){
        this.current = data;
    }else{
        this.current += "\r\n" + data;
    }
};

QPStream.prototype.flush = function(){
    var buffer = mimelib.decodeQuotedPrintable(this.current, false, this.charset);

    if(this.charset.toLowerCase() == "binary"){
        // do nothing
    }else if(this.charset.toLowerCase() != "utf-8"){
        buffer = encodinglib.convert(buffer, "utf-8", this.charset);
    }else{
        buffer = new Buffer(buffer, "utf-8");
    }

    this.length += buffer.length;
    this.checksum.update(buffer);
    
    this.emit("data", buffer);
};

function BinaryStream(charset){
    Stream.call(this);
    this.writable = true;
    
    this.checksum = crypto.createHash("md5");
    this.length = 0;
    
    this.charset = charset || "UTF-8";
    this.current = "";
}
utillib.inherits(BinaryStream, Stream);

BinaryStream.prototype.write = function(data){
    if(data && data.length){
        this.length += data.length;
        this.checksum.update(data);
        this.emit("data", data);
    }
    return true;
};

BinaryStream.prototype.end = function(data){
    if(data && data.length){
        this.emit("data", data);
    }
    this.emit("end");
    return {
        length: this.length,
        checksum: this.checksum.digest("hex")
    };
};
});
define('mailparser/mailparser',['require','exports','module','stream','util','mimelib','./datetime','encoding','./streams','crypto'],function (require, exports, module) {

/**
 * @fileOverview This is the main file for the MailParser library to parse raw e-mail data
 * @author <a href="mailto:andris@node.ee">Andris Reinman</a>
 * @version 0.2.23
 */

var Stream = require('stream').Stream,
    utillib = require('util'),
    mimelib = require('mimelib'),
    datetime = require('./datetime'),
    encodinglib = require('encoding'),
    Streams = require('./streams'),
    crypto = require('crypto');

// Expose to the world
module.exports.MailParser = MailParser;

// MailParser is a FSM - it is always in one of the possible states
var STATES = {
    header:   0x1,
    body:     0x2,
    finished: 0x3
};

/**
 * <p>Creates instance of MailParser which in turn extends Stream</p>
 *
 * <p>Options object has the following properties:</p>
 *
 * <ul>
 *   <li><b>debug</b> - if set to true print all incoming lines to decodeq</li>
 *   <li><b>streamAttachments</b> - if set to true, stream attachments instead of including them</li>
 *   <li><b>unescapeSMTP</b> - if set to true replace double dots in the beginning of the file</li>
 *   <li><b>defaultCharset</b> - the default charset for text/plain, text/html content, if not set reverts to Latin-1
 *   <li><b>showAttachmentLinks</b></li> - if set to true, show inlined attachment links
 * </ul>
 *
 * @constructor
 * @param {Object} [options] Optional options object
 */
function MailParser(options){

    // Make MailParser a Stream object
    Stream.call(this);
    this.writable = true;

    /**
     * Options object
     * @public  */ this.options = options || {};

    /**
     * Indicates current state the parser is in
     * @private */ this._state         = STATES.header;

    /**
     * The remaining data from the previos chunk which is waiting to be processed
     * @private */ this._remainder     = "";

    /**
     * The complete tree structure of the e-mail
     * @public  */ this.mimeTree       = this._createMimeNode();

    /**
     * Current node of the multipart mime tree that is being processed
     * @private */ this._currentNode   = this.mimeTree;

    // default values for the root node
    this._currentNode.priority = "normal";

    /**
     * An object of already used attachment filenames
     * @private */ this._fileNames     = {};

    /**
     * An array of multipart nodes
     * @private */ this._multipartTree = [];


    /**
     * This is the final mail structure object that is returned to the client
     * @public  */ this.mailData       = {};

    /**
     * Line counter for debugging
     * @private */ this._lineCounter   = 0;

    /**
     * Did the last chunk end with \r
     * @private */ this._lineFeed      = false;

   /**
     * Is the "headers" event already emitted
     * @private */ this._headersSent   = false;
}
// inherit methods and properties of Stream
utillib.inherits(MailParser, Stream);

/**
 * <p>Writes a value to the MailParser stream<p>
 *
 * @param {Buffer|String} chunk The data to be written to the MailParser stream
 * @param {String} [encoding] The encoding to be used when "chunk" is a string
 * @returns {Boolean} Returns true
 */
MailParser.prototype.write = function(chunk, encoding){
    if( this._write(chunk, encoding) ){
        process.nextTick(this._process.bind(this));
    }
    return true;
};

/**
 * <p>Terminates the MailParser stream</p>
 *
 * <p>If "chunk" is set, writes it to the Stream before terminating.</p>
 *
 * @param {Buffer|String} chunk The data to be written to the MailParser stream
 * @param {String} [encoding] The encoding to be used when "chunk" is a string
 */
MailParser.prototype.end = function(chunk, encoding){
    this._write(chunk, encoding);

    if(this.options.debug && this._remainder){
        console.log("REMAINDER: "+this._remainder);
    }

    process.nextTick(this._process.bind(this, true));
};

/**
 * <p>Normalizes CRLF's before writing to the Mailparser stream, does <i>not</i> call `_process`<p>
 *
 * @param {Buffer|String} chunk The data to be written to the MailParser stream
 * @param {String} [encoding] The encoding to be used when "chunk" is a string
 * @returns {Boolean} Returns true if writing the chunk was successful
 */
MailParser.prototype._write = function(chunk, encoding){
    if(typeof chunk == "string"){
        chunk = new Buffer(chunk, encoding);
    }

    chunk = chunk && chunk.toString("binary") || "";

    // if the last chunk ended with \r and this one begins
    // with \n, it's a split line ending. Since the last \r
    // was already used, skip the \n
    if(this._lineFeed && chunk.charAt(0) === "\n"){
        chunk = chunk.substr(1);
    }
    this._lineFeed = chunk.substr(-1) === "\r";

    if(chunk && chunk.length){
        this._remainder += chunk;
        return true;
    }
    return false;
};


/**
 * <p>Processes the data written to the MailParser stream</p>
 *
 * <p>The data is split into lines and each line is processed individually. Last
 * line in the batch is preserved as a remainder since it is probably not a
 * complete line but just the beginning of it. The remainder is later prepended
 * to the next batch of data.</p>
 *
 * @param {Boolean} [finalPart=false] if set to true indicates that this is the last part of the stream
 */
MailParser.prototype._process = function(finalPart){

    finalPart = !!finalPart;

    var lines = this._remainder.split(/\r?\n|\r/),
        line, i, len;

    if(!finalPart){
        this._remainder = lines.pop();
        // force line to 1MB chunks if needed
        if(this._remainder.length>1048576){
            this._remainder = this._remainder.replace(/(.{1048576}(?!\r?\n|\r))/g,"$&\n");
        }
    }

    for(i=0, len=lines.length; i < len; i++){
        line = lines[i];

        if(this.options.unescapeSMTP && line.substr(0,2)==".."){
            line = line.substr(1);
        }

        if(this.options.debug){
            console.log("LINE " + (++this._lineCounter) + " ("+this._state+"): "+line);
        }

        if(this._state == STATES.header){
            if(this._processStateHeader(line) === true){
                continue;
            }
        }

        if(this._state == STATES.body){

            if(this._processStateBody(line) === true){
                continue;
            }

        }
    }

    if(finalPart){
        if(this._state == STATES.header && this._remainder){
            this._processStateHeader(this._remainder);
            if(!this._headersSent){
                this.emit("headers", this._currentNode.parsedHeaders);
                this._headersSent = true;
            }
        }
        if(this._currentNode.content || this._currentNode.stream){
            this._finalizeContents();
        }
        this._state = STATES.finished;
        process.nextTick(this._processMimeTree.bind(this));
    }


};

/**
 * <p>Processes a line while in header state</p>
 *
 * <p>If header state ends and body starts, detect if the contents is an attachment
 * and create a stream for it if needed</p>
 *
 * @param {String} line The contents of a line to be processed
 * @returns {Boolean} If state changes to body retuns true
 */
MailParser.prototype._processStateHeader = function(line){
    var boundary, i, len, attachment,
        lastPos = this._currentNode.headers.length - 1,
        textContent = false, extension;

    // Check if the header ends and body starts
    if(!line.length){
        if(lastPos>=0){
            this._processHeaderLine(lastPos);
        }
        if(!this._headersSent){
            this.emit("headers", this._currentNode.parsedHeaders);
            this._headersSent = true;
        }

        this._state = STATES.body;

        // if there's unprocessed header data, do it now
        if(lastPos >= 0){
            this._processHeaderLine(lastPos);
        }

        // this is a very simple e-mail, no content type set
        if(!this._currentNode.parentNode && !this._currentNode.meta.contentType){
            this._currentNode.meta.contentType = "text/plain";
        }

        textContent = ["text/plain", "text/html"].indexOf(this._currentNode.meta.contentType || "") >= 0;

        // detect if this is an attachment or a text node (some agents use inline dispositions for text)
        if(textContent && (!this._currentNode.meta.contentDisposition || this._currentNode.meta.contentDisposition == "inline")){
            this._currentNode.attachment = false;
        }else if((!textContent || ["attachment", "inline"].indexOf(this._currentNode.meta.contentDisposition)>=0) &&
          !this._currentNode.meta.mimeMultipart){
            this._currentNode.attachment = true;
        }

        // handle attachment start
        if(this._currentNode.attachment){

            this._currentNode.checksum = crypto.createHash("md5");

            this._currentNode.meta.generatedFileName = this._generateFileName(this._currentNode.meta.fileName, this._currentNode.meta.contentType);

            extension = this._currentNode.meta.generatedFileName.split(".").pop().toLowerCase();

            // Update content-type if it's an application/octet-stream and file extension is available
            if(this._currentNode.meta.contentType == "application/octet-stream" && mimelib.contentTypes[extension]){
                this._currentNode.meta.contentType = mimelib.contentTypes[extension];
            }

            attachment = this._currentNode.meta;
            if(this.options.streamAttachments){
                if(this._currentNode.meta.transferEncoding == "base64"){
                    this._currentNode.stream = new Streams.Base64Stream();
                }else if(this._currentNode.meta.transferEncoding == "quoted-printable"){
                    this._currentNode.stream = new Streams.QPStream("binary");
                }else{
                    this._currentNode.stream = new Streams.BinaryStream();
                }
                attachment.stream = this._currentNode.stream;

                this.emit("attachment", attachment);
            }else{
                this._currentNode.content = undefined;
            }
        }

        return true;
    }

    // unfold header lines if needed
    if(line.match(/^\s+/) && lastPos>=0){
        this._currentNode.headers[lastPos] += " " + line.trim();
    }else{
        this._currentNode.headers.push(line.trim());
        if(lastPos>=0){
            // if a complete header line is received, process it
            this._processHeaderLine(lastPos);
        }
    }

    return false;
};

/**
 * <p>Processes a line while in body state</p>
 *
 * @param {String} line The contents of a line to be processed
 * @returns {Boolean} If body ends return true
 */
MailParser.prototype._processStateBody = function(line){
    var i, len, node,
        nodeReady = false;

    // Handle multipart boundaries
    if(line.substr(0, 2) == "--"){
        for(i=0, len = this._multipartTree.length; i<len; i++){

            // check if a new element block starts
            if(line == "--" + this._multipartTree[i].boundary){

                if(this._currentNode.content || this._currentNode.stream){
                    this._finalizeContents();
                }

                node = this._createMimeNode(this._multipartTree[i].node);
                this._multipartTree[i].node.childNodes.push(node);
                this._currentNode = node;
                this._state = STATES.header;
                nodeReady = true;
                break;
            }else
            // check if a multipart block ends
              if(line == "--" + this._multipartTree[i].boundary + "--"){

                if(this._currentNode.content || this._currentNode.stream){
                    this._finalizeContents();
                }

                if(this._multipartTree[i].node.parentNode){
                    this._currentNode = this._multipartTree[i].node.parentNode;
                }else{
                    this._currentNode = this._multipartTree[i].node;
                }
                this._state = STATES.body;
                nodeReady = true;
                break;
            }
        }
    }
    if(nodeReady){
        return true;
    }

    // handle text or attachment line
    if(["text/plain", "text/html"].indexOf(this._currentNode.meta.contentType || "")>=0 &&
      !this._currentNode.attachment){
        this._handleTextLine(line);
    }else if(this._currentNode.attachment){
        this._handleAttachmentLine(line);
    }

    return false;
};

/**
 * <p>Processes a complete unfolded header line</p>
 *
 * <p>Processes a line from current node headers array and replaces its value.
 * Input string is in the form of "X-Mailer: PHP" and its replacement would be
 * an object <code>{key: "x-mailer", value: "PHP"}</code></p>
 *
 * <p>Additionally node meta object will be filled also, for example with data from
 * To: From: Cc: etc fields.</p>
 *
 * @param {Number} pos Which header element (from an header lines array) should be processed
 */
MailParser.prototype._processHeaderLine = function(pos){
    var key, value, parts, line;

    pos = pos || 0;

    if(!(line = this._currentNode.headers[pos]) || typeof line != "string"){
        return;
    }

    parts = line.split(":");

    key = parts.shift().toLowerCase().trim();
    value = parts.join(":").trim();

    switch(key){
        case "content-type":
            this._parseContentType(value);
            break;
        case "mime-version":
            this._currentNode.useMIME = true;
            break;
        case "date":
            this._currentNode.meta.date = new Date(datetime.strtotime(value)*1000 || Date.now());
            break;
        case "to":
            if(this._currentNode.to && this._currentNode.to.length){
                this._currentNode.to = this._currentNode.to.concat(mimelib.parseAddresses(value));
            }else{
                this._currentNode.to = mimelib.parseAddresses(value);
            }
            break;
        case "from":
            if(this._currentNode.from && this._currentNode.from.length){
                this._currentNode.from = this._currentNode.from.concat(mimelib.parseAddresses(value));
            }else{
                this._currentNode.from = mimelib.parseAddresses(value);
            }
            break;
        case "cc":
            if(this._currentNode.cc && this._currentNode.cc.length){
                this._currentNode.cc = this._currentNode.cc.concat(mimelib.parseAddresses(value));
            }else{
                this._currentNode.cc = mimelib.parseAddresses(value);
            }
            break;
        case "bcc":
            if(this._currentNode.bcc && this._currentNode.bcc.length){
                this._currentNode.bcc = this._currentNode.bcc.concat(mimelib.parseAddresses(value));
            }else{
                this._currentNode.bcc = mimelib.parseAddresses(value);
            }
            break;
        case "x-priority":
        case "x-msmail-priority":
        case "importance":
            value = this._parsePriority(value);
            this._currentNode.priority = value;
            break;
        case "message-id":
            this._currentNode.meta.messageId = this._trimQuotes(value);
            break;
        case "references":
            this._parseReferences(value);
            break;
        case "in-reply-to":
            this._parseInReplyTo(value);
            break;
        case "thread-index":
            this._currentNode.meta.threadIndex = value;
            break;
        case "content-transfer-encoding":
            this._currentNode.meta.transferEncoding = value.toLowerCase();
            break;
        case "subject":
            this._currentNode.subject = this._encodeString(value);
            break;
        case "content-disposition":
            this._parseContentDisposition(value);
            break;
        case "content-id":
            this._currentNode.meta.contentId = this._trimQuotes(value);
            break;
    }

    if(this._currentNode.parsedHeaders[key]){
        if(!Array.isArray(this._currentNode.parsedHeaders[key])){
            this._currentNode.parsedHeaders[key] = [this._currentNode.parsedHeaders[key]];
        }
        this._currentNode.parsedHeaders[key].push(this._replaceMimeWords(value));
    }else{
        this._currentNode.parsedHeaders[key] = this._replaceMimeWords(value);
    }

    this._currentNode.headers[pos] = {key: key, value: value};
};

/**
 * <p>Creates an empty node element for the mime tree</p>
 *
 * <p>Created element includes parentNode property and a childNodes array. This is
 * needed to later walk the whole mime tree</p>
 *
 * @param {Object} [parentNode] the parent object for the created node
 * @returns {Object} node element for the mime tree
 */
MailParser.prototype._createMimeNode = function(parentNode){
    var node = {
        parentNode: parentNode || this._currentNode || null,
        headers: [],
        parsedHeaders:{},
        meta: {},
        childNodes: []
    };

    return node;
};

/**
 * <p>Splits a header value into key-value pairs</p>
 *
 * <p>Splits on <code>;</code> - the first value will be set as <code>defaultValue</code> property and will
 * not be handled, others will be split on <code>=</code> to key-value pairs</p>
 *
 * <p>For example <code>content-type: text/plain; charset=utf-8</code> will become:</p>
 *
 * <pre>
 * {
 *     defaultValue: "text/plain",
 *     charset: "utf-8"
 * }
 * </pre>
 *
 * @param {String} value A string to be splitted into key-value pairs
 * @returns {Object} a key-value object, with defaultvalue property
 */
MailParser.prototype._parseHeaderLineWithParams = function(value){
    var key, parts, returnValue = {};

    parts = value.split(";");
    returnValue.defaultValue = parts.shift().toLowerCase();

    for(var i=0, len = parts.length; i<len; i++){
        value = parts[i].split("=");
        key = value.shift().trim().toLowerCase();
        value = value.join("=").trim();

        // trim quotes
        value = this._trimQuotes(value);
        returnValue[key] = value;
    }

    return returnValue;
};

/**
 * <p>Parses a Content-Type header field value</p>
 *
 * <p>Fetches additional properties from the content type (charset etc.) and fills
 * current node meta object with this data</p>
 *
 * @param {String} value Content-Type string
 * @returns {Object} parsed contenttype object
 */
MailParser.prototype._parseContentType = function(value){
    var fileName;
    value = this._parseHeaderLineWithParams(value);
    if(value){
        if(value.defaultValue){
            value.defaultValue = value.defaultValue.toLowerCase();
            this._currentNode.meta.contentType = value.defaultValue;
            if(value.defaultValue.substr(0,"multipart/".length)=="multipart/"){
                this._currentNode.meta.mimeMultipart = value.defaultValue.substr("multipart/".length);
            }
        }else{
            this._currentNode.meta.contentType = "application/octet-stream";
        }
        if(value.charset){
            value.charset = value.charset.toLowerCase();
            if(value.charset.substr(0,4)=="win-"){
                value.charset = "windows-"+value.charset.substr(4);
            }else if(value.charset == "ks_c_5601-1987"){
                value.charset = "cp949";
            }else if(value.charset.match(/^utf\d/)){
                value.charset = "utf-"+value.charset.substr(3);
            }else if(value.charset.match(/^latin[\-_]?\d/)){
                value.charset = "iso-8859-"+value.charset.replace(/\D/g,"");
            }else if(value.charset.match(/^(us\-)?ascii$/)){
                value.charset = "utf-8";
            }
            this._currentNode.meta.charset = value.charset;
        }
        if(value.format){
            this._currentNode.meta.textFormat = value.format.toLowerCase();
        }
        if(value.delsp){
            this._currentNode.meta.textDelSp = value.delsp.toLowerCase();
        }
        if(value.boundary){
            this._currentNode.meta.mimeBoundary = value.boundary;
        }

        if(!this._currentNode.meta.fileName && (fileName = this._detectFilename(value))){
            this._currentNode.meta.fileName = fileName;
        }

        if(value.boundary){
            this._currentNode.meta.mimeBoundary = value.boundary;
            this._multipartTree.push({
                boundary: value.boundary,
                node: this._currentNode
            });
        }
    }
    return value;
};

/**
 * <p>Parses file name from a Content-Type or Content-Disposition field</p>
 *
 * <p>Supports <a href="http://tools.ietf.org/html/rfc2231">RFC2231</a> for
 * folded filenames</p>
 *
 * @param {Object} value Parsed Content-(Type|Disposition) object
 * @return {String} filename
 */
MailParser.prototype._detectFilename = function(value){
    var fileName="", i=0, parts, encoding, name;

    if(value.name){
        return this._replaceMimeWords(value.name);
    }

    if(value.filename){
        return this._replaceMimeWords(value.filename);
    }

    // RFC2231
    if(value["name*"]){
        fileName = value["name*"];
    }else if(value["filename*"]){
        fileName = value["filename*"];
    }else if(value["name*0*"]){
        while(value["name*"+(i)+"*"]){
            fileName += value["name*"+(i++)+"*"];
        }
    }else if(value["filename*0*"]){
        while(value["filename*"+(i)+"*"]){
            fileName += value["filename*"+(i++)+"*"];
        }
    }

    if(fileName){
        parts = fileName.split("'");
        encoding = parts.shift();
        name = parts.pop();
        if(name){
            return this._replaceMimeWords(this._replaceMimeWords("=?"+(encoding || "us-ascii")+"?Q?" + name.replace(/%/g,"=")+"?="));
        }
    }
    return "";
};

/**
 * <p>Parses Content-Disposition header field value</p>
 *
 * <p>Fetches filename to current node meta object</p>
 *
 * @param {String} value A Content-Disposition header field
 */
MailParser.prototype._parseContentDisposition = function(value){
    var returnValue = {},
        fileName;

    value = this._parseHeaderLineWithParams(value);

    if(value){
        if(value.defaultValue){
            this._currentNode.meta.contentDisposition = value.defaultValue.trim().toLowerCase();
        }
        if((fileName = this._detectFilename(value))){
            this._currentNode.meta.fileName = fileName;
        }
    }
};

/**
 * <p>Parses "References" header</p>
 *
 * @param {String} value References header field
 */
MailParser.prototype._parseReferences = function(value){
    this._currentNode.references = (this._currentNode.references || []).concat(
            (value || "").toString().
                trim().
                split(/\s+/).
                map(this._trimQuotes.bind(this))
        );
}

/**
 * <p>Parses "In-Reply-To" header</p>
 *
 * @param {String} value In-Reply-To header field
 */
MailParser.prototype._parseInReplyTo = function(value){
    this._currentNode.inReplyTo = (this._currentNode.inReplyTo || []).concat(
            (value || "").toString().
                trim().
                split(/\s+/).
                map(this._trimQuotes.bind(this))
        );
}

/**
 * <p>Parses the priority of the e-mail</p>
 *
 * @param {String} value The priority value
 * @returns {String} priority string low|normal|high
 */
MailParser.prototype._parsePriority = function(value){
    value = value.toLowerCase().trim();
    if(!isNaN(parseInt(value,10))){ // support "X-Priority: 1 (Highest)"
        value = parseInt(value, 10) || 0;
        if(value == 3){
            return "normal";
        }else if(value > 3){
            return "low";
        }else{
            return "high";
        }
    }else{
        switch(value){
            case "non-urgent":
            case "low":
                return "low";
            case "urgent":
            case "hight":
                return "high";
        }
    }
    return "normal";
};

/**
 * <p>Processes a line in text/html or text/plain node</p>
 *
 * <p>Append the line to the content property</p>
 *
 * @param {String} line A line to be processed
 */
MailParser.prototype._handleTextLine = function(line){
    var encoding = this._currentNode.meta.transferEncoding;
    if(encoding === "base64"){
        if(typeof this._currentNode.content != "string"){
            this._currentNode.content = line.trim();
        }else{
            this._currentNode.content += line.trim();
        }
    }
    else if(encoding === "quoted-printable" || this._currentNode.meta.textFormat != "flowed"){
        if(typeof this._currentNode.content != "string"){
            this._currentNode.content = line;
        }else{
            this._currentNode.content += "\n"+line;
        }
    }else{
        if(typeof this._currentNode.content != "string"){
            this._currentNode.content = line;
        }else if(this._currentNode.content.match(/[ ]{1,}$/)){
            if(this._currentNode.meta.textDelSp == "yes"){
                this._currentNode.content = this._currentNode.content.replace(/\s+$/,"");
            }
            this._currentNode.content += line;
        }else{
            this._currentNode.content += "\n"+line;
        }
    }
};

/**
 * <p>Processes a line in an attachment node</p>
 *
 * <p>If a stream is set up for the attachment write the line to the
 * stream as a Buffer object, otherwise append it to the content property</p>
 *
 * @param {String} line A line to be processed
 */
MailParser.prototype._handleAttachmentLine = function(line){
    if(!this._currentNode.attachment){
        return;
    }
    if(this._currentNode.stream){
        if(!this._currentNode.streamStarted){
            this._currentNode.streamStarted = true;
            this._currentNode.stream.write(new Buffer(line, "binary"));
        }else{
            this._currentNode.stream.write(new Buffer("\r\n"+line, "binary"));
        }
    }else if("content" in this._currentNode){
        if(typeof this._currentNode.content!="string"){
            this._currentNode.content = line;
        }else{
            this._currentNode.content += "\r\n" + line;
        }
    }
};

/**
 * <p>Finalizes a node processing</p>
 *
 * <p>If the node is a text/plain or text/html, convert it to UTF-8 encoded string
 * If it is an attachment, convert it to a Buffer or if an attachment stream is
 * set up, close the stream</p>
 */
MailParser.prototype._finalizeContents = function(){
    var streamInfo;

    if(this._currentNode.content){

        if(!this._currentNode.attachment){

            if(this._currentNode.meta.contentType == "text/html"){
                 this._currentNode.meta.charset = this._detectHTMLCharset(this._currentNode.content) || this._currentNode.meta.charset || this.options.defaultCharset || "iso-8859-1";
            }

            if(this._currentNode.meta.transferEncoding == "quoted-printable"){
                this._currentNode.content = mimelib.decodeQuotedPrintable(this._currentNode.content, false, this._currentNode.meta.charset || this.options.defaultCharset || "iso-8859-1");
              if (this._currentNode.meta.textFormat === "flowed") {
                if (this._currentNode.meta.textDelSp === "yes")
                  this._currentNode.content = this._currentNode.content.replace(/ \n/g, '');
                else
                  this._currentNode.content = this._currentNode.content.replace(/ \n/g, ' ');
                }
            }else if(this._currentNode.meta.transferEncoding == "base64"){
                this._currentNode.content = mimelib.decodeBase64(this._currentNode.content, this._currentNode.meta.charset || this.options.defaultCharset || "iso-8859-1");
            }else{
                this._currentNode.content = this._convertStringToUTF8(this._currentNode.content);
            }
        }else{
            if(this._currentNode.meta.transferEncoding == "quoted-printable"){
                this._currentNode.content = mimelib.decodeQuotedPrintable(this._currentNode.content, false, "binary");
            }else if(this._currentNode.meta.transferEncoding == "base64"){
                this._currentNode.content = new Buffer(this._currentNode.content.replace(/[^\w\+\/=]/g,''), "base64");
            }else{
                this._currentNode.content = new Buffer(this._currentNode.content, "binary");
            }
            this._currentNode.checksum.update(this._currentNode.content);
            this._currentNode.meta.checksum = this._currentNode.checksum.digest("hex");
            this._currentNode.meta.length = this._currentNode.content.length;
        }

    }

    if(this._currentNode.stream){
        streamInfo = this._currentNode.stream.end() || {};
        if(streamInfo.checksum){
            this._currentNode.meta.checksum = streamInfo.checksum;
        }
        if(streamInfo.length){
            this._currentNode.meta.length = streamInfo.length;
        }
    }
};

/**
 * <p>Processes the mime tree</p>
 *
 * <p>Finds text parts and attachments from the tree. If there's several text/plain
 * or text/html parts, push the ones from the lower parts of the tree to the
 * alternatives array</p>
 *
 * <p>Emits "end" when finished</p>
 */
MailParser.prototype._processMimeTree = function(){
    var level = 0, htmlLevel, textLevel,
        returnValue = {}, i, len;

    this.mailData = {html:[], text:[], alternatives:[], attachments:[]};

    if(!this.mimeTree.meta.mimeMultipart){
        this._processMimeNode(this.mimeTree, 0);
    }else{
        this._walkMimeTree(this.mimeTree);
    }

    if(this.mailData.html.length){
        for(i=0, len=this.mailData.html.length; i<len; i++){
            if(!returnValue.html || this.mailData.html[i].level < htmlLevel){
                if(returnValue.html){
                    if(!returnValue.alternatives){
                        returnValue.alternatives = [];
                    }
                    returnValue.alternatives.push({
                        contentType: "text/html",
                        content: returnValue.html
                    });
                }
                htmlLevel = this.mailData.html[i].level;
                returnValue.html = this.mailData.html[i].content;
            }else{
                if(!returnValue.alternatives){
                    returnValue.alternatives = [];
                }
                returnValue.alternatives.push({
                    contentType: "text/html",
                    content: this.mailData.html[i].content
                });
            }
        }
    }

    if(this.mailData.text.length){
        for(i=0, len=this.mailData.text.length; i<len; i++){
            if(!returnValue.text || this.mailData.text[i].level < textLevel){
                if(returnValue.text){
                    if(!returnValue.alternatives){
                        returnValue.alternatives = [];
                    }
                    returnValue.alternatives.push({
                        contentType: "text/plain",
                        content: returnValue.text
                    });
                }
                textLevel = this.mailData.text[i].level;
                returnValue.text = this.mailData.text[i].content;
            }else{
                if(!returnValue.alternatives){
                    returnValue.alternatives = [];
                }
                returnValue.alternatives.push({
                    contentType: "text/plain",
                    content: this.mailData.text[i].content
                });
            }
        }
    }

    returnValue.headers = this.mimeTree.parsedHeaders;

    if(this.mimeTree.subject){
        returnValue.subject = this.mimeTree.subject;
    }

    if(this.mimeTree.references){
        returnValue.references = this.mimeTree.references;
    }

    if(this.mimeTree.inReplyTo){
        returnValue.inReplyTo = this.mimeTree.inReplyTo;
    }

    if(this.mimeTree.priority){
        returnValue.priority = this.mimeTree.priority;
    }

    if(this.mimeTree.from){
        returnValue.from = this.mimeTree.from;
    }

    if(this.mimeTree.to){
        returnValue.to = this.mimeTree.to;
    }

    if(this.mimeTree.cc){
        returnValue.cc = this.mimeTree.cc;
    }

    if(this.mimeTree.bcc){
        returnValue.bcc = this.mimeTree.bcc;
    }

    if(this.mailData.attachments.length){
        returnValue.attachments = [];
        for(i=0, len=this.mailData.attachments.length; i<len; i++){
            returnValue.attachments.push(this.mailData.attachments[i].content);
        }
    }

    process.nextTick(this.emit.bind(this, "end", returnValue));
};

/**
 * <p>Walks the mime tree and runs processMimeNode on each node of the tree</p>
 *
 * @param {Object} node A mime tree node
 * @param {Number} [level=0] current depth
 */
MailParser.prototype._walkMimeTree = function(node, level){
    level = level || 1;
    for(var i=0, len = node.childNodes.length; i<len; i++){
        this._processMimeNode(node.childNodes[i], level, node.meta.mimeMultipart);
        this._walkMimeTree(node.childNodes[i], level+1);
    }
};

/**
 * <p>Processes of a node in the mime tree</p>
 *
 * <p>Pushes the node into appropriate <code>this.mailData</code> array (<code>text/html</code> to <code>this.mailData.html</code> array etc)</p>
 *
 * @param {Object} node A mime tree node
 * @param {Number} [level=0] current depth
 * @param {String} mimeMultipart Type of multipart we are dealing with (if any)
 */
MailParser.prototype._processMimeNode = function(node, level, mimeMultipart){
    var i, len;

    level = level || 0;

    if(!node.attachment){
        switch(node.meta.contentType){
            case "text/html":
                if(mimeMultipart == "mixed" && this.mailData.html.length){
                    for(i=0, len = this.mailData.html.length; i<len; i++){
                        if(this.mailData.html[i].level == level){
                            this._joinHTMLNodes(this.mailData.html[i], node.content);
                            return;
                        }
                    }
                }
                this.mailData.html.push({content: this._updateHTMLCharset(node.content || ""), level: level});
                return;
            case "text/plain":
                this.mailData.text.push({content: node.content || "", level: level});
                return;
        }
    }else{
        node.meta = node.meta || {};
        if(node.content){
            node.meta.content = node.content;
        }
        this.mailData.attachments.push({content: node.meta || {}, level: level});

        if(this.options.showAttachmentLinks && mimeMultipart == "mixed" && this.mailData.html.length){
            for(i=0, len = this.mailData.html.length; i<len; i++){
                if(this.mailData.html[i].level == level){
                    this._joinHTMLAttachment(this.mailData.html[i], node.meta);
                    return;
                }
            }
        }
    }
};

/**
 * <p>Joins two HTML blocks by removing the header of the added element<p>
 *
 * @param {Object} htmlNode Original HTML contents node object
 * @param {String} newHTML HTML text to add to the original object node
 */
MailParser.prototype._joinHTMLNodes = function(htmlNode, newHTML){
    var inserted = false;

    // process new HTML
    newHTML = (newHTML || "").toString("utf-8").trim();

    // remove doctype from the beginning
    newHTML = newHTML.replace(/^\s*<\!doctype( [^>]*)?>/gi, "");

    // remove <head> and <html> blocks
    newHTML = newHTML.replace(/<head( [^>]*)?>(.*)<\/head( [^>]*)?>/gi, "").
                    replace(/<\/?html( [^>]*)?>/gi, "").
                    trim();

    // keep only text between <body> tags (if <body exists)
    newHTML.replace(/<body(?: [^>]*)?>(.*)<\/body( [^>]*)?>/gi, function(match, body){
        newHTML = body.trim();
    });

    htmlNode.content = (htmlNode.content || "").toString("utf-8").trim();

    htmlNode.content = htmlNode.content.replace(/<\/body( [^>]*)?>/i, function(match){
        inserted = true;
        return "<br/>\n" + newHTML + match;
    });

    if(!inserted){
        htmlNode.content += "<br/>\n" + newHTML;
    }
};

/**
 * <p>Adds filename placeholder to the HTML if needed</p>
 *
 * @param {Object} htmlNode Original HTML contents node object
 * @param {String} attachment Attachment meta object
 */
MailParser.prototype._joinHTMLAttachment = function(htmlNode, attachment){
    var inserted = false,
        fname = attachment.generatedFileName.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
        cid, newHTML;

    cid = attachment.cid || (attachment.cid = attachment.generatedFileName+"@node");
    newHTML = "\n<div class=\"mailparser-attachment\"><a href=\"cid:"+cid+"\">&lt;" + fname + "&gt;</a></div>";

    htmlNode.content = (htmlNode.content || "").toString("utf-8").trim();

    htmlNode.content = htmlNode.content.replace(/<\/body( [^>]*)?>/i, function(match){
        inserted = true;
        return "<br/>\n" + newHTML + match;
    });

    if(!inserted){
        htmlNode.content += "<br/>\n" + newHTML;
    }
};

/**
 * <p>Converts a string from one charset to another</p>
 *
 * @param {Buffer|String} value A String to be converted
 * @param {String} fromCharset source charset
 * @param {String} [toCharset="UTF-8"] destination charset
 * @returns {Buffer} Converted string as a Buffer (or SlowBuffer)
 */
MailParser.prototype._convertString = function(value, fromCharset, toCharset){
    toCharset = (toCharset || "utf-8").toUpperCase();
    fromCharset = (fromCharset || "utf-8").toUpperCase();

    value = typeof value=="string"?new Buffer(value, "binary"):value;

    if(toCharset == fromCharset){
        return value;
    }

    value = encodinglib.convert(value, toCharset, fromCharset);

    return value;
};

/**
 * <p>Converts a string to UTF-8</p>
 *
 * @param {String} value String to be encoded
 * @returns {String} UTF-8 encoded string
 */
MailParser.prototype._convertStringToUTF8 = function(value){
    value = this._convertString(value, this._currentNode.meta.charset || this.options.defaultCharset || "iso-8859-1").toString("utf-8");
    return value;
};

/**
 * <p>Encodes a header string to UTF-8</p>
 *
 * @param {String} value String to be encoded
 * @returns {String} UTF-8 encoded string
 */
MailParser.prototype._encodeString = function(value){
    value = this._replaceMimeWords(this._convertStringToUTF8(value));
    return value;
};

/**
 * <p>Replaces mime words in a string with UTF-8 encoded strings</p>
 *
 * @param {String} value String to be converted
 * @returns {String} converted string
 */
MailParser.prototype._replaceMimeWords = function(value){
    return value.
        replace(/(=\?[^?]+\?[QqBb]\?[^?]+\?=)\s+(?==\?[^?]+\?[QqBb]\?[^?]+\?=)/g, "$1"). // join mimeWords
        replace(/\=\?[^?]+\?[QqBb]\?[^?]+\?=/g, (function(a){
            return mimelib.decodeMimeWord(a.replace(/\s/g,''));
        }).bind(this));
};

/**
 * <p>Removes enclosing quotes ("", '', &lt;&gt;) from a string</p>
 *
 * @param {String} value String to be converted
 * @returns {String} converted string
 */
MailParser.prototype._trimQuotes = function(value){
    value = (value || "").trim();
    if((value.charAt(0)=='"' && value.charAt(value.length-1)=='"') ||
      (value.charAt(0)=="'" && value.charAt(value.length-1)=="'") ||
      (value.charAt(0)=="<" && value.charAt(value.length-1)==">")){
        value = value.substr(1,value.length-2);
    }
    return value;
};

/**
 * <p>Generates a context unique filename for an attachment</p>
 *
 * <p>If a filename already exists, append a number to it</p>
 *
 * <ul>
 *     <li>file.txt</li>
 *     <li>file-1.txt</li>
 *     <li>file-2.txt</li>
 * </ul>
 *
 * @param {String} fileName source filename
 * @param {String} contentType source content type
 * @returns {String} generated filename
 */
MailParser.prototype._generateFileName = function(fileName, contentType){
    var ext, defaultExt = "";

    if(contentType){
        defaultExt = mimelib.contentTypesReversed[contentType];
        defaultExt = defaultExt?"."+defaultExt:"";
    }

    fileName = fileName || "attachment"+defaultExt;

    // remove path if it is included in the filename
    fileName = fileName.toString().split(/[\/\\]+/).pop().replace(/^\.+/,"") || "attachment";

    if(fileName in this._fileNames){
        this._fileNames[fileName]++;
        ext = fileName.substr((fileName.lastIndexOf(".") || 0)+1);
        if(ext == fileName){
            fileName += "-" +  this._fileNames[fileName];
        }else{
            fileName = fileName.substr(0, fileName.length - ext.length - 1) + "-" + this._fileNames[fileName] + "." + ext;
        }
    }else{
        this._fileNames[fileName] = 0;
    }
    return fileName;
};


/**
 * <p>Replaces character set to UTF-8 in HTML &lt;meta&gt; tags</p>
 *
 * @param {String} HTML html contents
 * @returns {String} updated HTML
 */
MailParser.prototype._updateHTMLCharset = function(html){

    html = html.replace(/\n/g,"\u0000").
        replace(/<meta[^>]*>/gi, function(meta){
            if(meta.match(/http\-equiv\s*=\s*"?content\-type/i)){
                return '<meta http-equiv="content-type" content="text/html; charset=utf-8" />';
            }
            if(meta.match(/\scharset\s*=\s*['"]?[\w\-]+["'\s>\/]/i)){
                return '<meta charset="utf-8"/>';
            }
            return meta;
        }).
        replace(/\u0000/g,"\n");

    return html;
};

/**
 * <p>Detects the charset of an HTML file</p>
 *
 * @param {String} HTML html contents
 * @returns {String} Charset for the HTML
 */
MailParser.prototype._detectHTMLCharset = function(html){
    var charset, input, meta;

    if(typeof html !=" string"){
        html = html.toString("ascii");
    }

    if((meta = html.match(/<meta\s+http-equiv=["']content-type["'][^>]*?>/i))){
        input = meta[0];
    }

    if(input){
        charset = input.match(/charset\s?=\s?([a-zA-Z\-_:0-9]*);?/);
        if(charset){
            charset = (charset[1] || "").trim().toLowerCase();
        }
    }

    if(!charset && (meta = html.match(/<meta\s+charset=["']([^'"<\/]*?)["']/i))){
        charset = (meta[1] || "").trim().toLowerCase();
    }

    return charset;
};

});
/**
 *
 **/

define('mailapi/imap/imapchew',
  [
    'mimelib',
    'mailapi/db/mail_rep',
    '../mailchew',
    'exports'
  ],
  function(
    $mimelib,
    mailRep,
    $mailchew,
    exports
  ) {

function parseRfc2231CharsetEncoding(s) {
  // charset'lang'url-encoded-ish
  var match = /^([^']*)'([^']*)'(.+)$/.exec(s);
  if (match) {
    // we can convert the dumb encoding into quoted printable.
    return $mimelib.parseMimeWords(
      '=?' + (match[1] || 'us-ascii') + '?Q?' +
        match[3].replace(/%/g, '=') + '?=');
  }
  return null;
}

/**
 * Process the headers and bodystructure of a message to build preliminary state
 * and determine what body parts to fetch.  The list of body parts will be used
 * to issue another fetch request, and those results will be passed to
 * `chewBodyParts`.
 *
 * For now, our stop-gap heuristics for content bodies are:
 * - pick text/plain in multipart/alternative
 * - recurse into other multipart types looking for an alterntive that has
 *    text.
 * - do not recurse into message/rfc822
 * - ignore/fail-out messages that lack a text part, skipping to the next
 *    task.  (This should not happen once we support HTML, as there are cases
 *    where there are attachments without any body part.)
 * - Append text body parts together; there is no benefit in separating a
 *    mailing list footer from its content.
 *
 * For attachments, our heuristics are:
 * - only like them if they have filenames.  We will find this as "name" on
 *    the "content-type" or "filename" on the "content-disposition", quite
 *    possibly on both even.  For imap.js, "name" shows up in the "params"
 *    dict, and filename shows up in the "disposition" dict.
 * - ignore crypto signatures, even though they are named.  S/MIME gives us
 *    "smime.p7s" as an application/pkcs7-signature under a multipart/signed
 *    (that the server tells us is "signed").  PGP in MIME mode gives us
 *    application/pgp-signature "signature.asc" under a multipart/signed.
 *
 * The next step in the plan is to get an HTML sanitizer exposed so we can
 *  support text/html.  That will also imply grabbing multipart/related
 *  attachments.
 *
 * @typedef[ChewRep @dict[
 *   @key[bodyReps @listof[ImapJsPart]]
 *   @key[attachments @listof[AttachmentInfo]]
 *   @key[relatedParts @listof[RelatedPartInfo]]
 * ]]
 * @return[ChewRep]
 */
function chewStructure(msg) {
  // imap.js builds a bodystructure tree using lists.  All nodes get wrapped
  //  in a list so they are element zero.  Children (which get wrapped in
  //  their own list) follow.
  //
  // Examples:
  //   text/plain =>
  //     [{text/plain}]
  //   multipart/alternative with plaintext and HTML =>
  //     [{alternative} [{text/plain}] [{text/html}]]
  //   multipart/mixed text w/attachment =>
  //     [{mixed} [{text/plain}] [{application/pdf}]]
  var attachments = [], bodyReps = [], unnamedPartCounter = 0,
      relatedParts = [];

  /**
   * Sizes are the size of the encoded string, not the decoded value.
   */
  function estimatePartSizeInBytes(partInfo) {
    var encoding = partInfo.encoding.toLowerCase();
    // Base64 encodes 3 bytes in 4 characters with padding that always
    // causes the encoding to take 4 characters.  The max encoded line length
    // (ignoring CRLF) is 76 bytes, with 72 bytes also fairly common.
    // As such, a 78=19*4+2 character line encodes 57=19*3 payload bytes and
    // we can use that as a rough estimate.
    if (encoding === 'base64') {
      return Math.floor(partInfo.size * 57 / 78);
    }
    // Quoted printable is hard to predict since only certain things need
    // to be encoded.  It could be perfectly efficient if the source text
    // has a bunch of newlines built-in.
    else if (encoding === 'quoted-printable') {
      // Let's just provide an upper-bound of perfectly efficient.
      return partInfo.size;
    }
    // No clue; upper bound.
    return partInfo.size;
  }

  function chewLeaf(branch) {
    var partInfo = branch[0], i,
        filename, disposition;

    // - Detect named parts; they could be attachments
    // filename via content-type 'name' parameter
    if (partInfo.params && partInfo.params.name) {
      filename = $mimelib.parseMimeWords(partInfo.params.name);
    }
    // filename via content-type 'name' with charset/lang info
    else if (partInfo.params && partInfo.params['name*']) {
      filename = parseRfc2231CharsetEncoding(
                   partInfo.params['name*']);
    }
    // rfc 2231 stuff:
    // filename via content-disposition filename without charset/lang info
    else if (partInfo.disposition && partInfo.disposition.params &&
             partInfo.disposition.params.filename) {
      filename = $mimelib.parseMimeWords(partInfo.disposition.params.filename);
    }
    // filename via content-disposition filename with charset/lang info
    else if (partInfo.disposition && partInfo.disposition.params &&
             partInfo.disposition.params['filename*']) {
      filename = parseRfc2231CharsetEncoding(
                   partInfo.disposition.params['filename*']);
    }
    else {
      filename = null;
    }

    // - Start from explicit disposition, make attachment if non-displayable
    if (partInfo.disposition)
      disposition = partInfo.disposition.type.toLowerCase();
    // UNTUNED-HEURISTIC (need test cases)
    // Parts with content ID's explicitly want to be referenced by the message
    // and so are inline.  (Although we might do well to check if they actually
    // are referenced.  This heuristic could be very wrong.)
    else if (partInfo.id)
      disposition = 'inline';
    else if (filename || partInfo.type !== 'text')
      disposition = 'attachment';
    else
      disposition = 'inline';

    // Some clients want us to display things inline that we simply can't
    // display (historically and currently, PDF) or that our usage profile
    // does not want to automatically download (in the future, PDF, because
    // they can get big.)
    if (partInfo.type !== 'text' &&
        partInfo.type !== 'image')
      disposition = 'attachment';

    // - But we don't care if they are signatures...
    if ((partInfo.type === 'application') &&
        (partInfo.subtype === 'pgp-signature' ||
         partInfo.subtype === 'pkcs7-signature'))
      return true;

    function stripArrows(s) {
      if (s[0] === '<')
        return s.slice(1, -1);
      return s;
    }

    function makePart(partInfo, filename) {

      return mailRep.makeAttachmentPart({
        name: filename || 'unnamed-' + (++unnamedPartCounter),
        contentId: partInfo.id ? stripArrows(partInfo.id) : null,
        type: (partInfo.type + '/' + partInfo.subtype).toLowerCase(),
        part: partInfo.partID,
        encoding: partInfo.encoding && partInfo.encoding.toLowerCase(),
        sizeEstimate: estimatePartSizeInBytes(partInfo),
        file: null,
        /*
        charset: (partInfo.params && partInfo.params.charset &&
                  partInfo.params.charset.toLowerCase()) || undefined,
        textFormat: (partInfo.params && partInfo.params.format &&
                     partInfo.params.format.toLowerCase()) || undefined
         */
      });
    }

    function makeTextPart(partInfo) {
      return mailRep.makeBodyPart({
        type: partInfo.subtype,
        part: partInfo.partID,
        sizeEstimate: partInfo.size,
        amountDownloaded: 0,
        // its important to know that sizeEstimate and amountDownloaded
        // do _not_ determine if the bodyRep is fully downloaded; the
        // estimated amount is not reliable
        // Zero-byte bodies are assumed to be accurate and we treat the file
        // as already downloaded.
        isDownloaded: partInfo.size === 0,
        // full internal IMAP representation
        // it would also be entirely appropriate to move
        // the information on the bodyRep directly?
        _partInfo: partInfo.size ? partInfo : null,
        content: ''
      });
    }

    if (disposition === 'attachment') {
      attachments.push(makePart(partInfo, filename));
      return true;
    }

    // - We must be an inline part or structure
    switch (partInfo.type) {
      // - related image
      case 'image':
        relatedParts.push(makePart(partInfo, filename));
        return true;
        break;
      // - content
      case 'text':
        if (partInfo.subtype === 'plain' ||
            partInfo.subtype === 'html') {
          bodyReps.push(makeTextPart(partInfo));
          return true;
        }
        break;
    }
    return false;
  }

  function chewMultipart(branch) {
    var partInfo = branch[0], i;

    // - We must be an inline part or structure
    // I have no idea why the multipart is the 'type' rather than the subtype?
    switch (partInfo.subtype) {
      // - for alternative, scan from the back to find the first part we like
      // XXX I believe in Thunderbird we observed some ridiculous misuse of
      // alternative that we'll probably want to handle.
      case 'alternative':
        for (i = branch.length - 1; i >= 1; i--) {
          var subPartInfo = branch[i][0];

          switch(subPartInfo.type) {
            case 'text':
              // fall out for subtype checking
              break;
            case 'multipart':
              // this is probably HTML with attachments, let's give it a try
              if (chewMultipart(branch[i]))
                return true;
              break;
            default:
              // no good, keep going
              continue;
          }

          switch (subPartInfo.subtype) {
            case 'html':
            case 'plain':
              // (returns true if successfully handled)
              if (chewLeaf(branch[i]))
                return true;
          }
        }
        // (If we are here, we failed to find a valid choice.)
        return false;
      // - multipart that we should recurse into
      case 'mixed':
      case 'signed':
      case 'related':
        for (i = 1; i < branch.length; i++) {
          if (branch[i].length > 1)
            chewMultipart(branch[i]);
          else
            chewLeaf(branch[i]);
        }
        return true;

      default:
        console.warn('Ignoring multipart type:', partInfo.subtype);
        return false;
    }
  }

  if (msg.structure.length > 1)
    chewMultipart(msg.structure);
  else
    chewLeaf(msg.structure);

  return {
    bodyReps: bodyReps,
    attachments: attachments,
    relatedParts: relatedParts,
  };
};

exports.chewHeaderAndBodyStructure =
  function(msg, folderId, newMsgId) {
  // begin by splitting up the raw imap message
  var parts = chewStructure(msg);
  var rep = {};

  rep.header = mailRep.makeHeaderInfo({
    // the FolderStorage issued id for this message (which differs from the
    // IMAP-server-issued UID so we can do speculative offline operations like
    // moves).
    id: newMsgId,
    srvid: msg.id,
    // The sufficiently unique id is a concatenation of the UID onto the
    // folder id.
    suid: folderId + '/' + newMsgId,
    // The message-id header value; as GUID as get for now; on gmail we can
    // use their unique value, or if we could convince dovecot to tell us, etc.
    guid: msg.msg.meta.messageId,
    // mailparser models from as an array; we do not.
    author: msg.msg.from && msg.msg.from[0] ||
              // we require a sender e-mail; let's choose an illegal default as
              // a stopgap so we don't die.
              { address: 'missing-address@example.com' },
    to: ('to' in msg.msg) ? msg.msg.to : null,
    cc: ('cc' in msg.msg) ? msg.msg.cc : null,
    bcc: ('bcc' in msg.msg) ? msg.msg.bcc : null,

    replyTo: ('reply-to' in msg.msg.parsedHeaders) ?
               msg.msg.parsedHeaders['reply-to'] : null,

    date: msg.date,
    flags: msg.flags,
    hasAttachments: parts.attachments.length > 0,
    subject: msg.msg.subject || null,

    // we lazily fetch the snippet later on
    snippet: null
  });


  rep.bodyInfo = mailRep.makeBodyInfo({
    date: msg.date,
    size: 0,
    attachments: parts.attachments,
    relatedParts: parts.relatedParts,
    references: msg.msg.references,
    bodyReps: parts.bodyReps
  });

  return rep;
};

/**
 * Fill a given body rep with the content from fetching
 * part or the entire body of the message...
 *
 *    var body = ...;
 *    var header = ...;
 *    var content = (some fetched content)..
 *
 *    $imapchew.updateMessageWithFetch(
 *      header,
 *      bodyInfo,
 *      {
 *        bodyRepIndex: 0,
 *        text: '',
 *        buffer: Uint8Array|Null,
 *        bytesFetched: n,
 *        bytesRequested: n
 *      }
 *    );
 *
 *    // what just happend?
 *    // 1. the body.bodyReps[n].content is now the value of content.
 *    //
 *    // 2. we update .amountDownloaded with the second argument
 *    //    (number of bytes downloaded).
 *    //
 *    // 3. if snippet has not bee set on the header we create the snippet
 *    //    and set its value.
 *
 */
exports.updateMessageWithFetch = function(header, body, req, res, _LOG) {
  var bodyRep = body.bodyReps[req.bodyRepIndex];

  // check if the request was unbounded or we got back less bytes then we
  // requested in which case the download of this bodyRep is complete.
  if (!req.bytes || res.bytesFetched < req.bytes[1]) {
    bodyRep.isDownloaded = true;

    // clear private space for maintaining parser state.
    bodyRep._partInfo = null;
  }

  if (!bodyRep.isDownloaded && res.buffer) {
    bodyRep._partInfo.pendingBuffer = res.buffer;
  }

  bodyRep.amountDownloaded += res.bytesFetched;

  var data = $mailchew.processMessageContent(
    res.text, bodyRep.type, bodyRep.isDownloaded, req.createSnippet, _LOG
  );

  if (req.createSnippet) {
    header.snippet = data.snippet;
  }
  if (bodyRep.isDownloaded)
    bodyRep.content = data.content;
};

/**
 * Selects a desirable snippet body rep if the given header has no snippet.
 */
exports.selectSnippetBodyRep = function(header, body) {
  if (header.snippet)
    return -1;

  var bodyReps = body.bodyReps;
  var len = bodyReps.length;

  for (var i = 0; i < len; i++) {
    if (exports.canBodyRepFillSnippet(bodyReps[i])) {
      return i;
    }
  }

  return -1;
};

/**
 * Determines if a given body rep can be converted into a snippet. Useful for
 * determining which body rep to use when downloading partial bodies.
 *
 *
 *    var bodyInfo;
 *    $imapchew.canBodyRepFillSnippet(bodyInfo.bodyReps[0]) // true/false
 *
 */
exports.canBodyRepFillSnippet = function(bodyRep) {
  return (
    bodyRep &&
    bodyRep.type === 'plain' ||
    bodyRep.type === 'html'
  );
};


/**
 * Calculates and returns the correct estimate for the number of
 * bytes to download before we can display the body. For IMAP, that
 * includes the bodyReps and related parts. (POP3 is different.)
 */
exports.calculateBytesToDownloadForImapBodyDisplay = function(body) {
  var bytesLeft = 0;
  body.bodyReps.forEach(function(rep) {
    if (!rep.isDownloaded) {
      bytesLeft += rep.sizeEstimate - rep.amountDownloaded;
    }
  });
  body.relatedParts.forEach(function(part) {
    if (!part.file) {
      bytesLeft += part.sizeEstimate;
    }
  });
  return bytesLeft;
}



}); // end define
;
'use strict';

// XXX: This is copied from shared/js/mime_mapper.js until the
// download manager ships.

/**
 * MimeMapper helps gaia apps to decide the mapping of mimetype and extension.
 * The use cases often happen when apps need to know about the exact
 * mimetypes or extensions, such as to delegate the open web activity, we must
 * have suitable mimetypes or extensions to request the right activity
 *
 * The mapping is basically created according to:
 * http://en.wikipedia.org/wiki/Internet_media_type
 *
 * The supported formats are considered base on the deviceStorage properties:
 * http://dxr.mozilla.org/mozilla-central/toolkit/content/
 * devicestorage.properties
 *
 */
define('pop3/mime_mapper',[],function() {
return {
  // This list only contains the extensions we currently supported
  // We should make it more complete for further usages
  _typeToExtensionMap: {
    // Image
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    // Audio
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
    'audio/3gpp': '3gp',
    'audio/amr': 'amr',
    // Video
    'video/mp4': 'mp4',
    'video/mpeg': 'mpg',
    'video/ogg': 'ogg',
    'video/webm': 'webm',
    'video/3gpp': '3gp',
    // Application
    // If we want to support some types, like pdf, just add
    // 'application/pdf': 'pdf'
    'application/vcard': 'vcf',
    // Text
    'text/vcard': 'vcf',
    'text/x-vcard': 'vcf'
  },

  // This list only contains the mimetypes we currently supported
  // We should make it more complete for further usages
  _extensionToTypeMap: {
    // Image
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'jpe': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    // Audio
    'mp3': 'audio/mpeg',
    'm4a': 'audio/mp4',
    'm4b': 'audio/mp4',
    'm4p': 'audio/mp4',
    'm4r': 'audio/mp4',
    'aac': 'audio/aac',
    'opus': 'audio/ogg',
    'amr': 'audio/amr',
    // Video
    'mp4': 'video/mp4',
    'mpeg': 'video/mpeg',
    'mpg': 'video/mpeg',
    'ogv': 'video/ogg',
    'ogx': 'video/ogg',
    'webm': 'video/webm',
    '3gp': 'video/3gpp',
    'ogg': 'video/ogg',
    // Application
    // If we want to support some extensions, like pdf, just add
    // 'pdf': 'application/pdf'
    // Text
    'vcf': 'text/vcard'
  },
  _parseExtension: function(filename) {
    var array = filename.split('.');
    return array.length > 1 ? array.pop() : '';
  },

  isSupportedType: function(mimetype) {
    return (mimetype in this._typeToExtensionMap);
  },

  isSupportedExtension: function(extension) {
    return (extension in this._extensionToTypeMap);
  },

  isFilenameMatchesType: function(filename, mimetype) {
    var extension = this._parseExtension(filename);
    var guessedType = this.guessTypeFromExtension(extension);
    return (guessedType == mimetype);
  },

  guessExtensionFromType: function(mimetype) {
    return this._typeToExtensionMap[mimetype];
  },

  guessTypeFromExtension: function(extension) {
    return this._extensionToTypeMap[extension];
  },

  // If mimetype is not in the supported list, we will try to
  // predict the possible valid mimetype based on extension.
  guessTypeFromFileProperties: function(filename, mimetype) {
    var extension = this._parseExtension(filename);
    var type = this.isSupportedType(mimetype) ?
      mimetype : this.guessTypeFromExtension(extension);
    return type || '';
  },

  // if mimetype is not supported, preserve the original extension
  // and add the predict result as new extension.
  // If both filename and mimetype are not supported, return the original
  // filename.
  ensureFilenameMatchesType: function(filename, mimetype) {
    if (!this.isFilenameMatchesType(filename, mimetype)) {
      var guessedExt = this.guessExtensionFromType(mimetype);
      if (guessedExt) {
        filename += '.' + guessedExt;
      }
    }
    return filename;
  }
};
});

define('pop3/pop3',['module', 'exports', 'rdcommon/log', 'net', 'crypto',
        './transport', 'mailparser/mailparser', '../mailapi/imap/imapchew',
        '../mailapi/syncbase',
        './mime_mapper', '../mailapi/allback'],
function(module, exports, log, net, crypto,
         transport, mailparser, imapchew,
         syncbase, mimeMapper, allback) {

  /**
   * The Pop3Client modules and classes are organized according to
   * their function, as follows, from low-level to high-level:
   *
   *      [Pop3Parser] parses raw protocol data from the server.
   *      [Pop3Protocol] handles the request/response semantics
   *                     along with the Request and Response classes,
   *                     which are mostly for internal use. Pop3Protocol
   *                     does not deal with I/O at all.
   *      [Pop3Client] hooks together the Protocol and a socket, and
   *                   handles high-level details like listing messages.
   *
   * In general, this tries to share as much code as possible with
   * IMAP/ActiveSync. We reuse imapchew.js to normalize POP3 MIME
   * messages in the same way as IMAP, to avoid spurious errors trying
   * to write yet another translation layer. All of the MIME parsing
   * happens in this file; transport.js contains purely wire-level
   * logic.
   *
   * Each Pop3Client is responsible for one connection only;
   * Pop3Account in GELAM is responsible for managing connection lifetime.
   *
   * As of this writing (Nov 2013), there was only one other
   * reasonably complete POP3 JavaScript implementation, available at
   * <https://github.com/ditesh/node-poplib>. It would have probably
   * worked, but since the protocol is simple, it seemed like a better
   * idea to avoid patching over Node-isms more than necessary (e.g.
   * avoiding Buffers, node socket-isms, etc.). Additionally, that
   * library only contained protocol-level details, so we would have
   * only really saved some code in transport.js.
   *
   * For error conditions, this class always normalizes errors into
   * the format as documented in the constructor below.
   * All external callbacks get passed node-style (err, ...).
   */

  function md5(s) {
    return crypto.createHash('md5').update(s).digest('hex').toLowerCase();
  }

  // Allow setTimeout and clearTimeout to be shimmed for unit tests.
  var setTimeout = window.setTimeout.bind(window);
  var clearTimeout = window.clearTimeout.bind(window);
  exports.setTimeoutFuncs = function(set, clear) {
    setTimeout = set;
    clearTimeout = clear;
  }

  /***************************************************************************
   * Pop3Client
   *
   * Connect to a POP3 server. `cb` is always invoked, with (err) if
   * the connction attempt failed. Options are as follows:
   *
   * @param {string} host
   * @param {string} username
   * @param {string} password
   * @param {string} port
   * @param {boolean|'plain'|'ssl'|'starttls'} crypto
   * @param {int} connTimeout optional connection timeout
   * @param {'apop'|'sasl'|'user-pass'} preferredAuthMethod first method to try
   * @param {boolean} debug True to dump the protocol to the console.
   *
   * The connection's current state is available at `.state`, with the
   * following values:
   *
   *   'disconnected', 'greeting', 'starttls', 'authorization', 'ready'
   *
   * All callback errors are normalized to the following form:
   *
   *    var err = {
   *      scope: 'connection|authentication|mailbox|message',
   *      name: '...',
   *      message: '...',
   *      request: Pop3Client.Request (if applicable),
   *      exception: (A socket error, if available),
   *    };
   *
   */
  var Pop3Client = exports.Pop3Client = function(options, cb) {
    // for clarity, list the available options:
    this.options = options = options || {};
    options.host = options.host || null;
    options.username = options.username || null;
    options.password = options.password || null;
    options.port = options.port || null;
    options.crypto = options.crypto || false;
    options.connTimeout = options.connTimeout || 30000;
    options.debug = options.debug || false;
    options.authMethods = ['apop', 'sasl', 'user-pass'];

    this._LOG = options._logParent ?
      LOGFAB.Pop3Client(this, options._logParent, Date.now() % 1000) : null;

    if (options.preferredAuthMethod) {
      // if we prefer a certain auth method, try that first.
      var idx = options.authMethods.indexOf(options.preferredAuthMethod);
      if (idx !== -1) {
        options.authMethods.splice(idx, 1);
      }
      options.authMethods.unshift(options.preferredAuthMethod);
    }

    // Normalize the crypto option:
    if (options.crypto === true) {
      options.crypto = 'ssl';
    } else if (!options.crypto) {
      options.crypto = 'plain';
    }

    if (!options.port) {
      options.port = {
        'plain': 110,
        'starttls': 110,
        'ssl': 995
      }[options.crypto];
      if (!options.port) {
        throw new Error('Invalid crypto option for Pop3Client: ' +
                        options.crypto);
      }
    }

    // The public state of the connection (the only one we really care
    // about is 'disconnected')
    this.state = 'disconnected';
    this.authMethod = null; // Upon successful login, the method that worked.

    // Keep track of the message IDs and UIDLs the server has reported
    // during this session (these values could change in each
    // session, though they probably won't):
    this.idToUidl = {};
    this.uidlToId = {};
    this.idToSize = {};
    // An array of {uidl: "", size: 0, number: } for each message
    // retrieved as a result of calling LIST
    this._messageList = null;
    this._greetingLine = null; // contains APOP auth info, if available

    this.protocol = new transport.Pop3Protocol();
    this.socket = net.connect(options.port, options.host,
                              options.crypto === 'ssl');

    var connectTimeout = setTimeout(function() {
      this.state = 'disconnected';
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      cb && cb({
        scope: 'connection',
        request: null,
        name: 'unresponsive-server',
        message: 'Could not connect to ' + options.host + ':' + options.port +
          ' with ' + options.crypto + ' encryption.',
      });
    }.bind(this), options.connTimeout);

    if (options.debug) {
      this.attachDebugLogging();
    }

    // Hook the protocol and socket together:
    this.socket.on('data', this.protocol.onreceive.bind(this.protocol));
    this.protocol.onsend = this.socket.write.bind(this.socket);

    this.socket.on('connect', function() {
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      this.state = 'greeting';
      // No further processing is needed here. We wait for the server
      // to send a +OK greeting before we try to authenticate.
    }.bind(this));

    this.socket.on('error', function(err) {
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      cb && cb({
        scope: 'connection',
        request: null,
        name: 'unresponsive-server',
        message: 'Socket exception: ' + JSON.stringify(err),
        exception: err,
      });
    }.bind(this));

    this.socket.on('close', function() {
      this.protocol.onclose();
      this.die();
    }.bind(this));

    // To track requests/responses in the presence of a server
    // greeting, store an empty request here. Our request/response
    // matching logic will pair the server's greeting with this
    // request.
    this.protocol.pendingRequests.push(
    new transport.Request(null, [], false, function(err, rsp) {
      if (err) {
        cb && cb({
          scope: 'connection',
          request: null,
          name: 'unresponsive-server',
          message: err.getStatusLine(),
          response: err,
        });
        return;
      }

      // Store the greeting line, it might be needed in authentication
      this._greetingLine = rsp.getLineAsString(0);

      this._maybeUpgradeConnection(function(err) {
        if (err) { cb && cb(err); return; }
        this._thenAuthorize(function(err) {
          if (!err) {
            this.state = 'ready';
          }
          cb && cb(err);
        });
      }.bind(this));
    }.bind(this)));
  }

  /**
   * Disconnect from the server forcibly. Do not issue a QUIT command.
   */
  Pop3Client.prototype.disconnect =
  Pop3Client.prototype.die = function() {
    if (this.state !== 'disconnected') {
      this.state = 'disconnected';
      this.socket.end();
      // No need to do anything further; we'll tear down when we
      // receive the socket's "close" event.
    }
  }

  /**
   * Attach a console logger that prints out any socket data sent or
   * received, blurring out authentication credentials. This is
   * automatically attached if {'debug': true} is passed as an option
   * to the constructor.
   */
  Pop3Client.prototype.attachDebugLogging = function() {
    // This isn't perfectly accurate; lines can split over packet/recv
    // boundaries, but it should be good enough for debug logging.
    // Because we always send a full command with the `.write()`
    // function, though, the outgoing data (thus credential hiding)
    // will always work.
    this.socket.on('data', function(data) {
      var s = bufferToPrintable(data);
      var color = (s.indexOf('-ERR') === -1 ? '\x1b[32m' : '\x1b[31m');
      dump('<-- ' + color + s + '\x1b[0;37m\n');
    });
    var oldWrite = this.socket.write;
    this.socket.write = function(data) {
      var s = bufferToPrintable(data);
      s = s.replace(/(AUTH|USER|PASS|APOP)(.*?)\\r\\n/g,
                    '$1 ***CREDENTIALS HIDDEN***\\r\\n');
      dump('--> ' + '\x1b[0;33m' + s + '\x1b[0;37m\n');
      return oldWrite.apply(this, arguments);
    }.bind(this.socket);
  }

  /**
   * Fetch the capabilities from the server. If the connection
   * supports STLS and we've specified 'starttls' as the crypto
   * option, we upgrade the connection here.
   */
  // XXX: UNUSED FOR NOW. Maybe we'll use it later.
  Pop3Client.prototype._getCapabilities = function(cb) {
    this.protocol.sendRequest('CAPA', [], true, function(err, rsp) {
      if (err) {
        // It's unlikely this server's going to do much, but we'll try.
        this.capabilities = {};
      } else {
        var lines = rsp.getDataLines();
        for (var i = 0; i < lines.length; i++) {
          var words = lines[i].split(' ');
          this.capabilities[words[0]] = words.slice(1);
        }
      }
    }.bind(this));
  }

  /**
   * If we're trying to use TLS, upgrade now.
   *
   * This is followed by ._thenAuthorize().
   */
  Pop3Client.prototype._maybeUpgradeConnection = function(cb) {
    if (this.options.crypto === 'starttls') {
      this.state = 'starttls';
      this.protocol.sendRequest('STLS', [], false, function(err, rsp) {
        if (err) {
          cb && cb({
            scope: 'connection',
            request: err.request,
            name: 'bad-security',
            message: err.getStatusLine(),
            response: err,
          });
          return;
        }
        this.socket.upgradeToSecure();
        cb();
      }.bind(this));
    } else {
      cb();
    }
  }

  /**
   * Set the current state to 'authorization' and attempts to
   * authenticate the user with any available authentication method.
   * We try APOP first if the server supports it, since we can avoid
   * replay attacks and authenticate in one roundtrip. Otherwise, we
   * try SASL AUTH PLAIN, which POP3 servers are (in theory) required
   * to support if they support SASL at all. Lastly, we fall back to
   * plain-old USER/PASS authentication if that's all we have left.
   *
   * Presently, if one authentication method fails for any reason, we
   * simply try the next. We could be smarter and drop out on
   * detecting a bad-user-or-pass error.
   */
  Pop3Client.prototype._thenAuthorize = function(cb) {
    this.state = 'authorization';

    this.authMethod = this.options.authMethods.shift();

    var user = this.options.username;
    var pass = this.options.password;
    var secret;
    switch(this.authMethod) {
    case 'apop':
      var match = /<.*?>/.exec(this._greetingLine || "");
      var apopTimestamp = match && match[0];
      if (!apopTimestamp) {
        // if the server doesn't support APOP, try the next method.
        this._thenAuthorize(cb);
      } else {
        secret = md5(apopTimestamp + pass);
        this.protocol.sendRequest(
          'APOP', [user, secret], false, function(err, rsp) {
          if (err) {
            this._greetingLine = null; // try without APOP
            this._thenAuthorize(cb);
          } else {
            cb(); // ready!
          }
        }.bind(this));
      }
      break;
    case 'sasl':
      secret = btoa(user + '\x00' + user + '\x00' + pass);
      this.protocol.sendRequest(
        'AUTH', ['PLAIN', secret], false, function(err, rsp) {
        if (err) {
          this._thenAuthorize(cb);
        } else {
          cb(); // ready!
        }
      }.bind(this));
      break;
    case 'user-pass':
    default:
      this.protocol.sendRequest('USER', [user], false, function(err, rsp) {
        if (err) {
          cb && cb({
            scope: 'authentication',
            request: err.request,
            name: 'bad-user-or-pass',
            message: err.getStatusLine(),
            response: err,
          });
          return;
        }
        this.protocol.sendRequest('PASS', [pass], false, function(err, rsp) {
          if (err) {
            cb && cb({
              scope: 'authentication',
              request: err.request,
              name: 'bad-user-or-pass',
              message: err.getStatusLine(),
              response: err,
            });
            return;
          }
          cb();
        }.bind(this));
      }.bind(this));
      break;
    }
  }

  /*********************************************************************
   * MESSAGE FETCHING
   *
   * POP3 does not support granular partial retrieval; we can only
   * download a given number of _lines_ of the message (including
   * headers). Thus, in order to download snippets of messages (rather
   * than just the entire body), we have to guess at how many lines
   * it'll take to get enough MIME data to be able to parse out a
   * text/plain snippet.
   *
   * For now, we'll try to download a few KB of the message, which
   * should give plenty of data to form a snippet. We're aiming for a
   * sweet spot, because if the message is small enough, we can just
   * download the whole thing and be done.
   */

  /**
   * Issue a QUIT command to the server, persisting any DELE message
   * deletions you've enqueued. This also closes the connection.
   */
  Pop3Client.prototype.quit = function(cb) {
    this.state = 'disconnected';
    this.protocol.sendRequest('QUIT', [], false, function(err, rsp) {
      this.disconnect();
      if (err) {
        cb && cb({
          scope: 'mailbox',
          request: err.request,
          name: 'server-problem',
          message: err.getStatusLine(),
          response: err,
        });
      } else {
        cb && cb();
      }
    }.bind(this));
  }

  /**
   * Load a mapping of server message numbers to UIDLs, so that we
   * can interact with messages stably across sessions. Additionally,
   * this fetches a LIST of the messages so that we have a list of
   * message sizes in addition to their UIDLs.
   */
  Pop3Client.prototype._loadMessageList = function(cb) {
    // if we've already loaded IDs this session, we don't need to
    // compute them again, because POP3 shows a frozen state of your
    // mailbox until you disconnect.
    if (this._messageList) {
      cb(null, this._messageList);
      return;
    }
    // First, get UIDLs for each message.
    this.protocol.sendRequest('UIDL', [], true, function(err, rsp) {
      if (err) {
        cb && cb({
          scope: 'mailbox',
          request: err.request,
          name: 'server-problem',
          message: err.getStatusLine(),
          response: err,
        });
        return;
      }

      var lines = rsp.getDataLines();
      for (var i = 0; i < lines.length; i++) {
        var words = lines[i].split(' ');
        var number = words[0];
        var uidl = words[1];
        this.idToUidl[number] = uidl;
        this.uidlToId[uidl] = number
      }
      // because POP3 servers process requests serially, the next LIST
      // will not run until after this completes.
    }.bind(this));

    // Then, get a list of messages so that we can track their size.
    this.protocol.sendRequest('LIST', [], true, function(err, rsp) {
      if (err) {
        cb && cb({
          scope: 'mailbox',
          request: err.request,
          name: 'server-problem',
          message: err.getStatusLine(),
          response: err,
        });
        return;
      }

      var lines = rsp.getDataLines();
      var allMessages = [];
      for (var i = 0; i < lines.length; i++) {
        var words = lines[i].split(' ');
        var number = words[0];
        var size = parseInt(words[1], 10);
        this.idToSize[number] = size;
        // Push the message onto the front, so that the last line
        // becomes the first message in allMessages. Most POP3 servers
        // seem to return messages in ascending date order, so we want
        // to process the newest messages first. (Tested with Dovecot,
        // Gmail, and AOL.) The resulting list here contains the most
        // recent message first.
        allMessages.unshift({
          uidl: this.idToUidl[number],
          size: size,
          number: number
        });
      }

      this._messageList = allMessages;
      cb && cb(null, allMessages);
    }.bind(this));
  }

  /**
   * Fetch the headers and snippets for all messages. Only retrieves
   * messages for which filterFunc(uidl) returns true.
   *
   * @param {object} opts
   * @param {function(uidl)} opts.filter Only store messages matching filter
   * @param {function(evt)} opts.progress Progress callback
   * @param {int} opts.checkpointInterval Call `checkpoint` every N messages
   * @param {int} opts.maxMessages Download _at most_ this many
   *   messages during this listMessages invocation. If we find that
   *   we would have to download more than this many messages, mark
   *   the rest as "overflow" messages that could be downloaded in a
   *   future sync iteration. (Default is infinite.)
   * @param {function(next)} opts.checkpoint Callback to periodically save state
   * @param {function(err, numSynced, overflowMessages)} cb
   *   Upon completion, returns the following data:
   *
   *   numSynced: The number of messages synced.
   *
   *   overflowMessages: An array of objects with the following structure:
   *
   *       { uidl: "", size: 0 }
   *
   *     Each message in overflowMessages was NOT downloaded. Instead,
   *     you should store those UIDLs for future retrieval as part of
   *     a "Download More Messages" operation.
   */
  Pop3Client.prototype.listMessages = function(opts, cb) {
    var filterFunc = opts.filter;
    var progressCb = opts.progress;
    var checkpointInterval = opts.checkpointInterval || null;
    var maxMessages = opts.maxMessages || Infinity;
    var checkpoint = opts.checkpoint;
    var overflowMessages = [];

    // Get a mapping of number->UIDL.
    this._loadMessageList(function(err, unfilteredMessages) {
      if (err) { cb && cb(err); return; }

      // Calculate which messages we would need to download.
      var totalBytes = 0;
      var bytesFetched = 0;
      var messages = [];
      var seenCount = 0;
      // Filter out unwanted messages.
      for (var i = 0; i < unfilteredMessages.length; i++) {
        var msgInfo = unfilteredMessages[i];
        if (!filterFunc || filterFunc(msgInfo.uidl)) {
          if (messages.length < maxMessages) {
            totalBytes += msgInfo.size;
            messages.push(msgInfo);
          } else {
            overflowMessages.push(msgInfo);
          }
        } else {
          seenCount++;
        }
      }

      console.log('POP3: listMessages found ' +
                  messages.length + ' new, ' +
                  overflowMessages.length + ' overflow, and ' +
                  seenCount + ' seen messages. New UIDLs:');

      messages.forEach(function(m) {
        console.log('POP3: ' + m.size + ' bytes: ' + m.uidl);
      });

      var totalMessages = messages.length;
      // If we don't provide a checkpoint interval, just do all
      // messages at once.
      if (!checkpointInterval) {
        checkpointInterval = totalMessages;
      }

      // Download all of the messages in batches.
      var nextBatch = function() {
        console.log('POP3: Next batch. Messages left: ' + messages.length);
        // If there are no more messages, we're done.
        if (!messages.length) {
          console.log('POP3: Sync complete. ' +
                      totalMessages + ' messages synced, ' +
                      overflowMessages.length + ' overflow messages.');
          cb && cb(null, totalMessages, overflowMessages);
          return;
        }

        var batch = messages.splice(0, checkpointInterval);
        var latch = allback.latch();

        // Trigger a download for every message in the batch.
        batch.forEach(function(m, idx) {
          var messageDone = latch.defer();
          this.downloadPartialMessageByNumber(m.number, function(err, msg) {
            bytesFetched += m.size;
            progressCb && progressCb({
              totalBytes: totalBytes,
              bytesFetched: bytesFetched,
              size: m.size,
              message: msg
            });
            messageDone(err);
          });
        }.bind(this));

        // When all messages in this batch have completed, trigger the
        // next batch to begin download. If `checkpoint` is provided,
        // we'll wait for it to tell us to continue (so that we can
        // save the database periodically or perform other
        // housekeeping during sync).
        latch.then(function(results) {
          console.log('POP3: Checkpoint.');
          if (checkpoint) {
            checkpoint(nextBatch);
          } else {
            nextBatch();
          }
        });
      }.bind(this);

      // Kick it off, maestro.
      nextBatch();

    }.bind(this));
  }

  /**
   * Retrieve the full body (+ attachments) of a message given a UIDL.
   *
   * @param {string} uidl The message's UIDL as reported by the server.
   */
  Pop3Client.prototype.downloadMessageByUidl = function(uidl, cb) {
    this._loadMessageList(function(err) {
      if (err) {
        cb && cb(err);
      } else {
        this.downloadMessageByNumber(this.uidlToId[uidl], cb);
      }
    }.bind(this));
  }

  /**
   * Retrieve a portion of one message. The returned message is
   * normalized to the format needed by GELAM according to
   * `parseMime`.
   *
   * @param {string} number The message number (on the server)
   * @param {function(err, msg)} cb
   */
  // XXX: TODO: There are some roundtrips between strings and buffers
  // here. This is generally safe (converting to and from UTF-8), but
  // it creates unnecessary garbage. Clean this up when we switch over
  // to jsmime.
  Pop3Client.prototype.downloadPartialMessageByNumber = function(number, cb) {
    // Based on SNIPPET_SIZE_GOAL, calculate approximately how many
    // lines we'll need to fetch in order to roughly retrieve
    // SNIPPET_SIZE_GOAL bytes.
    var numLines = Math.floor(syncbase.POP3_SNIPPET_SIZE_GOAL / 80);
    this.protocol.sendRequest('TOP', [number, numLines],
                              true, function(err, rsp) {
      if(err) {
        cb && cb({
          scope: 'message',
          request: err.request,
          name: 'server-problem',
          message: err.getStatusLine(),
          response: err,
        });
        return;
      }

      var fullSize = this.idToSize[number];
      var data = rsp.getDataAsString();
      var isSnippet = (!fullSize || data.length < fullSize);
      // If we didn't get enough data, msg.body.bodyReps may be empty.
      // The values we use for retrieving snippets are
      // sufficiently large that we really shouldn't run into this
      // case in nearly all cases. We assume that the UI will
      // handle this (exceptional) case reasonably.
      cb(null, this.parseMime(data, isSnippet, number));
    }.bind(this));
  }

  /**
   * Retrieve a message in its entirety, given a server-centric number.
   *
   * @param {string} number The message number (on the server)
   * @param {function(err, msg)} cb
   */
  Pop3Client.prototype.downloadMessageByNumber = function(number, cb) {
    this.protocol.sendRequest('RETR', [number], true, function(err, rsp) {
      if(err) {
        cb && cb({
          scope: 'message',
          request: err.request,
          name: 'server-problem',
          message: err.getStatusLine(),
          response: err,
        });
        return;
      }
      cb(null, this.parseMime(rsp.getDataAsString(), false, number));
    }.bind(this));
  }

  /**
   * Convert a MailParser-intermediate MIME tree to a structure
   * format as parsable with imapchew. This allows us to reuse much of
   * the parsing code and maintain parity between IMAP and POP3.
   */
  function mimeTreeToStructure(node, partId, partMap, partialNode) {
    var structure = [];
    var contentType = node.meta.contentType.split('/');
    var typeInfo = {};
    typeInfo.type = contentType[0];
    typeInfo.subtype = contentType[1];
    typeInfo.params = {};
    typeInfo.params.boundary = node.meta.mimeBoundary || null;
    typeInfo.params.format = node.meta.textFormat || null;
    typeInfo.params.charset = node.meta.charset || null;
    typeInfo.params.name = node.meta.fileName || null;
    if (node.meta.contentDisposition) {
      typeInfo.disposition = {
        type: node.meta.contentDisposition,
        params: {},
      };
      if (node.meta.fileName) {
        typeInfo.disposition.params.filename = node.meta.fileName;
      }
    }
    typeInfo.partID = partId || '1';
    typeInfo.id = node.meta.contentId;
    typeInfo.encoding = 'binary'; // we already decoded it
    typeInfo.size = node.content && node.content.length || 0;
    typeInfo.description = null; // unsupported (unnecessary)
    typeInfo.lines = null; // unsupported (unnecessary)
    typeInfo.md5 = null; // unsupported (unnecessary)

    // XXX: see ActiveSync Folder._updateBody. Unit tests get angry if
    // there's a trailing newline in a body part.
    if (node.content != null) {
      if (typeInfo.type === 'text' &&
          node.content.length &&
          node.content[node.content.length - 1] === '\n') {
        node.content = node.content.slice(0, -1);
        typeInfo.size--;
      }
      partMap[typeInfo.partID] = node.content;
      // If this node was only partially downloaded, note it as such
      // in a special key on partMap. We'll use this key to later
      // indicate that this part's size should be calculated based on
      // the bytes we have not downloaded yet.
      if (partialNode === node) {
        partMap['partial'] = typeInfo.partID;
      }
    }

    structure.push(typeInfo);
    if (node.childNodes.length) {
      for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        structure.push(mimeTreeToStructure(
          child, typeInfo.partID + '.' + (i + 1), partMap, partialNode));
      }
    }
    return structure;
  }

  // This function is made visible for test logic external to this module.
  Pop3Client.parseMime = function(content) {
    return Pop3Client.prototype.parseMime.call(this, content);
  }

  Pop3Client.prototype.parseMime = function(mimeContent, isSnippet, number) {
    var mp = new mailparser.MailParser();
    mp._write(mimeContent);
    mp._process(true);
    var rootNode = mp.mimeTree;
    var partialNode = (isSnippet ? mp._currentNode : null);
    var estSize = number && this.idToSize[number] || mimeContent.length;
    var content;

    var partMap = {}; // partId -> content
    var msg = {
      id: number && this.idToUidl[number], // the server-given ID
      msg: rootNode,
      date: rootNode.meta.date && rootNode.meta.date.valueOf(),
      flags: [],
      structure: mimeTreeToStructure(rootNode, '1', partMap, partialNode),
    };

    var rep = imapchew.chewHeaderAndBodyStructure(msg, null, null);
    var bodyRepIdx = imapchew.selectSnippetBodyRep(rep.header, rep.bodyInfo);

    // Calculate the proper size for all of the parts. Any part we've
    // seen will have been fully downloaded, so we have the whole
    // thing. We must just attribute the rest of the size to the one
    // unfinished part, whose partId is stored in partMap['partial'].
    var partSizes = {};
    var usedSize = 0;
    var partialPartKey = partMap['partial'];
    for (var k in partMap) {
      if (k === 'partial') { continue; };
      if (k !== partialPartKey) {
        usedSize += partMap[k].length;
        partSizes[k] = partMap[k].length;
      }
    }
    if (partialPartKey) {
      partSizes[partialPartKey] = estSize - usedSize;
    }

    for (var i = 0; i < rep.bodyInfo.bodyReps.length; i++) {
      var bodyRep = rep.bodyInfo.bodyReps[i];
      content = partMap[bodyRep.part];
      if (content != null) {
        var req = {
          // If bytes is null, imapchew.updateMessageWithFetch knows
          // that we've fetched the entire thing. Passing in [-1, -1] as a
          // range tells imapchew that we're not done downloading it yet.
          bytes: (partialPartKey === bodyRep.part ? [-1, -1] : null),
          bodyRepIndex: i,
          createSnippet: i === bodyRepIdx,
        };
        bodyRep.size = partSizes[bodyRep.part];
        var res = {bytesFetched: content.length, text: content};
        imapchew.updateMessageWithFetch(
          rep.header, rep.bodyInfo, req, res, this._LOG);
      }
    }


    // Convert attachments and related parts to Blobs if we've
    // downloaded the whole thing:

    for (var i = 0; i < rep.bodyInfo.relatedParts.length; i++) {
      var relatedPart = rep.bodyInfo.relatedParts[i];
      relatedPart.sizeEstimate = partSizes[relatedPart.part];
      content = partMap[relatedPart.part];
      if (content != null && partialPartKey !== relatedPart.part) {
        relatedPart.file = new Blob([content], {type: relatedPart.type});
      }
    }

    for (var i = 0; i < rep.bodyInfo.attachments.length; i++) {
      var att = rep.bodyInfo.attachments[i];
      content = partMap[att.part];
      att.sizeEstimate = partSizes[att.part];
      if (content != null && partialPartKey !== att.part &&
          mimeMapper.isSupportedType(att.type)) {
        att.file = new Blob([content], {type: att.type});
      }
    }

    // If it's a snippet and we aren't sure that we have attachments,
    // guess based on what we know.
    if (isSnippet &&
        !rep.header.hasAttachments &&
        (rootNode.parsedHeaders['x-ms-has-attach'] ||
         rootNode.meta.mimeMultipart === 'mixed' ||
         estSize > syncbase.POP3_INFER_ATTACHMENTS_SIZE)) {
      rep.header.hasAttachments = true;
    }

    // If we haven't downloaded the entire message, we need to have
    // some way to tell the UI that we actually haven't downloaded all
    // of the bodyReps yet. We add this fake bodyRep here, indicating
    // that it isn't fully downloaded, so that when the user triggers
    // downloadBodyReps, we actually try to fetch the message. In
    // POP3, we _don't_ know that we have all bodyReps until we've
    // downloaded the whole thing. There could be parts hidden in the
    // data we haven't downloaded yet.
    rep.bodyInfo.bodyReps.push({
      type: 'fake', // not 'text' nor 'html', so it won't be rendered
      part: 'fake',
      sizeEstimate: 0,
      amountDownloaded: 0,
      isDownloaded: !isSnippet,
      content: null,
      size: 0,
    });

    // POP3 can't display the completely-downloaded-body until we've
    // downloaded the entire message, including attachments. So
    // unfortunately, no matter how much we've already downloaded, if
    // we haven't downloaded the whole thing, we can't start from the
    // middle.
    rep.header.bytesToDownloadForBodyDisplay = (isSnippet ? estSize : 0);

    // to fill: suid, id
    return rep;
  }

  /**
   * Display a buffer in a debug-friendly printable format, with
   * CRLFs escaped for easy protocol verification.
   */
  function bufferToPrintable(line) {
    var s = '';
    if (Array.isArray(line)) {
      line.forEach(function(l) {
        s += bufferToPrintable(l) + '\n';
      });
      return s;
    }
    for (var i = 0; i < line.length; i++) {
      var c = String.fromCharCode(line[i]);
      if (c === '\r') { s += '\\r'; }
      else if (c === '\n') { s += '\\n'; }
      else { s += c; }
    }
    return s;
  }

var LOGFAB = exports.LOGFAB = log.register(module, {
  Pop3Client: {
    type: log.CONNECTION,
    subtype: log.CLIENT,
    events: {
    },
    TEST_ONLY_events: {
    },
    errors: {
      htmlParseError: { ex: log.EXCEPTION },
      htmlSnippetError: { ex: log.EXCEPTION },
      textChewError: { ex: log.EXCEPTION },
      textSnippetError: { ex: log.EXCEPTION },
    },
    asyncJobs: {
    },
  },
}); // end LOGFAB

Pop3Client._LOG = LOGFAB.Pop3Client();

}); // end define
;
define('mailapi/pop3/sync',['rdcommon/log', '../util', 'module', 'require', 'exports',
        '../mailchew', '../syncbase', '../date', '../jobmixins',
        '../allback', 'pop3/pop3'],
function(log, util, module, require, exports,
         mailchew, sync, date, jobmixins,
         allback, pop3) {

var PASTWARDS = 1;

/**
 * Manage the synchronization process for POP3 accounts. In IMAP and
 * ActiveSync, the work of this class is split in two (a `folderConn`
 * and syncer), but since POP3 has no concept of folders, the syncer
 * manages everything itself.
 *
 * This class still gets created for each folder for compatibiliy with
 * IMAP/ActiveSync, but we fast-path out of sync operations if the
 * folder we're looking at isn't the inbox.
 */
function Pop3FolderSyncer(account, storage, _parentLog) {
  this._LOG = LOGFAB.Pop3FolderSyncer(this, _parentLog, storage.folderId);
  this.account = account;
  this.storage = storage;
  // Only sync folders if this is the inbox. Other folders are client-side only.
  this.isInbox = (storage.folderMeta.type === 'inbox');
}
exports.Pop3FolderSyncer = Pop3FolderSyncer;

/**
 * Wrap a function with connection handling, as follows:
 * - If a successful connection can be established, fn gets called with
 *   a connection and the rest of the arguments. The argument at index
 *   cbIndex is wrapped to automatically call the connection `done`
 *   callback.
 * - If connection fails, the argument at index cbIndex is called with
 *   the connection error.
 *
 * @param {boolean} getNew If a fresh connection should always be made.
 * @param {int} cbIndex Index of the parent function's callback in args
 * @param {string} whyLabel Description for why we need the connection
 */
function lazyWithConnection(getNew, cbIndex, whyLabel, fn) {
  return function pop3LazyWithConnection() {
    var args = Array.slice(arguments);
    require([], function () {
      var next = function() {
        // Only the inbox actually needs a connection. Using the
        // connection in a non-inbox folder is an error.
        if (!this.isInbox) {
          fn.apply(this, [null].concat(args));
          return;
        }

        this.account.withConnection(function (err, conn, done) {
          var callback = args[cbIndex];
          if (err) {
            callback && callback(err);
          } else {
            args[cbIndex] = function lazyDone() {
              done();
              callback && callback();
            };
            fn.apply(this, [conn].concat(args));
          }
        }.bind(this), whyLabel);
      }.bind(this);

      // if we require a fresh connection, close out the old one first.
      if (getNew && this.account._conn &&
          this.account._conn.state !== 'disconnected') {
        this.account._conn.quit(next);
      } else {
        next();
      }
    }.bind(this));
  };
};

Pop3FolderSyncer.prototype = {
  syncable: true,
  get canGrowSync() {
    // Only the inbox can be grown in POP3.
    return this.isInbox;
  },

  /**
   * Given a list of messages, download snippets for those that don't
   * already have snippets. You need to pass an options argument so we
   * only download a snippet. If you don't do that, you are doing
   * something wrong. downloadBodyReps is the one that is for full
   * body part/message downloading. XXX rename this family of methods.
   */
  downloadBodies: lazyWithConnection(/* getNew = */ false, /* cbIndex = */ 2,
    /* whyLabel = */ 'downloadBodies',
  function(conn, headers, options, callback) {
    var latch = allback.latch();
    var storage = this.storage;

    for (var i = 0; i < headers.length; i++) {
      if (headers[i] && headers[i].snippet == null) {
        this.downloadBodyReps(headers[i], options, latch.defer(i));
      }
    }

    latch.then(function(results) {
      var err = null; // pull out the first error, if it exists
      for (var k in results) {
        err = results[k][0];
      }
      storage.runAfterDeferredCalls(function() {
        callback(err, headers.length);
      });
    });
  }),

  /**
   * Download the full body of a message. POP3 does not distinguish
   * between message bodies and attachments, so we must retrieve them
   * all in one go.
   */
  downloadBodyReps: lazyWithConnection(/* getNew = */ false, /* cbIndex = */ 2,
    /* whyLabel = */ 'downloadBodyReps',
  function(conn, header, options, callback) {
    if (options instanceof Function) {
      callback = options;
      options = {};
    }

    console.log('POP3: Downloading bodyReps for UIDL ' + header.srvid);

    conn.downloadMessageByUidl(header.srvid, function(err, message) {
      if (err) { callback(err); return; }
      // Don't overwrite the header, because it contains useful
      // identifiers like `suid` and things we want. Plus, with POP3,
      // the server's headers will always be the same.
      // However, we do need header.bytesToDownloadForBodyDisplay:
      header.bytesToDownloadForBodyDisplay =
        message.header.bytesToDownloadForBodyDisplay;
      console.log('POP3: Storing message ' + header.srvid +
                  ' with ' + header.bytesToDownloadForBodyDisplay +
                  ' bytesToDownload.');
      // Force a flush if there were any attachments so that any memory-backed
      // Blobs get replaced with their post-save disk-backed equivalent so they
      // can be garbage collected.
      var flush = message.bodyInfo.attachments.length > 0;
      this.storeMessage(header, message.bodyInfo, { flush: flush }, function() {
        callback && callback(null, message.bodyInfo, flush);
      });
    }.bind(this));
  }),

  downloadMessageAttachments: function(uid, partInfos, callback, progress) {
    // We already retrieved the attachments in downloadBodyReps, so
    // this function should never be invoked (because callers would
    // have seen that all relevant partInfos have set `isDownloaded`
    // to true). Either way, there's nothing to do here.
    console.log('POP3: ERROR: downloadMessageAttachments called and ' +
                'POP3 shouldn\'t do that.');
    callback(null, null);
  },

  /**
   * Store a message. Depending on whether or not we've seen the
   * message before, we'll either add it as a new message in storage
   * or update the existing one.
   *
   * Our current POP3 implementation does not automatically delete
   * messages from the server when they've been fetched, so we need to
   * track which messages we've downloaded already and which ones are
   * new. Unfortunately, this means that our sync with the server will
   * take progressively longer as the server accumulates more messages
   * in its store.
   *
   * Some servers might potentially "window" messages, such that the
   * oldest messages in the message list might just drop off the
   * server's list. If so, this code doesn't change; new messages will
   * continue to be newly stored, and old messages will still be
   * known.
   *
   * @param {HeaderInfo} header Message header.
   * @param {BodyInfo} bodyInfo Body information, reps, etc.
   * @param {Object} options
   * @param {Boolean} options.flush Force a flush so the message gets reloaded,
   *                                replacing memory-backed Blobs with
   *                                disk-backed ones?
   * @param {function()} callback
   */
  storeMessage: function(header, bodyInfo, options, callback) {
    callback = callback || function() {};
    var event = {
      changeDetails: {}
    };

    var knownId = this.getMessageIdForUidl(header.srvid);

    if (header.id == null) { // might be zero.
      if (knownId == null) {
        header.id = this.storage._issueNewHeaderId();
      } else {
        header.id = knownId;
      }
      header.suid = this.storage.folderId + '/' + header.id;
      header.guid = header.guid || header.srvid;
    }

    // Save all included attachments before actually storing the
    // message. Downloaded attachments must be converted from a blob
    // to a file on disk.
    var latch = allback.latch();
    var self = this;

    for (var i = 0; i < bodyInfo.attachments.length; i++) {
      var att = bodyInfo.attachments[i];
      if (att.file instanceof Blob) {
        // We want to save attachments to device storage (sdcard),
        // rather than IndexedDB. NB: This will change when download
        // manager comes.
        console.log('Saving attachment', att.file);
        jobmixins.saveToDeviceStorage(
          this._LOG, att.file, 'sdcard', att.name, att, latch.defer());
        // When saveToDeviceStorage completes, att.file will
        // be a reference to the file on the sdcard.
      }
    }

    latch.then(function() {
      // Once the attachments have been downloaded, we can store the
      // message. Here, we wait to call back from storeMessage() until
      // we've saved _both_ the header and body.
      latch = allback.latch();

      if (knownId == null) {
        self.storeMessageUidlForMessageId(header.srvid, header.id);
        self.storage.addMessageHeader(header, latch.defer());
        self.storage.addMessageBody(header, bodyInfo, latch.defer());
      } else {
        self.storage.updateMessageHeader(
          header.date, header.id, true, header, latch.defer());
        event.changeDetails.attachments = range(bodyInfo.attachments.length);
        event.changeDetails.bodyReps = range(bodyInfo.bodyReps.length);
        var updateOptions = {};
        if (options.flush) {
          updateOptions.flushBecause = 'blobs';
        }
        self.storage.updateMessageBody(
          header, bodyInfo, updateOptions, event, latch.defer());
      }

      latch.then(function() {
        callback(null, bodyInfo);
      });
    });
  },

  /**
   * Return the folderMeta for the INBOX, upon which we store the
   * uidlMap and overflowMap. Cache it for performance, since this
   * function gets invoked frequently.
   */
  get inboxMeta() {
    // Override this getter to provide direct access in the future.
    return (this.inboxMeta = this.account.getFolderMetaForFolderId(
      this.account.getFirstFolderWithType('inbox').id));
  },

  /**
   * Retrieve the message's id (header.id) given a server's UIDL.
   *
   * CAUTION: Zero is a valid message ID. I made the mistake of doing
   * boolean comparisons on header IDs and that is a BAD IDEA. <3
   * Hence the `== null` checks in a few places in this file.
   */
  getMessageIdForUidl: function(uidl) {
    if (uidl == null) {
      return null;
    }
    this.inboxMeta.uidlMap = this.inboxMeta.uidlMap || {};
    return this.inboxMeta.uidlMap[uidl];
  },

  /**
   * Store the given message UIDL so that we know it has already been
   * downloaded. If the message was previously marked as overflow,
   * remove it from the overflow map because we know about it now.
   */
  storeMessageUidlForMessageId: function(uidl, headerId) {
    this.inboxMeta.uidlMap = this.inboxMeta.uidlMap || {};
    this.inboxMeta.uidlMap[uidl] = headerId;
    if (this.inboxMeta.overflowMap) {
      delete this.inboxMeta.overflowMap[uidl];
    }
  },

  /**
   * Mark the given message UIDL as being an "overflow message"; that
   * is, it was NOT downloaded and should be made available to
   * download during a "download more messages..." operation.
   *
   * This data is stored in INBOX's folderMeta like so:
   *
   * overflowMap: {
   *   "(message uidl)": { size: 0 },
   *   ...
   * }
   */
  storeOverflowMessageUidl: function(uidl, size) {
    this.inboxMeta.overflowMap = this.inboxMeta.overflowMap || {};
    this.inboxMeta.overflowMap[uidl] = { size: size };
  },

  /**
   * Return true if there are overflow messages. (If so, we're NOT
   * synced to the dawn of time.)
   */
  hasOverflowMessages: function() {
    if (!this.inboxMeta.overflowMap) { return false; }
    for (var key in this.inboxMeta.overflowMap) {
      return true; // if there's even a single key, we have some!
    }
    return false;
  },

  /**
   * Return whether or not the given UIDL is in the overflow map.
   */
  isUidlInOverflowMap: function(uidl) {
    if (!this.inboxMeta.overflowMap) { return false; }
    return !!this.inboxMeta.overflowMap[uidl];
  },

  /**
   * Sync the inbox for the first time. Since we set `ignoreHeaders`
   * to true, we'll notify mail slices to update after the entire sync
   * completes, so that all messages show up at once rather than one
   * at a time.
   */
  initialSync: function(slice, initialDays, syncCb, doneCb, progressCb) {
    syncCb('sync', true /* ignoreHeaders */);
    this.sync('initial', slice, doneCb, progressCb);
  },

  /**
   * Sync the inbox for a refresh. This is the same as initialSync for
   * POP3, except that we notify slices immediately upon receiving
   * each new message individually.
   */
  refreshSync: function(
      slice, dir, startTS, endTS, origStartTS, doneCb, progressCb) {
    this.sync('refresh', slice, doneCb, progressCb);
  },

  /**
   * The unit tests issue "delete on server but not locally" commands.
   * In order to mimic operations where we modify non-INBOX folders on
   * the server and expect to learn about them from the client on
   * sync, we queue up "server-only" modifications and execute them
   * upon sync. This allows us to reuse much of the existing tests for
   * certain folder operations, and becomes a no-op in production.
   */
  _performTestDeletions: function(cb) {
    var meta = this.storage.folderMeta;
    var callbacksWaiting = 1;
    var numAdds = 0;
    var latch = allback.latch();
    if (meta._TEST_pendingHeaderDeletes) {
      meta._TEST_pendingHeaderDeletes.forEach(function(header) {
        callbacksWaiting++;
        this.storage.deleteMessageHeaderUsingHeader(header, latch.defer());
      }, this);
      meta._TEST_pendingHeaderDeletes = null;
    }
    if (meta._TEST_pendingAdds) {
      meta._TEST_pendingAdds.forEach(function(msg) {
        callbacksWaiting++;
        this.storeMessage(msg.header, msg.bodyInfo, {}, latch.defer());
      }, this);
      meta._TEST_pendingAdds = null;
    }
    latch.then(function(results) { cb(); });
  },

  /**
   * If we have overflow messages, fetch them here.
   */
  growSync: function(slice, growthDirection, anchorTS, syncStepDays,
                     doneCallback, progressCallback) {
    if (growthDirection !== PASTWARDS || !this.hasOverflowMessages()) {
      return false;
    }

    // For simplicity, we ignore anchorTS and syncStepDays, because
    // POP3's limitations make it difficult to infer anything about
    // the messages we're going to download now. All we can do here is
    // download another batch of overflow messages.
    this.sync('grow', slice, doneCallback, progressCallback);
    return true;
  },

  allConsumersDead: function() {
    // Nothing to do here.
  },

  shutdown: function() {
    // No real cleanup necessary here; just log that we died.
    this._LOG.__die();
  },

  /**
   * Pull down new headers from the server, attempting to fetch
   * snippets for the messages.
   *
   * Pop3Client (in pop3.js) contains the variables used to determine
   * how much of each message to fetch. Since POP3 only lets us
   * download a certain number of _lines_ from the message, Pop3Client
   * selects an appropriate snippet size (say, 4KB) and attempts to
   * fetch approximately that much data for each message. That value
   * is/should be high enough that we get snippets for nearly all
   * messages, unless a message is particularly strange.
   *
   * Additionally, we don't delete messages from the server. This
   * means that when we attempt to list messages, we'll see new
   * messages along with messages we've seen before. To ensure we only
   * retrieve messages we don't know about, we keep track of message
   * unique IDs (UIDLs) and only download new messages.
   *
   * OVERFLOW MESSAGE HANDLING:
   *
   * We don't want to overwhelm a sync with a ridiculous number of
   * messages if the spool has a lot of new messagse. Instead of
   * blindly downloading all headers right away, we store excess
   * "overflow" messages for future "grow" syncs, e.g. when the user
   * clicks "Get More Messages" in the message list.
   *
   * This works as follows:
   *
   * If we're syncing normally, mark any excess messages as overflow
   * messages and don't download them. This is handled largely by
   * Pop3Client by the maxMessages option to listMessages(). We ignore
   * any messages already marked as overflow for the purposes of the
   * sync filter.
   *
   * If this is a grow sync, i.e. we want to download some overflow
   * messages, we set the download filter to _only_ include overflow
   * UIDLs. We may still have _more_ overflow messages, but that's
   * okay, because they'll just be stored in the overflowMap like
   * normal, for a future "grow" sync. Any messages we do download are
   * marked as stored and removed from the overflowMap (in
   * `this.storeMessageUidlForMessageId`).
   */
  sync: lazyWithConnection(/* getNew = */ true, /* cbIndex = */ 2,
  /* whyLabel = */ 'sync',
  function(conn, syncType, slice, doneCallback, progressCallback) {
    // if we could not establish a connection, abort the sync.
    var self = this;
    this._LOG.sync_begin();

    // Only fetch info for messages we don't already know about.
    var filterFunc;
    if (syncType !== 'grow') {
      // In a regular sync, download any message that we don't know
      // about that isn't in the overflow map.
      filterFunc = function(uidl) {
        return self.getMessageIdForUidl(uidl) == null && // might be 0
          !self.isUidlInOverflowMap(uidl);
      };
    } else /* (syncType === 'grow') */ {
      // In a 'grow' sync, ONLY download overflow messages.
      filterFunc = this.isUidlInOverflowMap.bind(this);
    }

    var bytesStored = 0;
    var numMessagesSynced = 0;
    var latch = allback.latch();

    if (!this.isInbox) {
      slice.desiredHeaders = (this._TEST_pendingAdds &&
                              this._TEST_pendingAdds.length);
      this._performTestDeletions(latch.defer());
    } else {
      var fetchDoneCb = latch.defer();

      // Fetch messages, ensuring that we don't actually store them all in
      // memory so as not to burden memory unnecessarily.
      conn.listMessages({
        filter: filterFunc,
        checkpointInterval: sync.POP3_SAVE_STATE_EVERY_N_MESSAGES,
        maxMessages: sync.POP3_MAX_MESSAGES_PER_SYNC,
        checkpoint: function(next) {
          // Every N messages, wait for everything to be stored to
          // disk and saved in the database. Then proceed.
          this.storage.runAfterDeferredCalls(function() {
            this.account.__checkpointSyncCompleted(next);
          }.bind(this));
        }.bind(this),
        progress: function fetchProgress(evt) {
          // Store each message as it is retrieved.
          var totalBytes = evt.totalBytes;
          var message = evt.message;
          var messageCb = latch.defer();

          this.storeMessage(message.header, message.bodyInfo, {}, function() {
            bytesStored += evt.size;
            numMessagesSynced++;
            progressCallback(0.1 + 0.7 * bytesStored / totalBytes);
            messageCb();
          });
        }.bind(this),
      }, function fetchDone(err, numSynced, overflowMessages) {
        // Upon downloading all of the messages, we MUST issue a QUIT
        // command. This will tear down the connection, however if we
        // don't, we will never receive notifications of new messages.
        // If we deleted any messages on the server (which we don't),
        // the QUIT command is what would actually cause those to be
        // persisted. In the future, when we support server-side
        // deletion, we should ensure that this QUIT does not
        // inadvertently commit unintended deletions.
        conn.quit();

        if (err) {
          doneCallback(err);
          return;
        }

        // If there were excess messages, mark them for later download.
        if (overflowMessages.length) {
          overflowMessages.forEach(function(message) {
            this.storeOverflowMessageUidl(message.uidl, message.size);
          }, this);
          this._LOG.overflowMessages(overflowMessages.length);
        }

        // When all of the messages have been persisted to disk, indicate
        // that we've successfully synced. Refresh our view of the world.
        this.storage.runAfterDeferredCalls(fetchDoneCb);
      }.bind(this));
    }

    latch.then((function onSyncDone() {
      this._LOG.sync_end();

      // Because POP3 has no concept of syncing discrete time ranges,
      // we have to trick the storage into marking everything synced
      // _except_ the dawn of time. This has to be slightly later than
      // a value that would be interpreted as the dawn of time -- in
      // this case, it has to be one day plus one. Ideally, this
      // should be abstracted a little better; it's mostly IMAP that
      // needs more involved logic.
      this.storage.markSyncRange(
        sync.OLDEST_SYNC_DATE + date.DAY_MILLIS + 1,
        date.NOW(), 'XXX', date.NOW());

      if (!this.hasOverflowMessages()) {
        this.storage.markSyncedToDawnOfTime();
      }

      this.account.__checkpointSyncCompleted();
      if (syncType === 'initial') {
        // If it's the first time we've synced, we've set
        // ignoreHeaders to true, which means that slices don't know
        // about new messages. We'll reset ignoreHeaders to false
        // here, and then instruct the database to load messages
        // again.
        //
        // We're waiting for the database to settle. Since POP3
        // doesn't guarantee message ordering (in terms of listing
        // messages in your maildrop), if we just blindly updated the
        // current slice, the UI might frantically update as new
        // messages come in. So for the initial sync, just batch them
        // all in.
        this.storage._curSyncSlice.ignoreHeaders = false;
        this.storage._curSyncSlice.waitingOnData = 'db';
        this.storage.getMessagesInImapDateRange(
          sync.OLDEST_SYNC_DATE, null,
          sync.INITIAL_FILL_SIZE, sync.INITIAL_FILL_SIZE,
          // Don't trigger a refresh; we just synced. Accordingly,
          // releaseMutex can be null.
          this.storage.onFetchDBHeaders.bind(
            this.storage, this.storage._curSyncSlice,
            false, doneCallback, null));
      } else {
        doneCallback(null, null);
      }
    }).bind(this));

  }),
};

/** Return an array with the integers [0, end). */
function range(end) {
  var ret = [];
  for (var i = 0; i < end; i++) {
    ret.push(i);
  }
  return ret;
}

var LOGFAB = exports.LOGFAB = log.register(module, {
  Pop3FolderSyncer: {
    type: log.CONNECTION,
    subtype: log.CLIENT,
    events: {
      savedAttachment: { storage: true, mimeType: true, size: true },
      saveFailure: { storage: false, mimeType: false, error: false },
      overflowMessages: { count: true },
    },
    TEST_ONLY_events: {
    },
    errors: {
      callbackErr: { ex: log.EXCEPTION },

      htmlParseError: { ex: log.EXCEPTION },
      htmlSnippetError: { ex: log.EXCEPTION },
      textChewError: { ex: log.EXCEPTION },
      textSnippetError: { ex: log.EXCEPTION },

      // Attempted to sync with an empty or inverted range.
      illegalSync: { startTS: false, endTS: false },
    },
    asyncJobs: {
      sync: {},
      syncDateRange: {
        newMessages: true, existingMessages: true, deletedMessages: true,
        start: false, end: false, skewedStart: false, skewedEnd: false,
      },
    },
  },
}); // end LOGFAB

}); // end define
;
define('mailapi/pop3/jobs',['module', 'exports', 'rdcommon/log', '../allback', 'mix',
        '../jobmixins', '../drafts/jobs', 'pop3/pop3'],
       function(module, exports, log, allback, mix,
                jobmixins, draftsJobs, pop3) {

/**
 * Manage the jobs for a POP3 account. POP3 does not support
 * server-side folders, so many of these operations are local-only.
 * Operations not implemented in the Pop3JobDriver are ignored and
 * assumed unsupported. For instance, issuing a "move" command will
 * execute local_do_move, but not do_move. It is assumed that unit
 * tests will ensure we've implemented all required jobs.
 */
function Pop3JobDriver(account, state, _parentLog) {
  this._LOG = LOGFAB.Pop3JobDriver(this, _parentLog, account.id);

  this.account = account;
  this.resilientServerIds = true; // once assigned, the server never changes IDs
  this._heldMutexReleasers = [];

  // For tracking state as used in jobmixins:
  this._stateDelta = {};
  this._state = state;
  if (!state.hasOwnProperty('suidToServerId')) {
    state.suidToServerId = {};
    state.moveMap = {};
  }
}
exports.Pop3JobDriver = Pop3JobDriver;
Pop3JobDriver.prototype = {

  /**
   * Request access to a POP3 folder for mutation. This acquires a
   * write mutex on the FolderStorage. The callback will be invoked
   * with the folder and the raw connection.
   *
   * There is no need to explicitly release the connection when done;
   * it will be automatically released when the mutex is released if
   * desirable.
   *
   * This function is used by jobmixins.
   */
  _accessFolderForMutation: function(
      folderId, needConn, callback, deathback, label) {
    var storage = this.account.getFolderStorageForFolderId(folderId);
    storage.runMutexed(label, function(releaseMutex) {
      this._heldMutexReleasers.push(releaseMutex);
      try {
        // The folderSyncer is like IMAP/ActiveSync's folderConn.
        callback(storage.folderSyncer, storage);
      } catch (ex) {
        this._LOG.callbackErr(ex);
      }
    }.bind(this));
  },

  /**
   * Create a folder locally. (Again, no remote folders, so
   * do_createFolder is not implemented.)
   */
  local_do_createFolder: function(op, callback) {
    var path, delim, parentFolderId = null, depth = 0;

    if (op.parentFolderId) {
      if (!this.account._folderInfos.hasOwnProperty(op.parentFolderId)) {
        throw new Error("No such folder: " + op.parentFolderId);
      }
      var parentFolder = this.account._folderInfos[op.parentFolderId];
      delim = parentFolder.$meta.delim;
      path = parentFolder.$meta.path + delim;
      parentFolderId = parentFolder.$meta.id;
      depth = parentFolder.depth + 1;
    }
    else {
      path = '';
      delim = this.account.meta.rootDelim;
    }

    if (typeof(op.folderName) === 'string')
      path += op.folderName;
    else
      path += op.folderName.join(delim);
    if (op.containOnlyOtherFolders) {
      path += delim;
    }

    if (this.account.getFolderByPath(path)) {
      callback(null);
    } else {
      var folderMeta = self.account._learnAboutFolder(
          op.folderName, path, parentFolderId, 'normal', delim, depth);
      callback(null, folderMeta);
    }
  },

  /**
   * Delete old messages from disk. Since we currently leave mail on
   * the server, we won't incur permanent data loss.
   */
  local_do_purgeExcessMessages: function(op, callback) {
    this._accessFolderForMutation(
      op.folderId, false,
      function withMutex(_ignoredConn, storage) {
        storage.purgeExcessMessages(function(numDeleted, cutTS) {
          // Indicate that we want a save performed if any messages got deleted.
          callback(null, null, numDeleted > 0);
        });
      },
      null,
      'purgeExcessMessages');
  },

  local_do_saveSentDraft: function(op, callback) {
    var self = this;
    this._accessFolderForMutation(
      op.folderId, /* needConn*/ false,
      function(nullFolderConn, folderStorage) {
        var latch = allback.latch();

        folderStorage.addMessageHeader(op.headerInfo, latch.defer());
        folderStorage.addMessageBody(op.headerInfo, op.bodyInfo, latch.defer());

        latch.then(function(results) {
          // header/body insertion can't fail
          callback(null, null, /* save */ true);
        });
      },
      /* no conn => no deathback required */ null,
      'saveSentDraft');
  },

  do_syncFolderList: function(op, doneCallback) {
    this.account.meta.lastFolderSyncAt = Date.now();
    doneCallback(null);
  },

  /** No-op to silence warnings. Perhaps implement someday. */
  do_modtags: function(op, doneCallback) {
    doneCallback(null);
  },

  /** No-op to silence warnings. Perhaps implement someday. */
  undo_modtags: function(op, doneCallback) {
    doneCallback(null);
  },

  // Local modifications (move, delete, and modtags) simply reuse the
  // jobmixins implementation. No server-side implementations are
  // necessary here, so they are omitted.
  local_do_modtags: jobmixins.local_do_modtags,
  local_undo_modtags: jobmixins.local_undo_modtags,
  local_do_move: jobmixins.local_do_move,
  local_undo_move: jobmixins.local_undo_move,
  local_do_delete: jobmixins.local_do_delete,
  local_undo_delete: jobmixins.local_undo_delete,

  // Download operations (for attachments) are irrelevant because
  // downloading the bodies always fetches the attachments too.

  local_do_downloadBodies: jobmixins.local_do_downloadBodies,
  do_downloadBodies: jobmixins.do_downloadBodies,
  check_downloadBodies: jobmixins.check_downloadBodies,

  check_downloadBodyReps: jobmixins.check_downloadBodyReps,
  do_downloadBodyReps: jobmixins.do_downloadBodyReps,
  local_do_downloadBodyReps: jobmixins.local_do_downloadBodyReps,

  // These utility functions are necessary.
  postJobCleanup: jobmixins.postJobCleanup,
  allJobsDone: jobmixins.allJobsDone,
  _partitionAndAccessFoldersSequentially:
      jobmixins._partitionAndAccessFoldersSequentially
};

mix(Pop3JobDriver.prototype, draftsJobs.draftsMixins);


var LOGFAB = exports.LOGFAB = log.register(module, {
  Pop3JobDriver: {
    type: log.DAEMON,
    events: {
      savedAttachment: { storage: true, mimeType: true, size: true },
      saveFailure: { storage: false, mimeType: false, error: false },
    },
    TEST_ONLY_events: {
      saveFailure: { filename: false },
    },
    asyncJobs: {
      acquireConnWithoutFolder: { label: false },
    },
    errors: {
      callbackErr: { ex: log.EXCEPTION },
    },
  },
});

}); // end define
;
define('mailapi/pop3/account',['rdcommon/log', '../errbackoff', '../composite/incoming', './sync',
        './jobs', '../drafts/draft_rep', 'module', 'require', 'exports'],
function(log, errbackoff, incoming, pop3sync,
         pop3jobs, draftRep, module, require, exports) {
var CompositeIncomingAccount = incoming.CompositeIncomingAccount;

/**
 * Define a POP3 account. Much of the functionality here is similar
 * to IMAP; Pop3Account inherits the shared parts from
 * CompositeIncomingAccount.
 */
function Pop3Account(universe, compositeAccount, accountId, credentials,
                     connInfo, folderInfos, dbConn, _parentLog,
                     existingProtoConn) {
  this._LOG = LOGFAB.Pop3Account(this, _parentLog, accountId);
  CompositeIncomingAccount.apply(
      this, [pop3sync.Pop3FolderSyncer].concat(Array.slice(arguments)));

  // Set up connection information. We can't make much use of
  // connection pooling since the POP3 protocol only allows one client
  // to access a mailbox at a given time, so there's no connection pool.
  this._conn = null;
  this._pendingConnectionRequests = [];
  this._backoffEndpoint =
      errbackoff.createEndpoint('pop3:' + this.id, this, this._LOG);
  this.tzOffset = 0; // POP3 has no concept of time zones.

  // If we have an existing connection from setting up the account, we
  // can reuse that during the first sync.
  if (existingProtoConn) {
    this._conn = existingProtoConn;
  }

  // Create required folders if necessary.
  ['sent', 'localdrafts', 'trash'].forEach(function(name) {
    var folder = this.getFirstFolderWithType(name);
    if (!folder) {
      this._learnAboutFolder(name, name, null, name, '/', 0, true);
    }
  }.bind(this));

  this._jobDriver = new pop3jobs.Pop3JobDriver(
      this, this._folderInfos.$mutationState, this._LOG);
}
exports.Account = exports.Pop3Account = Pop3Account;
Pop3Account.prototype = Object.create(CompositeIncomingAccount.prototype);
var properties = {
  type: 'pop3',
  supportsServerFolders: false,
  toString: function() {
    return '[Pop3Account: ' + this.id + ']';
  },

  /**
   * Call the callback with a live, authenticated connection. Clients
   * should call done() when finished with the connection. (In our
   * case, pop3/sync.js has a lazyWithConnection wrapper which
   * abstracts the `done` callback.)
   * @param {function(err, conn, done)} cb
   */
  withConnection: function(cb, whyLabel) {
    // This implementation serializes withConnection requests so that
    // we don't step on requests' toes. While Pop3Client wouldn't mix
    // up the requests themselves, interleaving different operations
    // could result in undesired consequences.
    this._pendingConnectionRequests.push(cb);
    var done = function() {
      var req = this._pendingConnectionRequests.shift();
      if (req) {
        var next = function(err) {
          if (err) {
            req(err);
            done();
          } else {
            req(null, this._conn, done);
          }
        }.bind(this);
        if (!this._conn || this._conn.state === 'disconnected') {
          this._makeConnection(next, whyLabel);
        } else {
          next();
        }
      }
    }.bind(this);

    if (this._pendingConnectionRequests.length === 1) {
      done();
    }
  },

  /** @override */
  __folderDoneWithConnection: function(conn) {
    // IMAP uses this function to perform folder-specific connection cleanup.
    // We don't need to do anything here.
  },

  /**
   * Create a new POP3 connection, and call the callback when we
   * have established the connection (or with an error if we failed).
   * Since POP3 only uses one connection at a time, this function also
   * assigns the given connection to this._conn.
   *
   * Don't use this function directly; instead use `withConnection` or
   * a higher-level wrapper.
   *
   * @param {function(err, conn)} callback
   * @param {String} whyLabel A descriptive name for the connection.
   */
  _makeConnection: function(callback, whyLabel) {
    // Mark a pending connection synchronously; the require call will
    // not return until at least the next turn of the event loop, so
    // we need to know that there's a pending connection request in
    // progress.
    this._conn = true;
    // Dynamically load the probe/pop3 code to speed up startup.
    require(['pop3/pop3', './probe'], function(pop3, pop3probe) {
      this._LOG.createConnection(whyLabel);
      var opts = {
        host: this._connInfo.hostname,
        port: this._connInfo.port,
        crypto: this._connInfo.crypto,

        preferredAuthMethod: this._connInfo.preferredAuthMethod,

        username: this._credentials.username,
        password: this._credentials.password,
      };
      if (this._LOG) opts._logParent = this._LOG;
      var conn = this._conn = new pop3.Pop3Client(opts, function(err) {
        if (err) {
          // Failed to get the connection:
          console.error('Connect error:', err.name, 'formal:', err, 'on',
                        this._connInfo.hostname, this._connInfo.port);

          err = pop3probe.analyzeError(err);

          if (err.reportProblem) {
            this.universe.__reportAccountProblem(
              this.compositeAccount, err.name);
          }

          callback && callback(err.name, null);
          conn.die();

          // track this failure for backoff purposes
          if (err.retry &&
              this._backoffEndpoint.noteConnectFailureMaybeRetry(
                err.reachable)) {
            this._backoffEndpoint.scheduleConnectAttempt(
              this._makeConnection.bind(this));
          } else {
            this._backoffEndpoint.noteBrokenConnection();
          }
          return;
        }
        // Succeeded:
        this._backoffEndpoint.noteConnectSuccess();
        callback && callback(null, conn);
      }.bind(this));
    }.bind(this));
  },

  /**
   * Save an attachment-stripped version of the sent draft to our sent folder.
   */
  saveSentMessage: function(composer) {
    var sentFolder = this.getFirstFolderWithType('sent');
    if (!sentFolder) {
      return;
    }

    var sentStorage = this.getFolderStorageForFolderId(sentFolder.id);
    var id = sentStorage._issueNewHeaderId();
    var suid = sentStorage.folderId + '/' + id;

    var sentPieces = draftRep.cloneDraftMessageForSentFolderWithoutAttachments(
      composer.header, composer.body, { id: id, suid: suid });

    this.universe.saveSentDraft(sentFolder.id,
                                sentPieces.header, sentPieces.body);
  },

  /**
   * Delete the given folder. (This always happens locally.)
   */
  deleteFolder: function(folderId, callback) {
    if (!this._folderInfos.hasOwnProperty(folderId)) {
      throw new Error("No such folder: " + folderId);
    }
    var folderMeta = this._folderInfos[folderId].$meta;
    self._LOG.deleteFolder(folderMeta.path);
    self._forgetFolder(folderId);
    callback && callback(null, folderMeta);
  },

  /**
   * Shut down the account and close the connection.
   */
  shutdown: function(callback) {
    CompositeIncomingAccount.prototype.shutdownFolders.call(this);

    this._backoffEndpoint.shutdown();

    if (this._conn && this._conn.die) {
      this._conn.die();
    }
    this._LOG.__die();
    callback && callback();
  },

  /**
   * Attempt to create a new, authenticated connection using the
   * current credentials. If a current connection is already
   * established, terminates the existing connection first.
   *
   * @param {function(err)} callback
   */
  checkAccount: function(callback) {
    // Disconnect first so as to properly check credentials.
    if (this._conn != null) {
      if (this._conn.state !== 'disconnected') {
        this._conn.disconnect();
      }
      this._conn = null;
    }
    this.withConnection(function(err) {
      callback(err);
    }, 'checkAccount');
  },

  /**
   * Destroy the account when the account has been deleted.
   */
  accountDeleted: function() {
    this._alive = false;
    this.shutdown();
  },

};

// Inherit Pop3Account from CompositeIncomingAccount:
// XXX: Use mix.js when it lands in the streaming patch.
for (var k in properties) {
  Object.defineProperty(Pop3Account.prototype, k,
                        Object.getOwnPropertyDescriptor(properties, k));
}

// Share the log configuration with CompositeIncomingAccount, since we
// desire general parity between IMAP and POP3 for simplicity.
var LOGFAB = exports.LOGFAB = log.register(module, {
  Pop3Account: incoming.LOGFAB_DEFINITION.CompositeIncomingAccount
});


}); // end define
;
/**
 *
 **/

define('mailapi/smtp/account',
  [
    'rdcommon/log',
    'module',
    'require',
    'exports'
  ],
  function(
    $log,
    $module,
    require,
    exports
  ) {

/**
 * Debug flag for use by unit tests to tell us to turn on debug logging of
 * sending SMTP messages.  The output is unstructured and goes to console.log
 * mainly with some weird unicode chars, but it's better than nothing.
 */
exports.ENABLE_SMTP_LOGGING = false;

function SmtpAccount(universe, compositeAccount, accountId, credentials,
                     connInfo, _parentLog) {
  this.universe = universe;
  this.compositeAccount = compositeAccount;
  this.accountId = accountId;
  this.credentials = credentials;
  this.connInfo = connInfo;

  this._LOG = LOGFAB.SmtpAccount(this, _parentLog, accountId);

  this._activeConnections = [];
}
exports.Account = exports.SmtpAccount = SmtpAccount;
SmtpAccount.prototype = {
  type: 'smtp',
  toString: function() {
    return '[SmtpAccount: ' + this.id + ']';
  },

  get numActiveConns() {
    return this._activeConnections.length;
  },

  shutdown: function(callback) {
    // (there should be no live connections during a unit-test initiated
    // shutdown.)
    this._LOG.__die();
  },

  accountDeleted: function() {
    this.shutdown();
  },

  /**
   * Asynchronously send an e-mail message.  Does not provide retries, offline
   * remembering of the command, or any follow-on logic like appending the
   * message to the sent folder.
   *
   * @args[
   *   @param[composedMessage MailComposer]{
   *     A mailcomposer instance that has already generated its message payload
   *     to its _outputBuffer field.  We previously used streaming generation,
   *     but have abandoned this for now for IMAP Sent folder saving purposes.
   *     Namely, our IMAP implementation doesn't support taking a stream for
   *     APPEND right now, and there's no benefit to doing double the work and
   *     generating extra garbage.
   *   }
   *   @param[callback @func[
   *     @args[
   *       @param[error @oneof[
   *         @case[null]{
   *           No error, message sent successfully.
   *         }
   *         @case['auth']{
   *           Authentication problem.  This should probably be escalated to
   *           the user so they can fix their password.
   *         }
   *         @case['bad-sender']{
   *           We logged in, but it didn't like our sender e-mail.
   *         }
   *         @case['bad-recipient']{
   *           There were one or more bad recipients; they are listed in the
   *           next argument.
   *         }
   *         @case['bad-message']{
   *           It failed during the sending of the message.
   *         }
   *         @case['server-maybe-offline']{
   *           The server won't let us login, maybe because of a bizarre offline
   *           for service strategy?  (We've seen this with IMAP before...)
   *
   *           This should be considered a fatal problem during probing or if
   *           it happens consistently.
   *         }
   *         @case['insecure']{
   *           We couldn't establish a secure connection.
   *         }
   *         @case['connection-lost']{
   *           The connection went away, we don't know why.  Could be a
   *           transient thing, could be a jerky server, who knows.
   *         }
   *         @case['unknown']{
   *           Some other error.  Internal error reporting/support should
   *           ideally be logging this somehow.
   *         }
   *       ]]
   *       @param[badAddresses @listof[String]]
   *     ]
   *   ]
   * ]
   */
  sendMessage: function(composer, callback) {
    console.log('smtp: requiring code');
    require(['simplesmtp/lib/client'], function ($simplesmtp) {
      var conn, bailed = false, sendingMessage = false;
      console.log('smtp: code loaded');

      conn = $simplesmtp(
        this.connInfo.port, this.connInfo.hostname,
        {
          crypto: this.connInfo.crypto,
          auth: {
            user: this.credentials.username,
            pass: this.credentials.password
          },
          debug: exports.ENABLE_SMTP_LOGGING,
        });

      this._activeConnections.push(conn);

      // - Optimistic case
      // Send the envelope once the connection is ready (fires again after
      // ready too.)
      conn.once('idle', function() {
          console.log('smtp: idle reached, sending envelope');
          conn.useEnvelope(composer.getEnvelope());
        });
      // Then send the actual message if everything was cool
      conn.on('message', function() {
          if (bailed)
            return;
          sendingMessage = true;
          console.log('smtp: message reached, building message blob');
          composer.withMessageBlob({ includeBcc: false }, function(blob) {
            console.log('smtp: blob composed, writing blob');
            // simplesmtp's SMTPClient does not understand Blobs, so we issue
            // the write directly.  All that it cares about is knowing whether
            // our data payload included a trailing \r\n.  Our long term plan
            // to avoid this silliness is to switch to using firemail's fork of
            // simplesmtp or something equally less hacky; see bug 885110.
            conn.socket.write(blob);
            // SMTPClient tracks the last bytes it has written in _lastDataBytes
            // to this end and writes the \r\n if they aren't the last bytes
            // written.  Since we know that mailcomposer always ends the buffer
            // with \r\n we just set that state directly ourselves.
            conn._lastDataBytes[0] = 0x0d;
            conn._lastDataBytes[1] = 0x0a;
            // put some data in the console.log if in debug mode too
            if (conn.options.debug) {
              console.log('CLIENT (DATA) blob of size:', blob.size);
            }
            // this does not actually terminate the connection; just tells the
            // client to flush stuff, etc.
            conn.end();
          });
        });
      // And close the connection and be done once it has been sent
      conn.on('ready', function() {
          console.log('smtp: send completed, closing connection');
          bailed = true;
          conn.close();
          callback(null);
        });

      // - Error cases
      // It's possible for the server to decide some, but not all, of the
      // recipients are gibberish.  Since we are a mail client and talking to
      // a smarthost and not the final destination (most of the time), this
      // is not super likely.
      //
      // We upgrade this to a full failure to send
      conn.on('rcptFailed', function(addresses) {
          // nb: this gets called all the time, even without any failures
          if (addresses.length) {
            console.warn('smtp: nonzero bad recipients');
            bailed = true;
            // simplesmtp does't view this as fatal, so we have to close it ourself
            conn.close();
            callback('bad-recipient', addresses);
          }
        });
      conn.on('error', function(err) {
        if (bailed) // (paranoia, this shouldn't happen.)
          return;
        var reportAs = null;
        console.error('smtp: error:', err.name);
        switch (err.name) {
          // no explicit error type is given for: a bad greeting, failure to
          // EHLO/HELO, bad login sequence, OR a data problem during send.
          // The first 3 suggest a broken server or one that just doesn't want
          // to talk to us right now.
          case 'Error':
            if (sendingMessage)
              reportAs = 'bad-message';
            else
              reportAs = 'server-maybe-offline';
            break;
          case 'AuthError':
            reportAs = 'auth';
            break;
          case 'UnknownAuthError':
            reportAs = 'server-maybe-offline';
            break;
          case 'TLSError':
            reportAs = 'insecure';
            break;

          case 'SenderError':
            reportAs = 'bad-sender';
            break;
          // no recipients (bad message on us) or they all got rejected
          case 'RecipientError':
            reportAs = 'bad-recipient';
            break;

          default:
            reportAs = 'unknown';
            break;
        }
        bailed = true;
        callback(reportAs, null);
        // the connection gets automatically closed.
      });
      conn.on('end', function() {
        console.log('smtp: connection ended');
        var idx = this._activeConnections.indexOf(conn);
        if (idx !== -1)
          this._activeConnections.splice(idx, 1);
        else
          console.error('Dead unknown connection?');
        if (bailed)
          return;
        callback('connection-lost', null);
        bailed = true;
        // (the connection is already closed if we are here)
      }.bind(this));
    }.bind(this));
  },


};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  SmtpAccount: {
    type: $log.ACCOUNT,
    events: {
    },
    TEST_ONLY_events: {
    },
    errors: {
      folderAlreadyHasConn: { folderId: false },
    },
  },
});

}); // end define
;
/**
 * Configurator for fake
 **/

define('mailapi/composite/account',
  [
    'rdcommon/log',
    '../accountcommon',
    '../a64',
    '../accountmixins',
    '../imap/account',
    '../pop3/account',
    '../smtp/account',
    'exports'
  ],
  function(
    $log,
    $accountcommon,
    $a64,
    $acctmixins,
    $imapacct,
    $pop3acct,
    $smtpacct,
    exports
  ) {

var PIECE_ACCOUNT_TYPE_TO_CLASS = {
  'imap': $imapacct.ImapAccount,
  'pop3': $pop3acct.Pop3Account,
  'smtp': $smtpacct.SmtpAccount,
};

/**
 * Composite account type to expose account piece types with individual
 * implementations (ex: imap, smtp) together as a single account.  This is
 * intended to be a very thin layer that shields consuming code from the
 * fact that IMAP and SMTP are not actually bundled tightly together.
 */
function CompositeAccount(universe, accountDef, folderInfo, dbConn,
                          receiveProtoConn,
                          _LOG) {
  this.universe = universe;
  this.id = accountDef.id;
  this.accountDef = accountDef;

  // Currently we don't persist the disabled state of an account because it's
  // easier for the UI to be edge-triggered right now and ensure that the
  // triggering occurs once each session.
  this._enabled = true;
  this.problems = [];

  // XXX for now we are stealing the universe's logger
  this._LOG = _LOG;

  this.identities = accountDef.identities;

  if (!PIECE_ACCOUNT_TYPE_TO_CLASS.hasOwnProperty(accountDef.receiveType)) {
    this._LOG.badAccountType(accountDef.receiveType);
  }
  if (!PIECE_ACCOUNT_TYPE_TO_CLASS.hasOwnProperty(accountDef.sendType)) {
    this._LOG.badAccountType(accountDef.sendType);
  }

  this._receivePiece =
    new PIECE_ACCOUNT_TYPE_TO_CLASS[accountDef.receiveType](
      universe, this,
      accountDef.id, accountDef.credentials, accountDef.receiveConnInfo,
      folderInfo, dbConn, this._LOG, receiveProtoConn);
  this._sendPiece =
    new PIECE_ACCOUNT_TYPE_TO_CLASS[accountDef.sendType](
      universe, this,
      accountDef.id, accountDef.credentials,
      accountDef.sendConnInfo, dbConn, this._LOG);

  // expose public lists that are always manipulated in place.
  this.folders = this._receivePiece.folders;
  this.meta = this._receivePiece.meta;
  this.mutations = this._receivePiece.mutations;
  this.tzOffset = accountDef.tzOffset;
}
exports.Account = exports.CompositeAccount = CompositeAccount;
CompositeAccount.prototype = {
  toString: function() {
    return '[CompositeAccount: ' + this.id + ']';
  },
  get supportsServerFolders() {
    return this._receivePiece.supportsServerFolders;
  },
  toBridgeWire: function() {
    return {
      id: this.accountDef.id,
      name: this.accountDef.name,
      type: this.accountDef.type,

      defaultPriority: this.accountDef.defaultPriority,

      enabled: this.enabled,
      problems: this.problems,

      syncRange: this.accountDef.syncRange,
      syncInterval: this.accountDef.syncInterval,
      notifyOnNew: this.accountDef.notifyOnNew,

      identities: this.identities,

      credentials: {
        username: this.accountDef.credentials.username,
        // no need to send the password to the UI.
      },

      servers: [
        {
          type: this.accountDef.receiveType,
          connInfo: this.accountDef.receiveConnInfo,
          activeConns: this._receivePiece.numActiveConns || 0,
        },
        {
          type: this.accountDef.sendType,
          connInfo: this.accountDef.sendConnInfo,
          activeConns: this._sendPiece.numActiveConns || 0,
        }
      ],
    };
  },
  toBridgeFolder: function() {
    return {
      id: this.accountDef.id,
      name: this.accountDef.name,
      path: this.accountDef.name,
      type: 'account',
    };
  },

  get enabled() {
    return this._enabled;
  },
  set enabled(val) {
    this._enabled = this._receivePiece.enabled = val;
  },

  saveAccountState: function(reuseTrans, callback, reason) {
    return this._receivePiece.saveAccountState(reuseTrans, callback, reason);
  },

  get _saveAccountIsImminent() {
    return this.__saveAccountIsImminent;
  },
  set _saveAccountIsImminent(val) {
    this.___saveAccountIsImminent =
    this._receivePiece._saveAccountIsImminent = val;
  },

  runAfterSaves: function(callback) {
    return this._receivePiece.runAfterSaves(callback);
  },

  /**
   * Check that the account is healthy in that we can login at all.
   */
  checkAccount: function(callback) {
    // Since we use the same credential for both cases, we can just have the
    // IMAP account attempt to establish a connection and forget about SMTP.
    this._receivePiece.checkAccount(callback);
  },

  /**
   * Shutdown the account; see `MailUniverse.shutdown` for semantics.
   */
  shutdown: function(callback) {
    this._sendPiece.shutdown();
    this._receivePiece.shutdown(callback);
  },

  accountDeleted: function() {
    this._sendPiece.accountDeleted();
    this._receivePiece.accountDeleted();
  },

  deleteFolder: function(folderId, callback) {
    return this._receivePiece.deleteFolder(folderId, callback);
  },

  sliceFolderMessages: function(folderId, bridgeProxy) {
    return this._receivePiece.sliceFolderMessages(folderId, bridgeProxy);
  },

  searchFolderMessages: function(folderId, bridgeHandle, phrase, whatToSearch) {
    return this._receivePiece.searchFolderMessages(
      folderId, bridgeHandle, phrase, whatToSearch);
  },

  syncFolderList: function(callback) {
    return this._receivePiece.syncFolderList(callback);
  },

  sendMessage: function(composer, callback) {
    return this._sendPiece.sendMessage(
      composer,
      function(err, errDetails) {
        if (!err) {
          // The saving is done asynchronously as a best-effort.
          this._receivePiece.saveSentMessage(composer);
        }
        callback(err, errDetails, null);
      }.bind(this));
  },

  getFolderStorageForFolderId: function(folderId) {
    return this._receivePiece.getFolderStorageForFolderId(folderId);
  },

  getFolderMetaForFolderId: function(folderId) {
    return this._receivePiece.getFolderMetaForFolderId(folderId);
  },

  runOp: function(op, mode, callback) {
    return this._receivePiece.runOp(op, mode, callback);
  },

  ensureEssentialFolders: function(callback) {
    return this._receivePiece.ensureEssentialFolders(callback);
  },

  getFirstFolderWithType: $acctmixins.getFirstFolderWithType,
};

}); // end define
;
/**
 * Configurator for imap+smtp and pop3+smtp
 **/

define('mailapi/composite/configurator',
  [
    'rdcommon/log',
    '../accountcommon',
    '../a64',
    '../allback',
    './account',
    '../date',
    'require',
    'exports'
  ],
  function(
    $log,
    $accountcommon,
    $a64,
    $allback,
    $account,
    $date,
    require,
    exports
  ) {

var allbackMaker = $allback.allbackMaker;

exports.account = $account;
exports.configurator = {
  tryToCreateAccount: function(universe, userDetails, domainInfo,
                               callback, _LOG) {
    var credentials, incomingInfo, smtpConnInfo, incomingType;
    if (domainInfo) {
      incomingType = (domainInfo.type === 'imap+smtp' ? 'imap' : 'pop3');
      credentials = {
        username: domainInfo.incoming.username,
        password: userDetails.password,
      };
      incomingInfo = {
        hostname: domainInfo.incoming.hostname,
        port: domainInfo.incoming.port,
        crypto: (typeof domainInfo.incoming.socketType === 'string' ?
                 domainInfo.incoming.socketType.toLowerCase() :
                 domainInfo.incoming.socketType),
      };
      if (incomingType === 'imap') {
        incomingInfo.blacklistedCapabilities = null;
      } else if (incomingType === 'pop3') {
        incomingInfo.preferredAuthMethod = null;
      }
      smtpConnInfo = {
        hostname: domainInfo.outgoing.hostname,
        port: domainInfo.outgoing.port,
        crypto: (typeof domainInfo.outgoing.socketType === 'string' ?
                 domainInfo.outgoing.socketType.toLowerCase() :
                 domainInfo.outgoing.socketType),
      };
    }

    var self = this;
    var callbacks = allbackMaker(
      ['incoming', 'smtp'],
      function probesDone(results) {
        // -- both good?
        if (results.incoming[0] === null && results.smtp[0] === null) {
          var conn = results.incoming[1];
          if (incomingType === 'imap') {
            var imapTZOffset = results.incoming[2];
            var imapBlacklistedCapabilities = results.incoming[3];

            incomingInfo.blacklistedCapabilities = imapBlacklistedCapabilities;

            var account = self._defineImapAccount(
              universe,
              userDetails, credentials,
              incomingInfo, smtpConnInfo, conn,
              imapTZOffset,
              callback);
          } else { // POP3
            incomingInfo.preferredAuthMethod = conn.authMethod;
            var account = self._definePop3Account(
              universe,
              userDetails, credentials,
              incomingInfo, smtpConnInfo, conn,
              callback);
          }
        } else { // -- either/both bad
          if (incomingType === 'imap' || incomingType === 'pop3') {
            // clean up the imap connection if it was okay but smtp failed
            if (results.incoming[0] === null) {
              results.incoming[1].die();
              // Failure was caused by SMTP, but who knows why
              callback(results.smtp[0], null, results.smtp[1]);
            } else {
              callback(results.incoming[0], null, results.incoming[2]);
            }
          }
        }
      });

    require(['../smtp/probe'], function($probe) {
      var smtpProber = new $probe.SmtpProber(credentials, smtpConnInfo, _LOG);
      smtpProber.onresult = callbacks.smtp;
    });
    if (incomingType === 'imap') {
      require(['../imap/probe'], function($probe) {
        var imapProber = new $probe.ImapProber(credentials, incomingInfo, _LOG);
        imapProber.onresult = callbacks.incoming;
      });
    } else {
      require(['../pop3/probe'], function($probe) {
        var pop3Prober = new $probe.Pop3Prober(credentials, incomingInfo, _LOG);
        pop3Prober.onresult = callbacks.incoming;
      });
    }
  },

  recreateAccount: function(universe, oldVersion, oldAccountInfo, callback) {
    var oldAccountDef = oldAccountInfo.def;

    var credentials = {
      username: oldAccountDef.credentials.username,
      password: oldAccountDef.credentials.password,
    };
    var accountId = $a64.encodeInt(universe.config.nextAccountNum++);
    var oldType = oldAccountDef.type || 'imap+smtp';
    var accountDef = {
      id: accountId,
      name: oldAccountDef.name,

      type: oldType,
      receiveType: oldType.split('+')[0],
      sendType: 'smtp',

      syncRange: oldAccountDef.syncRange,
      syncInterval: oldAccountDef.syncInterval || 0,
      notifyOnNew: oldAccountDef.hasOwnProperty('notifyOnNew') ?
                   oldAccountDef.notifyOnNew : true,

      credentials: credentials,
      receiveConnInfo: {
        hostname: oldAccountDef.receiveConnInfo.hostname,
        port: oldAccountDef.receiveConnInfo.port,
        crypto: oldAccountDef.receiveConnInfo.crypto,

        blacklistedCapabilities:
          oldAccountDef.receiveConnInfo.blacklistedCapabilities || null,
        preferredAuthMethod:
          oldAccountDef.receiveConnInfo.preferredAuthMethod || null,
      },
      sendConnInfo: {
        hostname: oldAccountDef.sendConnInfo.hostname,
        port: oldAccountDef.sendConnInfo.port,
        crypto: oldAccountDef.sendConnInfo.crypto,
      },

      identities: $accountcommon.recreateIdentities(universe, accountId,
                                     oldAccountDef.identities),
      // this default timezone here maintains things; but people are going to
      // need to create new accounts at some point...
      tzOffset: oldAccountInfo.tzOffset !== undefined ?
                  oldAccountInfo.tzOffset : -7 * 60 * 60 * 1000,
    };

    this._loadAccount(universe, accountDef,
                      oldAccountInfo.folderInfo, null, function(account) {
      callback(null, account, null);
    });
  },

  /**
   * Define an account now that we have verified the credentials are good and
   * the server meets our minimal functionality standards.  We are also
   * provided with the protocol connection that was used to perform the check
   * so we can immediately put it to work.
   */
  _defineImapAccount: function(universe, userDetails, credentials,
                               incomingInfo, smtpConnInfo, imapProtoConn,
                               tzOffset, callback) {
    var accountId = $a64.encodeInt(universe.config.nextAccountNum++);
    var accountDef = {
      id: accountId,
      name: userDetails.accountName || userDetails.emailAddress,
      defaultPriority: $date.NOW(),

      type: 'imap+smtp',
      receiveType: 'imap',
      sendType: 'smtp',

      syncRange: 'auto',
      syncInterval: userDetails.syncInterval || 0,
      notifyOnNew: userDetails.hasOwnProperty('notifyOnNew') ?
                   userDetails.notifyOnNew : true,

      credentials: credentials,
      receiveConnInfo: incomingInfo,
      sendConnInfo: smtpConnInfo,

      identities: [
        {
          id: accountId + '/' +
                $a64.encodeInt(universe.config.nextIdentityNum++),
          name: userDetails.displayName,
          address: userDetails.emailAddress,
          replyTo: null,
          signature: null
        },
      ],
      tzOffset: tzOffset,
    };

    this._loadAccount(universe, accountDef, null,
                      imapProtoConn, function(account) {
      callback(null, account, null);
    });
  },

  /**
   * Define an account now that we have verified the credentials are good and
   * the server meets our minimal functionality standards.  We are also
   * provided with the protocol connection that was used to perform the check
   * so we can immediately put it to work.
   */
  _definePop3Account: function(universe, userDetails, credentials,
                               incomingInfo, smtpConnInfo, pop3ProtoConn,
                               callback) {
    var accountId = $a64.encodeInt(universe.config.nextAccountNum++);
    var accountDef = {
      id: accountId,
      name: userDetails.accountName || userDetails.emailAddress,
      defaultPriority: $date.NOW(),

      type: 'pop3+smtp',
      receiveType: 'pop3',
      sendType: 'smtp',

      syncRange: 'auto',
      syncInterval: userDetails.syncInterval || 0,
      notifyOnNew: userDetails.hasOwnProperty('notifyOnNew') ?
                   userDetails.notifyOnNew : true,

      credentials: credentials,
      receiveConnInfo: incomingInfo,
      sendConnInfo: smtpConnInfo,

      identities: [
        {
          id: accountId + '/' +
                $a64.encodeInt(universe.config.nextIdentityNum++),
          name: userDetails.displayName,
          address: userDetails.emailAddress,
          replyTo: null,
          signature: null
        },
      ],
    };

    this._loadAccount(universe, accountDef, null,
                      pop3ProtoConn, function(account) {
      callback(null, account, null);
    });
  },

  /**
   * Save the account def and folder info for our new (or recreated) account and
   * then load it.
   */
  _loadAccount: function(universe, accountDef, oldFolderInfo, protoConn,
                         callback) {
    var folderInfo;
    if (accountDef.receiveType === 'imap') {
      folderInfo = {
        $meta: {
          nextFolderNum: 0,
          nextMutationNum: 0,
          lastFolderSyncAt: 0,
          capability: (oldFolderInfo && oldFolderInfo.$meta.capability) ||
            protoConn.capabilities,
          rootDelim: (oldFolderInfo && oldFolderInfo.$meta.rootDelim) ||
            protoConn.delim,
        },
        $mutations: [],
        $mutationState: {},
      };
    } else { // POP3
      folderInfo = {
        $meta: {
          nextFolderNum: 0,
          nextMutationNum: 0,
          lastFolderSyncAt: 0,
        },
        $mutations: [],
        $mutationState: {},
      };
    }
    universe.saveAccountDef(accountDef, folderInfo);
    universe._loadAccount(accountDef, folderInfo, protoConn, callback);
  },
};

}); // end define
;