define([
  'logic',
  '../errbackoff',
  '../composite/incoming',
  './sync',
  '../errorutils',
  './jobs',
  '../drafts/draft_rep',
  '../disaster-recovery',
  'module',
  'require',
  'exports'],
function(
  logic,
  errbackoff,
  incoming,
  pop3sync,
  errorutils,
  pop3jobs,
  draftRep,
  DisasterRecovery,
  module,
  require,
  exports
) {

var CompositeIncomingAccount = incoming.CompositeIncomingAccount;

/**
 * Define a POP3 account. Much of the functionality here is similar
 * to IMAP; Pop3Account inherits the shared parts from
 * CompositeIncomingAccount.
 */
function Pop3Account(universe, compositeAccount, accountId, credentials,
                     connInfo, folderInfos, dbConn, existingProtoConn) {
  logic.defineScope(this, 'Account', { accountId: accountId,
                                       accountType: 'pop3' });

  CompositeIncomingAccount.apply(
      this, [pop3sync.Pop3FolderSyncer].concat(Array.slice(arguments)));

  // Set up connection information. We can't make much use of
  // connection pooling since the POP3 protocol only allows one client
  // to access a mailbox at a given time, so there's no connection pool.
  this._conn = null;
  this._pendingConnectionRequests = [];
  this._backoffEndpoint = errbackoff.createEndpoint('pop3:' + this.id, this);

  // If we have an existing connection from setting up the account, we
  // can reuse that during the first sync.
  if (existingProtoConn) {
    DisasterRecovery.associateSocketWithAccount(
      existingProtoConn.socket, this);
    this._conn = existingProtoConn;
  }

  // Immediately ensure that we have any required local-only folders,
  // as those can be created even while offline.
  this.ensureEssentialOfflineFolders();

  this._jobDriver = new pop3jobs.Pop3JobDriver(
      this, this._folderInfos.$mutationState);
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
    require(['./pop3', './probe'], function(pop3, pop3probe) {
      logic(this, 'createConnection', { label: whyLabel });
      var opts = {
        host: this._connInfo.hostname,
        port: this._connInfo.port,
        crypto: this._connInfo.crypto,

        preferredAuthMethod: this._connInfo.preferredAuthMethod,

        username: this._credentials.username,
        password: this._credentials.password,
      };

      var conn = this._conn = new pop3.Pop3Client(opts, function(err) {
        if (err) {
          // Failed to get the connection:
          console.error('Connect error:', err.name, 'formal:', err, 'on',
                        this._connInfo.hostname, this._connInfo.port);

          err = pop3probe.normalizePop3Error(err);

          if (errorutils.shouldReportProblem(err)) {
            this.universe.__reportAccountProblem(
              this.compositeAccount, err, 'incoming');
          }

          callback && callback(err, null);
          conn.close();

          // Track this failure for backoff purposes.
          if (errorutils.shouldRetry(err)) {
            if (this._backoffEndpoint.noteConnectFailureMaybeRetry(
              errorutils.wasErrorFromReachableState(err))) {
              this._backoffEndpoint.scheduleConnectAttempt(
                this._makeConnection.bind(this));
             } else {
               this._backoffEndpoint.noteBrokenConnection();
            }
          } else {
            this._backoffEndpoint.noteBrokenConnection();
          }
        }
        // Succeeded:
        else {
          this._backoffEndpoint.noteConnectSuccess();
          callback && callback(null, conn);
        }
      }.bind(this));

      DisasterRecovery.associateSocketWithAccount(conn.socket, this);
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
    logic(self, 'deleteFolder', { path: folderMeta.path });
    self._forgetFolder(folderId);
    callback && callback(null, folderMeta);
  },

  /**
   * Shut down the account and close the connection.
   */
  shutdown: function(callback) {
    CompositeIncomingAccount.prototype.shutdownFolders.call(this);

    this._backoffEndpoint.shutdown();

    if (this._conn && this._conn.close) {
      this._conn.close();
    }
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
    if (this._conn !== null) {
      if (this._conn.state !== 'disconnected') {
        this._conn.close();
      }
      this._conn = null;
    }
    logic(this, 'checkAccount_begin');
    this.withConnection(function(err) {
      logic(this, 'checkAccount_end', { error: err });
      callback(err);
    }.bind(this), 'checkAccount');
  },

  /**
   * Ensure that local-only folders exist. This is run immediately
   * upon account initialization. Since POP3 doesn't support server
   * folders, all folders are local-only, so this function does all
   * the hard work.
   */
  ensureEssentialOfflineFolders: function() {
    // Create required folders if necessary.
    [ 'sent', 'localdrafts', 'trash', 'outbox' ].forEach(function(folderType) {
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
   * POP3 doesn't support server folders, so all folder creation is
   * done in `ensureEssentialOfflineFolders`.

   * @param {function} callback
   *   Called immediately, for homogeneity with other account types.
   */
  ensureEssentialOnlineFolders: function(callback) {
    // All the important work is already done. Yay POP3!
    callback && callback();
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


}); // end define
