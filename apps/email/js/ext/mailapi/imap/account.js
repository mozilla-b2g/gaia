/**
 *
 **/

define('mailapi/imap/account',
  [
    'imap',
    'rdcommon/log',
    '../a64',
    '../allback',
    '../accountmixins',
    '../errbackoff',
    '../mailslice',
    '../searchfilter',
    '../util',
    './probe',
    './folder',
    './jobs',
    'module',
    'exports'
  ],
  function(
    $imap,
    $log,
    $a64,
    $allback,
    $acctmixins,
    $errbackoff,
    $mailslice,
    $searchfilter,
    $util,
    $imapprobe,
    $imapfolder,
    $imapjobs,
    $module,
    exports
  ) {
const bsearchForInsert = $util.bsearchForInsert;
const allbackMaker = $allback.allbackMaker;

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
  this.universe = universe;
  this.compositeAccount = compositeAccount;
  this.id = accountId;
  this.accountDef = compositeAccount.accountDef;

  this.enabled = true;

  this._LOG = LOGFAB.ImapAccount(this, _parentLog, this.id);

  this._credentials = credentials;
  this._connInfo = connInfo;
  this._db = dbConn;

  /**
   * The maximum number of connections we are allowed to have alive at once.  We
   * want to limit this both because we generally aren't sophisticated enough
   * to need to use many connections at once (unless we have bugs), and because
   * servers may enforce a per-account connection limit which can affect both
   * us and other clients on other devices.
   *
   * Thunderbird's default for this is 5.
   *
   * gmail currently claims to have a limit of 10 connections per account:
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
  this._boundMakeConnection = this._makeConnection.bind(this);

  if (existingProtoConn)
    this._reuseConnection(existingProtoConn);

  // Yes, the pluralization is suspect, but unambiguous.
  /** @dictof[@key[FolderId] @value[ImapFolderStorage] */
  var folderStorages = this._folderStorages = {};
  /** @dictof[@key[FolderId] @value[ImapFolderMeta] */
  var folderPubs = this.folders = [];

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
  this.tzOffset = compositeAccount.accountDef.tzOffset;
  for (var folderId in folderInfos) {
    if (folderId[0] === '$')
      continue;
    var folderInfo = folderInfos[folderId];

    folderStorages[folderId] =
      new $mailslice.FolderStorage(this, folderId, folderInfo, this._db,
                                   $imapfolder.ImapFolderSyncer, this._LOG);
    folderPubs.push(folderInfo.$meta);
  }
  this.folders.sort(function(a, b) {
    return a.path.localeCompare(b.path);
  });

  this._jobDriver = new $imapjobs.ImapJobDriver(
                          this, this._folderInfos.$mutationState, this._LOG);

  /**
   * Flag to allow us to avoid calling closeBox to close a folder.  This avoids
   * expunging deleted messages.
   */
  this._TEST_doNotCloseFolder = false;

  // Ensure we have an inbox.  This is a folder that must exist with a standard
  // name, so we can create it without talking to the server.
  var inboxFolder = this.getFirstFolderWithType('inbox');
  if (!inboxFolder) {
    // XXX localized inbox string (bug 805834)
    this._learnAboutFolder('INBOX', 'INBOX', null, 'inbox', '/', 0, true);
  }
}
exports.ImapAccount = ImapAccount;
ImapAccount.prototype = {
  type: 'imap',
  toString: function() {
    return '[ImapAccount: ' + this.id + ']';
  },

  get isGmail() {
    return this.meta.capability.indexOf('X-GM-EXT-1') !== -1;
  },

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
      serverIdHeaderBlockMapping: null, // IMAP does not need the mapping
    };
    this._folderStorages[folderId] =
      new $mailslice.FolderStorage(this, folderId, folderInfo, this._db,
                                   $imapfolder.ImapFolderSyncer, this._LOG);

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
   * We are being told that a synchronization pass completed, and that we may
   * want to consider persisting our state.
   */
  __checkpointSyncCompleted: function() {
    this.saveAccountState();
  },

  /**
   * Save the state of this account to the database.  This entails updating all
   * of our highly-volatile state (folderInfos which contains counters, accuracy
   * structures, and our block info structures) as well as any dirty blocks.
   *
   * This should be entirely coherent because the structured clone should occur
   * synchronously during this call, but it's important to keep in mind that if
   * that ever ends up not being the case that we need to cause mutating
   * operations to defer until after that snapshot has occurred.
   */
  saveAccountState: function(reuseTrans, callback) {
    var perFolderStuff = [], self = this;
    for (var iFolder = 0; iFolder < this.folders.length; iFolder++) {
      var folderPub = this.folders[iFolder],
          folderStorage = this._folderStorages[folderPub.id],
          folderStuff = folderStorage.generatePersistenceInfo();
      if (folderStuff)
        perFolderStuff.push(folderStuff);
    }
    this._LOG.saveAccountState();
    var trans = this._db.saveAccountFolderStates(
      this.id, this._folderInfos, perFolderStuff,
      this._deadFolderIds,
      function stateSaved() {
        // NB: we used to log when the save completed, but it ended up being
        // annoying to the unit tests since we don't block our actions on
        // the completion of the save at this time.
        if (callback)
          callback();
      },
      reuseTrans);
    this._deadFolderIds = null;
    return trans;
  },

  /**
   * Delete an existing folder WITHOUT ANY ABILITY TO UNDO IT.  Current UX
   * does not desire this, but the unit tests do.
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

    storage.sliceOpenFromNow(slice);
  },

  searchFolderMessages: function(folderId, bridgeHandle, phrase, whatToSearch) {
    var storage = this._folderStorages[folderId],
        slice = new $searchfilter.SearchSlice(bridgeHandle, storage, phrase,
                                              whatToSearch, this._LOG);
    // the slice is self-starting, we don't need to call anything on storage
  },

  shutdown: function() {
    // - kill all folder storages (for their loggers)
    for (var iFolder = 0; iFolder < this.folders.length; iFolder++) {
      var folderPub = this.folders[iFolder],
          folderStorage = this._folderStorages[folderPub.id];
      folderStorage.shutdown();
    }

    this._backoffEndpoint.shutdown();

    // - close all connections
    for (var i = 0; i < this._ownedConns.length; i++) {
      var connInfo = this._ownedConns[i];
      connInfo.conn.die();
    }

    this._LOG.__die();
  },

  checkAccount: function(listener) {
    var self = this;
    this._makeConnection(listener, null, 'check');
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
    this._backoffEndpoint.scheduleConnectAttempt(this._boundMakeConnection);
  },

  _makeConnection: function(listener, whyFolderId, whyLabel) {
    this._LOG.createConnection(whyFolderId, whyLabel);
    var opts = {
      host: this._connInfo.hostname,
      port: this._connInfo.port,
      crypto: this._connInfo.crypto,

      username: this._credentials.username,
      password: this._credentials.password,
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
        // Keep opening connections if there is more work to do (and possible).
        if (this._demandedConns.length)
          this._makeConnectionIfPossible();
      }
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
  _determineFolderType: function(box, path) {
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
        switch (box.displayName.toUpperCase()) {
          case 'DRAFT':
          case 'DRAFTS':
            type = 'drafts';
            break;
          case 'INBOX':
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
    const folderPubsByPath = {};
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
        var type = self._determineFolderType(box, path);
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
      // It must have gotten deleted!
      this._forgetFolder(folderPub.id);
    }

    callback(null);
  },

  /**
   * Create the essential Sent and Trash folders if they do not already exist.
   *
   * XXX Our folder type detection logic probably needs to get more multilingual
   * and us as well.  When we do this, we can steal the localized strings from
   * Thunderbird to bootstrap.
   */
  ensureEssentialFolders: function(callback) {
    var trashFolder = this.getFirstFolderWithType('trash'),
        sentFolder = this.getFirstFolderWithType('sent');

    if (trashFolder && sentFolder) {
      callback(null);
      return;
    }

    var callbacks = allbackMaker(
      ['sent', 'trash'],
      function foldersCreated(results) {
        callback(null);
      });

    if (!sentFolder)
      this.universe.createFolder(this.id, null, 'Sent', false);
    else
      callbacks.sent(null);

    if (!trashFolder)
      this.universe.createFolder(this.id, null, 'Trash', false);
    else
      callbacks.trash(null);
  },

  scheduleMessagePurge: function(folderId, callback) {
    this.universe.purgeExcessMessages(this.compositeAccount, folderId,
                                      callback);
  },

  //////////////////////////////////////////////////////////////////////////////

  runOp: $acctmixins.runOp,
  getFirstFolderWithType: $acctmixins.getFirstFolderWithType,
};

