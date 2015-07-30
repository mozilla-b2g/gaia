define(
  [
    'logic',
    '../a64',
    '../accountmixins',
    '../allback',
    '../errbackoff',
    '../mailslice',
    '../searchfilter',
    '../syncbase',
    '../util',
    '../composite/incoming',
    './folder',
    './jobs',
    './client',
    '../errorutils',
    '../disaster-recovery',
    'module',
    'require',
    'exports'
  ],
  function(
    logic,
    $a64,
    $acctmixins,
    $allback,
    $errbackoff,
    $mailslice,
    $searchfilter,
    $syncbase,
    $util,
    incoming,
    $imapfolder,
    $imapjobs,
    $imapclient,
    errorutils,
    DisasterRecovery,
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
                     dbConn, existingProtoConn) {

  // Using the generic 'Account' here, as current tests don't
  // distinguish between events on ImapAccount vs. CompositeAccount.
  logic.defineScope(this, 'Account', { accountId: accountId,
                                       accountType: 'imap' });

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
  this._backoffEndpoint = $errbackoff.createEndpoint('imap:' + this.id, this);

  if (existingProtoConn)
    this._reuseConnection(existingProtoConn);

  this._jobDriver = new $imapjobs.ImapJobDriver(
                          this, this._folderInfos.$mutationState);

  /**
   * Flag to allow us to avoid calling closeBox to close a folder.  This avoids
   * expunging deleted messages.
   */
  this._TEST_doNotCloseFolder = false;

  // Immediately ensure that we have any required local-only folders,
  // as those can be created even while offline.
  this.ensureEssentialOfflineFolders();
}

exports.Account = exports.ImapAccount = ImapAccount;
ImapAccount.prototype = Object.create(CompositeIncomingAccount.prototype);
var properties = {
  type: 'imap',
  supportsServerFolders: true,
  toString: function() {
    return '[ImapAccount: ' + this.id + ']';
  },

  //////////////////////////////////////////////////////////////////////////////
  // Server type indicators for quirks and heuristics like sent mail

  /**
   * Is this server gmail?  Not something that just looks like gmail, but IS
   * gmail.
   *
   * Gmail self-identifies via the nonstandard but documented X-GM-EXT-1
   * capability.  Documentation is at
   * https://developers.google.com/gmail/imap_extensions
   */
  get isGmail() {
    return this.meta.capability.indexOf('X-GM-EXT-1') !== -1;
  },

  /**
   * Is this a CoreMail server, as used by 126.com/163.com/others?
   *
   * CoreMail servers self-identify via the apparently cargo-culted
   * X-CM-EXT-1 capability.
   */
  get isCoreMailServer() {
    return this.meta.capability.indexOf('X-CM-EXT-1') !== -1;
  },

  /**
   * Do messages sent via the corresponding SMTP account automatically show up
   * in the sent folder?  Both Gmail and CoreMail do this.  (It's a good thing
   * to do, it just sucks that there's no explicit IMAP capability, etc. to
   * indicate this without us having to infer from the server type.  Although
   * we could probe this if we wanted...)
   */
  get sentMessagesAutomaticallyAppearInSentFolder() {
    return this.isGmail || this.isCoreMailServer;
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
        logic(this, 'folderAlreadyHasConn', { folderId: demandInfo.folderId });

      if (connInfo.inUseBy)
        continue;

      connInfo.inUseBy = demandInfo;
      this._demandedConns.shift();
      logic(this, 'reuseConnection',
            { folderId: demandInfo.folderId, label: demandInfo.label });
      demandInfo.callback(connInfo.conn);
      return true;
    }

    return false;
  },

  /**
   * All our operations completed; let's think about closing any connections
   * they may have established that we don't need anymore.
   */
  allOperationsCompleted: function() {
    this.maybeCloseUnusedConnections();
  },

  /**
   * Using great wisdom, potentially close some/all connections.
   */
  maybeCloseUnusedConnections: function() {
    // XXX: We are closing unused connections in an effort to stem
    // problems associated with unreliable cell connections; they
    // tend to be dropped unceremoniously when left idle for a
    // long time, particularly on cell networks. NB: This will
    // close the connection we just used, unless someone else is
    // waiting for a connection.
    if ($syncbase.KILL_CONNECTIONS_WHEN_JOBLESS &&
        !this._demandedConns.length &&
        !this.universe.areServerJobsWaiting(this)) {
      this.closeUnusedConnections();
    }
  },

  /**
   * Close all connections that aren't currently in use.
   */
  closeUnusedConnections: function() {
    for (var i = this._ownedConns.length - 1; i >= 0; i--) {
      var connInfo = this._ownedConns[i];
      if (connInfo.inUseBy)
        continue;
      console.log('Killing unused IMAP connection.');
      // this eats all future notifications, so we need to splice...
      this._ownedConns.splice(i, 1);
      connInfo.conn.client.close();
      logic(this, 'deadConnection', { reason: 'unused' });
    }
  },

  _makeConnectionIfPossible: function() {
    if (this._ownedConns.length >= this._maxConnsAllowed) {
      logic(this, 'maximumConnsNoNew');
      return;
    }
    if (this._pendingConn) {
      return;
    }

    this._pendingConn = true;
    var boundMakeConnection = this._makeConnection.bind(this);
    this._backoffEndpoint.scheduleConnectAttempt(boundMakeConnection);
  },

  _makeConnection: function(callback, whyFolderId, whyLabel) {
    // Mark a pending connection synchronously; the require call will not return
    // until at least the next turn of the event loop.
    this._pendingConn = true;
    // Dynamically load the probe/imap code to speed up startup.
    require(['./client'], function ($imapclient) {
      logic(this, 'createConnection', {
        folderId: whyFolderId,
        label: whyLabel
      });

      $imapclient.createImapConnection(
        this._credentials,
        this._connInfo,
        function onCredentialsUpdated() {
          return new Promise(function(resolve) {
            // Note: Since we update the credentials object in-place,
            // there's no need to explicitly assign the changes here;
            // just save the account information.
            this.universe.saveAccountDef(
              this.compositeAccount.accountDef,
              /* folderInfo: */ null,
              /* callback: */ resolve);
          }.bind(this));
        }.bind(this)
      ).then(function(conn) {
          DisasterRecovery.associateSocketWithAccount(conn.client.socket, this);

          this._pendingConn = null;
          this._bindConnectionDeathHandlers(conn);
          this._backoffEndpoint.noteConnectSuccess();
          this._ownedConns.push({
            conn: conn,
            inUseBy: null
          });
          this._allocateExistingConnection();

          // If more connections are needed, keep connecting.
          if (this._demandedConns.length) {
            this._makeConnectionIfPossible();
          }

          callback && callback(null);
        }.bind(this))
      .catch(function(err) {
          logic(this, 'deadConnection', {
            reason: 'connect-error',
            folderId: whyFolderId
          });

          if (errorutils.shouldReportProblem(err)) {
            this.universe.__reportAccountProblem(
              this.compositeAccount,
              err,
              'incoming');
          }

          this._pendingConn = null;
          callback && callback(err);

          // Track this failure for backoff purposes.
          if (errorutils.shouldRetry(err)) {
            if (this._backoffEndpoint.noteConnectFailureMaybeRetry(
              errorutils.wasErrorFromReachableState(err))) {
              this._makeConnectionIfPossible();
            } else {
              this._killDieOnConnectFailureDemands();
            }
          } else {
            this._backoffEndpoint.noteBrokenConnection();
            this._killDieOnConnectFailureDemands();
          }
        }.bind(this));
    }.bind(this));
  },

  /**
   * Treat a connection that came from the IMAP prober as a connection we
   * created ourselves.
   */
  _reuseConnection: function(existingProtoConn) {
    DisasterRecovery.associateSocketWithAccount(
      existingProtoConn.client.socket, this);
    this._ownedConns.push({
      conn: existingProtoConn,
      inUseBy: null
    });
    this._bindConnectionDeathHandlers(existingProtoConn);
  },

  _bindConnectionDeathHandlers: function(conn) {

    conn.breakIdle(function() {
      conn.client.TIMEOUT_ENTER_IDLE = $syncbase.STALE_CONNECTION_TIMEOUT_MS;
      conn.client.onidle = function() {
        console.warn('Killing stale IMAP connection.');
        conn.client.close();
      };

      // Reenter the IDLE state here so that we properly time out if
      // we never send any further requests (which would normally
      // cause _enterIdle to be called when the request queue has been
      // emptied).
      conn.client._enterIdle();
    });

    conn.onclose = function() {
       for (var i = 0; i < this._ownedConns.length; i++) {
        var connInfo = this._ownedConns[i];
        if (connInfo.conn === conn) {
          logic(this, 'deadConnection', {
            reason: 'closed',
            folderId: connInfo.inUseBy &&
              connInfo.inUseBy.folderId
          });
          if (connInfo.inUseBy && connInfo.inUseBy.deathback)
            connInfo.inUseBy.deathback(conn);
          connInfo.inUseBy = null;
          this._ownedConns.splice(i, 1);
          return;
        }
      }
    }.bind(this);

    conn.onerror = function(err) {
      err = $imapclient.normalizeImapError(conn, err);
      logic(this, 'connectionError', { error: err });
      console.error('imap:onerror', JSON.stringify({
        error: err,
        host: this._connInfo.hostname,
        port: this._connInfo.port
      }));
    }.bind(this);
  },

  __folderDoneWithConnection: function(conn, closeFolder, resourceProblem) {
    for (var i = 0; i < this._ownedConns.length; i++) {
      var connInfo = this._ownedConns[i];
      if (connInfo.conn === conn) {
        if (resourceProblem)
          this._backoffEndpoint(connInfo.inUseBy.folderId);
        logic(this, 'releaseConnection', {
          folderId: connInfo.inUseBy.folderId,
          label: connInfo.inUseBy.label
        });
        connInfo.inUseBy = null;

         // We just freed up a connection, it may be appropriate to close it.
        this.maybeCloseUnusedConnections();
        return;
      }
    }
    logic(this, 'connectionMismatch');
  },

  //////////////////////////////////////////////////////////////////////////////
  // Folder synchronization

  /**
   * Helper in conjunction with `_syncFolderComputeDeltas` for use by the
   * syncFolderList operation/job.  The op is on the hook for the connection's
   * lifecycle.
   */
  _syncFolderList: function(conn, callback) {
    conn.listMailboxes(
      this._syncFolderComputeDeltas.bind(this, conn, callback));
  },

  _determineFolderType: function(box, path) {
    var attribs = (box.flags || []).map(function(flag) {
      return flag.substr(1).toUpperCase(); // Map "\\Noselect" => "NOSELECT"
    });

    var type = null;
    // NoSelect trumps everything.
    if (attribs.indexOf('NOSELECT') !== -1) {
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
      for (var i = 0; i < attribs.length; i++) {
        switch (attribs[i]) {
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
        var prefix = this._namespaces.personal[0] &&
              this._namespaces.personal[0].prefix;
        var isAtNamespaceRoot = path === (prefix + box.name);
        // If our name is our path, we are at the absolute root of the tree.
        // This will be the case for INBOX even if there is a namespace.
        if (isAtNamespaceRoot || path === box.name) {
          switch (box.name.toUpperCase()) {
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

  /**
   * A map of namespaces: { personal: { prefix: '', delimiter: '' }, ... }.
   * Populated in _syncFolderComputeDeltas.
   */
  _namespaces: {
    personal: { prefix: '', delimiter: '/' },
    provisional: true
  },

  _syncFolderComputeDeltas: function(conn, callback, err, boxesRoot) {
    var self = this;
    if (err) {
      callback(err);
      return;
    }

    // Before we walk the boxes, get namespace information.
    // In the failure case, assume no relevant namespaces.
    if (self._namespaces.provisional) {
      conn.listNamespaces(function(err, namespaces) {
        if (!err && namespaces) {
          self._namespaces = namespaces;
        }

        self._namespaces.provisional = false;

        logic(self, 'list-namespaces', {
          namespaces: namespaces
        });

        self._syncFolderComputeDeltas(conn, callback, err, boxesRoot);
      });
      return;
    }

    // - build a map of known existing folders
    var folderPubsByPath = {};
    var folderPub;
    for (var iFolder = 0; iFolder < this.folders.length; iFolder++) {
      folderPub = this.folders[iFolder];
      folderPubsByPath[folderPub.path] = folderPub;
    }

    var syncScope = logic.scope('ImapFolderSync');

    // - walk the boxes
    function walkBoxes(boxLevel, pathDepth, parentId) {
      boxLevel.forEach(function(box) {
        var boxName = box.name, meta,
            folderId;

        var delim = box.delimiter || '/';

         if (box.path.indexOf(delim) === 0) {
          box.path = box.path.slice(delim.length);
        }

        var path = box.path;

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
          meta.name = box.name;
          meta.delim = delim;

          logic(syncScope, 'folder-sync:existing', {
            type: type,
            name: box.name,
            path: path,
            delim: delim
          });

          // mark it with true to show that we've seen it.
          folderPubsByPath[path] = true;
        }
        // - new to us!
        else {
          logic(syncScope, 'folder-sync:add', {
            type: type,
            name: box.name,
            path: path,
            delim: delim
          });
          meta = self._learnAboutFolder(box.name, path, parentId, type,
                                        delim, pathDepth);
        }

        if (box.children)
          walkBoxes(box.children, pathDepth + 1, meta.id);
      });
    }

    walkBoxes(boxesRoot.children, 0, null);

    // - detect deleted folders
    // track dead folder id's so we can issue a
    var deadFolderIds = [];
    for (var folderPath in folderPubsByPath) {
      folderPub = folderPubsByPath[folderPath];
      // (skip those we found above)
      if (folderPub === true)
        continue;
      // Never delete our localdrafts or outbox folder.
      if ($mailslice.FolderStorage.isTypeLocalOnly(folderPub.type))
        continue;
      logic(syncScope, 'delete-dead-folder', {
        folderType: folderPub.type,
        folderId: folderPub.id
      });
      // It must have gotten deleted!
      this._forgetFolder(folderPub.id);
    }

    // Once we've synchonized the folder list, kick off another job to
    // check that we have all essential online folders. Once that
    // completes, we'll check to make sure our offline-only folders
    // (localdrafts, outbox) are in the right place according to where
    // this server stores other built-in folders.
    this.ensureEssentialOnlineFolders();
    this.normalizeFolderHierarchy();

    callback(null);
  },

  /**
   * Ensure that local-only folders exist. This runs synchronously
   * before we sync the folder list with the server. Ideally, these
   * folders should reside in a proper place in the folder hierarchy,
   * which may differ between servers depending on whether the
   * account's other folders live underneath the inbox or as
   * top-level-folders. But since moving folders is easy and doesn't
   * really affect the backend, we'll just ensure they exist here, and
   * fix up their hierarchical location when syncing the folder list.
   */
  ensureEssentialOfflineFolders: function() {
    [ 'outbox', 'localdrafts' ].forEach(function(folderType) {
      if (!this.getFirstFolderWithType(folderType)) {
        this._learnAboutFolder(
          /* name: */ folderType,
          /* path: */ folderType,
          /* parentId: */ null,
          /* type: */ folderType,
          /* delim: */ '',
          /* depth: */ 0,
          /* suppressNotification: */ true);
      }
    }, this);
  },

  /**
   * Kick off jobs to create essential folders (sent, trash) if
   * necessary. These folders should be created on both the client and
   * the server; contrast with `ensureEssentialOfflineFolders`.
   *
   * TODO: Support localizing all automatically named e-mail folders
   * regardless of the origin locale.
   * Relevant bugs: <https://bugzil.la/905869>, <https://bugzil.la/905878>.
   *
   * @param {function} callback
   *   Called when all ops have run.
   */
  ensureEssentialOnlineFolders: function(callback) {
    var essentialFolders = { 'trash': 'Trash', 'sent': 'Sent' };
    var latch = $allback.latch();

    for (var type in essentialFolders) {
      if (!this.getFirstFolderWithType(type)) {
        this.universe.createFolder(
          this.id, null, essentialFolders[type], type, false, latch.defer());
      }
    }

    latch.then(callback);
  },

  /**
   * Ensure that local-only folders live in a reasonable place in the
   * folder hierarchy by moving them if necessary.
   *
   * We proactively create local-only folders at the root level before
   * we synchronize with the server; if possible, we want these
   * folders to reside as siblings to other system-level folders on
   * the account. This is called at the end of syncFolderList, after
   * we have learned about all existing server folders.
   */
  normalizeFolderHierarchy: $acctmixins.normalizeFolderHierarchy,

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
    if (this.sentMessagesAutomaticallyAppearInSentFolder) {
      return;
    }

    composer.withMessageBlob({ includeBcc: true }, function(blob) {
      var message = {
        messageText: blob,
        // do not specify date; let the server use its own timestamping
        // since we want the approximate value of 'now' anyways.
        flags: ['\\Seen'],
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
          connInfo.conn.client.close();
        }
        catch (ex) {
          liveConns--;
        }
      }
      else {
        connInfo.conn.client.close();
      }
    }

    if (!liveConns && callback)
      callback();
  },

  checkAccount: function(listener) {
    logic(this, 'checkAccount_begin');
    this._makeConnection(function(err) {
      logic(this, 'checkAccount_end', { error: err });
      listener(err);
    }.bind(this), null, 'check');
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

}); // end define