/**
 * While gmail deserves major props for providing any IMAP interface, everyone
 * is much better off if we treat it specially.  EVENTUALLY.
 */
function GmailAccount() {
}
GmailAccount.prototype = {
  type: 'gmail-imap',

};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  ImapAccount: {
    type: $log.ACCOUNT,
    events: {
      createFolder: {},
      deleteFolder: {},

      createConnection: {},
      reuseConnection: {},
      releaseConnection: {},
      deadConnection: {},
      connectionMismatch: {},

      saveAccountState: {},

      /**
       * The maximum connection limit has been reached, we are intentionally
       * not creating an additional one.
       */
      maximumConnsNoNew: {},
    },
    TEST_ONLY_events: {
      deleteFolder: { path: false },

      createConnection: { folderId: false, label: false },
      reuseConnection: { folderId: false, label: false },
      releaseConnection: { folderId: false, label: false },
      deadConnection: { folderId: false },
      connectionMismatch: {},
    },
    errors: {
      unknownDeadConnection: {},
      connectionError: {},
      folderAlreadyHasConn: { folderId: false },
      opError: { mode: false, type: false, ex: $log.EXCEPTION },
    },
    asyncJobs: {
      runOp: { mode: true, type: true, error: false, op: false },
    },
    TEST_ONLY_asyncJobs: {
    },
  },
});

}); // end define
