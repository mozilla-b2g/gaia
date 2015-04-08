/**
 *
 **/

define(
  [
    'logic',
    './util',
    './mailchew-strings',
    './date',
    './slice_bridge_proxy',
    'require',
    'module',
    'exports'
  ],
  function(
    logic,
    $imaputil,
    $mailchewStrings,
    $date,
    $sliceBridgeProxy,
    require,
    $module,
    exports
  ) {
var bsearchForInsert = $imaputil.bsearchForInsert,
    bsearchMaybeExists = $imaputil.bsearchMaybeExists,
    SliceBridgeProxy = $sliceBridgeProxy.SliceBridgeProxy;

function toBridgeWireOn(x) {
  return x.toBridgeWire();
}

var FOLDER_TYPE_TO_SORT_PRIORITY = {
  account: 'a',
  inbox: 'c',
  starred: 'e',
  important: 'f',
  drafts: 'g',
  localdrafts: 'h',
  outbox: 'i',
  queue: 'j',
  sent: 'k',
  junk: 'l',
  trash: 'n',
  archive: 'p',
  normal: 'z',
  // nomail folders are annoying since they are basically just hierarchy,
  //  but they are also rare and should only happen amongst normal folders.
  nomail: 'z',
};

/**
 * Make a folder sorting function that groups folders by account, puts the
 * account header first in that group, maps priorities using
 * FOLDER_TYPE_TO_SORT_PRIORITY, then sorts by path within that.
 *
 * This is largely necessitated by localeCompare being at the mercy of glibc's
 * locale database and failure to fallback to unicode code points for
 * comparison purposes.
 */
function makeFolderSortString(account, folder) {
  if (!folder)
    return account.id;

  var parentFolder = account.getFolderMetaForFolderId(folder.parentId);
  return makeFolderSortString(account, parentFolder) + '!' +
         FOLDER_TYPE_TO_SORT_PRIORITY[folder.type] + '!' +
         folder.name.toLocaleLowerCase();
}

function strcmp(a, b) {
  if (a < b)
    return -1;
  else if (a > b)
    return 1;
  return 0;
}

function checkIfAddressListContainsAddress(list, addrPair) {
  if (!list)
    return false;
  var checkAddress = addrPair.address;
  for (var i = 0; i < list.length; i++) {
    if (list[i].address === checkAddress)
      return true;
  }
  return false;
}

/**
 * There is exactly one `MailBridge` instance for each `MailAPI` instance.
 * `same-frame-setup.js` is the only place that hooks them up together right
 * now.
 */
function MailBridge(universe, name) {
  this.universe = universe;
  this.universe.registerBridge(this);

  logic.defineScope(this, 'MailBridge', { name: name });

  /** @dictof[@key[handle] @value[BridgedViewSlice]]{ live slices } */
  this._slices = {};
  /** @dictof[@key[namespace] @value[@listof[BridgedViewSlice]]] */
  this._slicesByType = {
    accounts: [],
    identities: [],
    folders: [],
    headers: [],
    matchedHeaders: [],
  };

  /**
   * Observed bodies in the format of:
   *
   * @dictof[
   *   @key[suid]
   *   @value[@dictof[
   *     @key[handleId]
   *     @value[@oneof[Function null]]
   *   ]]
   * ]
   *
   * Similar in concept to folder slices but specific to bodies.
   */
  this._observedBodies = {};

  // outstanding persistent objects that aren't slices. covers: composition
  this._pendingRequests = {};
  //
  this._lastUndoableOpPair = null;
}
exports.MailBridge = MailBridge;
MailBridge.prototype = {
  __sendMessage: function(msg) {
    throw new Error('This is supposed to get hidden by an instance var.');
  },

  __receiveMessage: function mb___receiveMessage(msg) {
    var implCmdName = '_cmd_' + msg.type;
    if (!(implCmdName in this)) {
      logic(this, 'badMessageType', { type: msg.type });
      return;
    }
    logic(this, 'cmd', {
      type: msg.type,
      msg: msg
    });
    try {
      this[implCmdName](msg);
    } catch(ex) {
      logic.fail(ex);
      return; // note that we did not throw
    }
  },

  _cmd_ping: function mb__cmd_ping(msg) {
    this.__sendMessage({
      type: 'pong',
      handle: msg.handle,
    });
  },

  _cmd_modifyConfig: function mb__cmd_modifyConfig(msg) {
    this.universe.modifyConfig(msg.mods);
  },

  /**
   * Public api to verify if body has observers.
   *
   *
   *   MailBridge.bodyHasObservers(header.id) // => true/false.
   *
   */
  bodyHasObservers: function(suid) {
    return !!this._observedBodies[suid];
  },

  notifyConfig: function(config) {
    this.__sendMessage({
      type: 'config',
      config: config,
    });
  },

  _cmd_debugSupport: function mb__cmd_debugSupport(msg) {
    switch (msg.cmd) {
      case 'setLogging':
        this.universe.modifyConfig({ debugLogging: msg.arg });
        break;

      case 'dumpLog':
        switch (msg.arg) {
          case 'storage':
            this.universe.dumpLogToDeviceStorage();
            break;
        }
        break;
    }
  },

  _cmd_setInteractive: function mb__cmd_setInteractive(msg) {
    this.universe.setInteractive();
  },

  _cmd_localizedStrings: function mb__cmd_localizedStrings(msg) {
    $mailchewStrings.set(msg.strings);
  },

  _cmd_learnAboutAccount: function(msg) {
    this.universe.learnAboutAccount(msg.details).then(
      function success(info) {
        this.__sendMessage({
            type: 'learnAboutAccountResults',
            handle: msg.handle,
            data: info
          });
      }.bind(this),
      function errback(err) {
        this.__sendMessage({
            type: 'learnAboutAccountResults',
            handle: msg.handle,
            data: { result: 'no-config-info', configInfo: null }
          });
      }.bind(this));
  },

  _cmd_tryToCreateAccount: function mb__cmd_tryToCreateAccount(msg) {
    var self = this;
    this.universe.tryToCreateAccount(msg.details, msg.domainInfo,
                                     function(error, account, errorDetails) {
        self.__sendMessage({
            type: 'tryToCreateAccountResults',
            handle: msg.handle,
            account: account ? account.toBridgeWire() : null,
            error: error,
            errorDetails: errorDetails,
          });
      });
  },

  _cmd_clearAccountProblems: function mb__cmd_clearAccountProblems(msg) {
    var account = this.universe.getAccountForAccountId(msg.accountId),
        self = this;
    account.checkAccount(function(incomingErr, outgoingErr) {
      // Note that ActiveSync accounts won't have an outgoingError,
      // but that's fine. It just means that outgoing never errors!
      function canIgnoreError(err) {
        // If we succeeded or the problem was not an authentication,
        // assume everything went fine. This includes the case we're
        // offline.
        return (!err || (
          err !== 'bad-user-or-pass' &&
          err !== 'bad-address' &&
          err !== 'needs-oauth-reauth' &&
          err !== 'imap-disabled'
        ));
      }
      if (canIgnoreError(incomingErr) && canIgnoreError(outgoingErr)) {
        self.universe.clearAccountProblems(account);
      }
      self.__sendMessage({
        type: 'clearAccountProblems',
        handle: msg.handle,
      });
    });
  },

  _cmd_modifyAccount: function mb__cmd_modifyAccount(msg) {
    var account = this.universe.getAccountForAccountId(msg.accountId),
        accountDef = account.accountDef;

    for (var key in msg.mods) {
      var val = msg.mods[key];

      switch (key) {
        case 'name':
          accountDef.name = val;
          break;

        case 'username':
          // See the 'password' section below and/or
          // MailAPI.modifyAccount docs for the rationale for this
          // username equality check:
          if (accountDef.credentials.outgoingUsername ===
              accountDef.credentials.username) {
            accountDef.credentials.outgoingUsername = val;
          }
          accountDef.credentials.username = val;
          break;
        case 'incomingUsername':
          accountDef.credentials.username = val;
          break;
        case 'outgoingUsername':
          accountDef.credentials.outgoingUsername = val;
          break;
        case 'password':
          // 'password' is for changing both passwords, if they
          // currently match. If this account contains an SMTP
          // password (only composite ones will) and the passwords
          // were previously the same, assume that they both need to
          // remain the same. NOTE: By doing this, we save the user
          // from typing their password twice in the extremely common
          // case that both passwords are actually the same. If the
          // SMTP password is actually different, we'll just prompt
          // them for that independently if we discover it's still not
          // correct.
          if (accountDef.credentials.outgoingPassword ===
              accountDef.credentials.password) {
            accountDef.credentials.outgoingPassword = val;
          }
          accountDef.credentials.password = val;
          break;
        case 'incomingPassword':
          accountDef.credentials.password = val;
          break;
        case 'outgoingPassword':
          accountDef.credentials.outgoingPassword = val;
          break;
        case 'oauthTokens':
          var oauth2 = accountDef.credentials.oauth2;
          oauth2.accessToken = val.accessToken;
          oauth2.refreshToken = val.refreshToken;
          oauth2.expireTimeMS = val.expireTimeMS;
          break;

        case 'identities':
          // TODO: support identity mutation
          // we expect a list of identity mutation objects, namely an id and the
          // rest are attributes to change
          break;

        case 'servers':
          // TODO: support server mutation
          // we expect a list of server mutation objects; namely, the type names
          // the server and the rest are attributes to change
          break;

        case 'syncRange':
          accountDef.syncRange = val;
          break;

        case 'syncInterval':
          accountDef.syncInterval = val;
          break;

        case 'notifyOnNew':
          accountDef.notifyOnNew = val;
          break;

        case 'playSoundOnSend':
          accountDef.playSoundOnSend = val;
          break;

        case 'setAsDefault':
          // Weird things can happen if the device's clock goes back in time,
          // but this way, at least the user can change their default if they
          // cycle through their accounts.
          if (val)
            accountDef.defaultPriority = $date.NOW();
          break;

        default:
          throw new Error('Invalid key for modifyAccount: "' + key + '"');
      }
    }

    this.universe.saveAccountDef(accountDef, null);
    this.__sendMessage({
      type: 'modifyAccount',
      handle: msg.handle,
    });
  },

  _cmd_deleteAccount: function mb__cmd_deleteAccount(msg) {
    this.universe.deleteAccount(msg.accountId);
  },

  _cmd_modifyIdentity: function mb__cmd_modifyIdentity(msg) {
    var account = this.universe.getAccountForSenderIdentityId(msg.identityId),
        accountDef = account.accountDef,
        identity = this.universe.getIdentityForSenderIdentityId(msg.identityId);

    for (var key in msg.mods) {
      var val = msg.mods[key];

      switch (key) {
        case 'name':
          identity.name = val;
          break;

        case 'address':
          identity.address = val;
          break;

        case 'replyTo':
          identity.replyTo = val;
          break;

        case 'signature':
          identity.signature = val;
          break;

        case 'signatureEnabled':
          identity.signatureEnabled = val;
          break;

        default:
          throw new Error('Invalid key for modifyIdentity: "' + key + '"');
      }
    }
    // accountDef has the identity, so this persists it as well
    this.universe.saveAccountDef(accountDef, null, function() {
      this.__sendMessage({
        type: 'modifyIdentity',
        handle: msg.handle,
      });
    }.bind(this));

  },

  /**
   * Notify the frontend that login failed.
   *
   * @param account
   * @param {string} problem
   * @param {'incoming'|'outgoing'} whichSide
   */
  notifyBadLogin: function mb_notifyBadLogin(account, problem, whichSide) {
    this.__sendMessage({
      type: 'badLogin',
      account: account.toBridgeWire(),
      problem: problem,
      whichSide: whichSide,
    });
  },

  _cmd_viewAccounts: function mb__cmd_viewAccounts(msg) {
    var proxy = this._slices[msg.handle] =
          new SliceBridgeProxy(this, 'accounts', msg.handle);
    proxy.markers = this.universe.accounts.map(function(x) { return x.id; });

    this._slicesByType['accounts'].push(proxy);
    var wireReps = this.universe.accounts.map(toBridgeWireOn);
    // send all the accounts in one go.
    proxy.sendSplice(0, 0, wireReps, true, false);
  },

  notifyAccountAdded: function mb_notifyAccountAdded(account) {
    var accountWireRep = account.toBridgeWire();
    var i, proxy, slices, wireSplice = null, markersSplice = null;
    // -- notify account slices
    slices = this._slicesByType['accounts'];
    for (i = 0; i < slices.length; i++) {
      proxy = slices[i];
      proxy.sendSplice(proxy.markers.length, 0, [accountWireRep], false, false);
      proxy.markers.push(account.id);
    }

    // -- notify folder slices
    accountWireRep = account.toBridgeFolder();
    slices = this._slicesByType['folders'];
    var startMarker = makeFolderSortString(account, accountWireRep),
        idxStart;
    for (i = 0; i < slices.length; i++) {
      proxy = slices[i];
      // If it's filtered to an account, it can't care about us.  (You can't
      // know about an account before it's created.)
      if (proxy.mode === 'account')
        continue;

      idxStart = bsearchForInsert(proxy.markers, startMarker, strcmp);
      wireSplice = [accountWireRep];
      markersSplice = [startMarker];
      for (var iFolder = 0; iFolder < account.folders.length; iFolder++) {
        var folder = account.folders[iFolder],
            folderMarker = makeFolderSortString(account, folder),
            idxFolder = bsearchForInsert(markersSplice, folderMarker, strcmp);
        wireSplice.splice(idxFolder, 0, folder);
        markersSplice.splice(idxFolder, 0, folderMarker);
      }
      proxy.sendSplice(idxStart, 0, wireSplice, false, false);
      proxy.markers.splice.apply(proxy.markers,
                                 [idxStart, 0].concat(markersSplice));
    }
  },

  /**
   * Generate modifications for an account.  We only generate this for account
   * queries proper and not the folder representations of accounts because we
   * define that there is nothing interesting mutable for the folder
   * representations.
   */
  notifyAccountModified: function(account) {
    var slices = this._slicesByType['accounts'],
        accountWireRep = account.toBridgeWire();
    for (var i = 0; i < slices.length; i++) {
      var proxy = slices[i];
      var idx = proxy.markers.indexOf(account.id);
      if (idx !== -1) {
        proxy.sendUpdate([idx, accountWireRep]);
      }
    }
  },

  notifyAccountRemoved: function(accountId) {
    var i, proxy, slices;
    // -- notify account slices
    slices = this._slicesByType['accounts'];
    for (i = 0; i < slices.length; i++) {
      proxy = slices[i];
      var idx = proxy.markers.indexOf(accountId);
      if (idx !== -1) {
        proxy.sendSplice(idx, 1, [], false, false);
        proxy.markers.splice(idx, 1);
      }
    }

    // -- notify folder slices
    slices = this._slicesByType['folders'];
    var startMarker = accountId + '!!',
        endMarker = accountId + '!|';
    for (i = 0; i < slices.length; i++) {
      proxy = slices[i];
      var idxStart = bsearchForInsert(proxy.markers, startMarker,
                                      strcmp),
          idxEnd = bsearchForInsert(proxy.markers, endMarker,
                                    strcmp);
      if (idxEnd !== idxStart) {
        proxy.sendSplice(idxStart, idxEnd - idxStart, [], false, false);
        proxy.markers.splice(idxStart, idxEnd - idxStart);
      }
    }
  },

  _cmd_viewSenderIdentities: function mb__cmd_viewSenderIdentities(msg) {
    var proxy = this._slices[msg.handle] =
          new SliceBridgeProxy(this, 'identities', msg.handle);
    this._slicesByType['identities'].push(proxy);
    var wireReps = this.universe.identities;
    // send all the identities in one go.
    proxy.sendSplice(0, 0, wireReps, true, false);
  },

  _cmd_requestBodies: function(msg) {
    var self = this;
    this.universe.downloadBodies(msg.messages, msg.options, function() {
      self.__sendMessage({
        type: 'requestBodiesComplete',
        handle: msg.handle,
        requestId: msg.requestId
      });
    });
  },

  notifyFolderAdded: function(account, folderMeta) {
    var newMarker = makeFolderSortString(account, folderMeta);

    var slices = this._slicesByType['folders'];
    for (var i = 0; i < slices.length; i++) {
      var proxy = slices[i];
      var idx = bsearchForInsert(proxy.markers, newMarker, strcmp);
      proxy.sendSplice(idx, 0, [folderMeta], false, false);
      proxy.markers.splice(idx, 0, newMarker);
    }
  },

  notifyFolderModified: function(account, folderMeta) {
    var marker = makeFolderSortString(account, folderMeta);

    var slices = this._slicesByType['folders'];
    for (var i = 0; i < slices.length; i++) {
      var proxy = slices[i];

      var idx = bsearchMaybeExists(proxy.markers, marker, strcmp);
      if (idx === null)
        continue;

      proxy.sendUpdate([idx, folderMeta]);
    }
  },

  notifyFolderRemoved: function(account, folderMeta) {
    var marker = makeFolderSortString(account, folderMeta);

    var slices = this._slicesByType['folders'];
    for (var i = 0; i < slices.length; i++) {
      var proxy = slices[i];

      var idx = bsearchMaybeExists(proxy.markers, marker, strcmp);
      if (idx === null)
        continue;
      proxy.sendSplice(idx, 1, [], false, false);
      proxy.markers.splice(idx, 1);
    }
  },

  /**
   * Sends a notification of a change in the body.  Because FolderStorage is
   * the authoritative store of body representations and access is currently
   * mediated through mutexes, this method should really only be called by
   * FolderStorage.updateMessageBody.
   *
   * @param suid {SUID}
   *   The message whose body representation has been updated
   * @param detail {Object}
   *   See {{#crossLink "FolderStorage/updateMessageBody"}{{/crossLink}} for
   *   more information on the structure of this object.
   * @param body {BodyInfo}
   *   The current representation of the body.
   */
  notifyBodyModified: function(suid, detail, body) {
    var handles = this._observedBodies[suid];
    var defaultHandler = this.__sendMessage;

    if (handles) {
      for (var handle in handles) {
        // the suid may have an existing handler which captures the output of
        // the notification instead of dispatching here... This allows us to
        // aggregate pending notifications while fetching the bodies so updates
        // never come before the actual body.
        var emit = handles[handle] || defaultHandler;
        emit.call(this, {
          type: 'bodyModified',
          handle: handle,
          bodyInfo: body,
          detail: detail
        });
      }
    }
  },

  _cmd_viewFolders: function mb__cmd_viewFolders(msg) {
    var proxy = this._slices[msg.handle] =
          new SliceBridgeProxy(this, 'folders', msg.handle);
    this._slicesByType['folders'].push(proxy);
    proxy.mode = msg.mode;
    proxy.argument = msg.argument;
    var markers = proxy.markers = [];

    var wireReps = [];

    function pushAccountFolders(acct) {
      for (var iFolder = 0; iFolder < acct.folders.length; iFolder++) {
        var folder = acct.folders[iFolder];
        var newMarker = makeFolderSortString(acct, folder);
        var idx = bsearchForInsert(markers, newMarker, strcmp);
        wireReps.splice(idx, 0, folder);
        markers.splice(idx, 0, newMarker);
      }
    }

    if (msg.mode === 'account') {
      pushAccountFolders(
        this.universe.getAccountForAccountId(msg.argument));
    }
    else {
      var accounts = this.universe.accounts.concat();

      // sort accounts by their id's
      accounts.sort(function (a, b) {
        return a.id.localeCompare(b.id);
      });

      for (var iAcct = 0; iAcct < accounts.length; iAcct++) {
        var acct = accounts[iAcct], acctBridgeRep = acct.toBridgeFolder(),
            acctMarker = makeFolderSortString(acct, acctBridgeRep),
            idxAcct = bsearchForInsert(markers, acctMarker, strcmp);

        wireReps.splice(idxAcct, 0, acctBridgeRep);
        markers.splice(idxAcct, 0, acctMarker);
        pushAccountFolders(acct);
      }
    }
    proxy.sendSplice(0, 0, wireReps, true, false);
  },

  _cmd_viewFolderMessages: function mb__cmd_viewFolderMessages(msg) {
    var proxy = this._slices[msg.handle] =
          new SliceBridgeProxy(this, 'headers', msg.handle);
    this._slicesByType['headers'].push(proxy);

    var account = this.universe.getAccountForFolderId(msg.folderId);
    account.sliceFolderMessages(msg.folderId, proxy);
  },

  _cmd_searchFolderMessages: function mb__cmd_searchFolderMessages(msg) {
    var proxy = this._slices[msg.handle] =
          new SliceBridgeProxy(this, 'matchedHeaders', msg.handle);
    this._slicesByType['matchedHeaders'].push(proxy);
    var account = this.universe.getAccountForFolderId(msg.folderId);
    account.searchFolderMessages(
      msg.folderId, proxy, msg.phrase, msg.whatToSearch);
  },

  _cmd_refreshHeaders: function mb__cmd_refreshHeaders(msg) {
    var proxy = this._slices[msg.handle];
    if (!proxy) {
      logic(this, 'badSliceHandle', { handle: msg.handle });
      return;
    }

    if (proxy.__listener)
      proxy.__listener.refresh();
  },

  _cmd_growSlice: function mb__cmd_growSlice(msg) {
    var proxy = this._slices[msg.handle];
    if (!proxy) {
      logic(this, 'badSliceHandle', { handle: msg.handle });
      return;
    }

    if (proxy.__listener)
      proxy.__listener.reqGrow(msg.dirMagnitude, msg.userRequestsGrowth);
  },

  _cmd_shrinkSlice: function mb__cmd_shrinkSlice(msg) {
    var proxy = this._slices[msg.handle];
    if (!proxy) {
      logic(this, 'badSliceHandle', { handle: msg.handle });
      return;
    }

    if (proxy.__listener)
      proxy.__listener.reqNoteRanges(
        msg.firstIndex, msg.firstSuid, msg.lastIndex, msg.lastSuid);
  },

  _cmd_killSlice: function mb__cmd_killSlice(msg) {
    var proxy = this._slices[msg.handle];
    if (!proxy) {
      logic(this, 'badSliceHandle', { handle: msg.handle });
      return;
    }

    delete this._slices[msg.handle];
    var proxies = this._slicesByType[proxy._ns],
        idx = proxies.indexOf(proxy);
    proxies.splice(idx, 1);
    proxy.die();

    this.__sendMessage({
      type: 'sliceDead',
      handle: msg.handle,
    });
  },

  _cmd_getBody: function mb__cmd_getBody(msg) {
    var self = this;
    // map the message id to the folder storage
    var folderStorage = this.universe.getFolderStorageForMessageSuid(msg.suid);

    // when requesting the body we also create a observer to notify the client
    // of events... We never want to send the updates before fetching the body
    // so we buffer them here with a temporary handler.
    var pendingUpdates = [];

    var catchPending = function catchPending(msg) {
      pendingUpdates.push(msg);
    };

    if (!this._observedBodies[msg.suid])
      this._observedBodies[msg.suid] = {};

    this._observedBodies[msg.suid][msg.handle] = catchPending;

    var handler = function(bodyInfo) {
      self.__sendMessage({
        type: 'gotBody',
        handle: msg.handle,
        bodyInfo: bodyInfo
      });

      // if all body reps where requested we verify that all are present
      // otherwise we begin the request for more body reps.
      if (
        msg.downloadBodyReps &&
        !folderStorage.messageBodyRepsDownloaded(bodyInfo)
      ) {

        self.universe.downloadMessageBodyReps(
          msg.suid,
          msg.date,
          function() { /* we don't care it will send update events */ }
        );
      }

      // dispatch pending updates...
      pendingUpdates.forEach(self.__sendMessage, self);
      pendingUpdates = null;

      // revert to default handler. Note! this is intentionally
      // set to null and not deleted if deleted the observer is removed.
      self._observedBodies[msg.suid][msg.handle] = null;
    };

    if (msg.withBodyReps)
      folderStorage.getMessageBodyWithReps(msg.suid, msg.date, handler);
    else
      folderStorage.getMessageBody(msg.suid, msg.date, handler);
  },

  _cmd_killBody: function(msg) {
    var handles = this._observedBodies[msg.id];
    if (handles) {
      delete handles[msg.handle];

      var purgeHandles = true;
      for (var key in handles) {
        purgeHandles = false;
        break;
      }

      if (purgeHandles) {
        delete this._observedBodies[msg.id];
      }
    }

    this.__sendMessage({
      type: 'bodyDead',
      handle: msg.handle
    });
  },

  _cmd_downloadAttachments: function mb__cmd__downloadAttachments(msg) {
    var self = this;
    this.universe.downloadMessageAttachments(
      msg.suid, msg.date, msg.relPartIndices, msg.attachmentIndices,
      msg.registerAttachments,
      function(err) {
        self.__sendMessage({
          type: 'downloadedAttachments',
          handle: msg.handle
        });
      });
  },

  //////////////////////////////////////////////////////////////////////////////
  // Message Mutation
  //
  // All mutations are told to the universe which breaks the modifications up on
  // a per-account basis.

  _cmd_modifyMessageTags: function mb__cmd_modifyMessageTags(msg) {
    // XXXYYY

    // - The mutations are written to the database for persistence (in case
    //   we fail to make the change in a timely fashion) and so that we can
    //   know enough to reverse the operation.
    // - Speculative changes are made to the headers in the database locally.

    var longtermIds = this.universe.modifyMessageTags(
      msg.opcode, msg.messages, msg.addTags, msg.removeTags);
    this.__sendMessage({
      type: 'mutationConfirmed',
      handle: msg.handle,
      longtermIds: longtermIds,
    });
  },

  _cmd_deleteMessages: function mb__cmd_deleteMessages(msg) {
    var longtermIds = this.universe.deleteMessages(
      msg.messages);
    this.__sendMessage({
      type: 'mutationConfirmed',
      handle: msg.handle,
      longtermIds: longtermIds,
    });
  },

  _cmd_moveMessages: function mb__cmd_moveMessages(msg) {
    var longtermIds = this.universe.moveMessages(
      msg.messages, msg.targetFolder, function(err, moveMap) {
        this.__sendMessage({
          type: 'mutationConfirmed',
          handle: msg.handle,
          longtermIds: longtermIds,
          result: moveMap
        });
      }.bind(this));
  },

  _cmd_sendOutboxMessages: function(msg) {
    var account = this.universe.getAccountForAccountId(msg.accountId);
    this.universe.sendOutboxMessages(account, {
      reason: 'api request'
    }, function(err) {
      this.__sendMessage({
        type: 'sendOutboxMessages',
        handle: msg.handle
      });
    }.bind(this));
  },

  _cmd_setOutboxSyncEnabled: function(msg) {
    var account = this.universe.getAccountForAccountId(msg.accountId);
    this.universe.setOutboxSyncEnabled(
      account, msg.outboxSyncEnabled, function() {
        this.__sendMessage({
          type: 'setOutboxSyncEnabled',
          handle: msg.handle
        });
      }.bind(this));
  },

  _cmd_undo: function mb__cmd_undo(msg) {
    this.universe.undoMutation(msg.longtermIds);
  },

  //////////////////////////////////////////////////////////////////////////////
  // Composition

  _cmd_beginCompose: function mb__cmd_beginCompose(msg) {
    require(['./drafts/composer', 'mailchew'], function ($composer, $mailchew) {
      var req = this._pendingRequests[msg.handle] = {
        type: 'compose',
        active: 'begin',
        account: null,
        persistedNamer: null,
        die: false
      };

      // - figure out the identity to use
      var account, identity, folderId;
      if (msg.mode === 'new' && msg.submode === 'folder')
        account = this.universe.getAccountForFolderId(msg.refSuid);
      else
        account = this.universe.getAccountForMessageSuid(msg.refSuid);
      req.account = account;

      identity = account.identities[0];

      var bodyText = $mailchew.generateBaseComposeBody(identity);
      if (msg.mode !== 'reply' && msg.mode !== 'forward') {
        return this.__sendMessage({
          type: 'composeBegun',
          handle: msg.handle,
          error: null,
          identity: identity,
          subject: '',
          body: { text: bodyText, html: null },
          to: [],
          cc: [],
          bcc: [],
          references: null,
          attachments: [],
        });
      }

      var folderStorage =
        this.universe.getFolderStorageForMessageSuid(msg.refSuid);
      var self = this;
      folderStorage.getMessage(
        msg.refSuid, msg.refDate, { withBodyReps: true }, function(res) {

        if (!res) {
          // cannot compose a reply/fwd message without a header/body
          return console.warn(
            'Cannot compose message missing header/body: ',
            msg.refSuid
          );
        }

        var header = res.header;
        var bodyInfo = res.body;

        if (msg.mode === 'reply') {
          var rTo, rCc, rBcc;
          // clobber the sender's e-mail with the reply-to
          var effectiveAuthor = {
            name: msg.refAuthor.name,
            address: (header.replyTo && header.replyTo.address) ||
                     msg.refAuthor.address,
          };
          switch (msg.submode) {
            case 'list':
              // XXX we can't do this without headers we're not retrieving,
              // fall through for now.
            case null:
            case 'sender':
              rTo = [effectiveAuthor];
              rCc = rBcc = [];
              break;
            case 'all':
              // No need to change the lists if the author is already on the
              // reply lists.
              //
              // nb: Our logic here is fairly simple; Thunderbird's
              // nsMsgCompose.cpp does a lot of checking that we should
              // audit, although much of it could just be related to its
              // much more extensive identity support.
              if (checkIfAddressListContainsAddress(header.to,
                                                    effectiveAuthor) ||
                  checkIfAddressListContainsAddress(header.cc,
                                                    effectiveAuthor)) {
                rTo = header.to;
              }
              // add the author as the first 'to' person
              else {
                if (header.to && header.to.length)
                  rTo = [effectiveAuthor].concat(header.to);
                else
                  rTo = [effectiveAuthor];
              }

              // For reply-all, don't reply to your own address.
              var notYourIdentity = function(person) {
                return person.address !== identity.address;
              };

              rTo = rTo.filter(notYourIdentity);
              rCc = (header.cc || []).filter(notYourIdentity);
              rBcc = header.bcc;
              break;
          }

          var referencesStr;
          if (bodyInfo.references) {
            referencesStr = bodyInfo.references.concat([msg.refGuid])
                              .map(function(x) { return '<' + x + '>'; })
                              .join(' ');
          }
          else if (msg.refGuid) {
            referencesStr = '<' + msg.refGuid + '>';
          }
          // ActiveSync does not thread so good
          else {
            referencesStr = '';
          }
          req.active = null;

          self.__sendMessage({
            type: 'composeBegun',
            handle: msg.handle,
            error: null,
            identity: identity,
            subject: $mailchew.generateReplySubject(msg.refSubject),
            // blank lines at the top are baked in
            body: $mailchew.generateReplyBody(
                    bodyInfo.bodyReps, effectiveAuthor, msg.refDate,
                    identity, msg.refGuid),
            to: rTo,
            cc: rCc,
            bcc: rBcc,
            referencesStr: referencesStr,
            attachments: [],
          });
        }
        else {
          req.active = null;
          self.__sendMessage({
            type: 'composeBegun',
            handle: msg.handle,
            error: null,
            identity: identity,
            subject: $mailchew.generateForwardSubject(msg.refSubject),
            // blank lines at the top are baked in by the func
            body: $mailchew.generateForwardMessage(
                    msg.refAuthor, msg.refDate, msg.refSubject,
                    header, bodyInfo, identity),
            // forwards have no assumed envelope information
            to: [],
            cc: [],
            bcc: [],
            // XXX imitate Thunderbird current or previous behaviour; I
            // think we ended up linking forwards into the conversation
            // they came from, but with an extra header so that it was
            // possible to detect it was a forward.
            references: null,
            attachments: [],
          });
        }
      });
    }.bind(this));
  },

  _cmd_attachBlobToDraft: function(msg) {
    // for ordering consistency reasons with other draft logic, this needs to
    // require composer as a dependency too.
    require(['./drafts/composer'], function ($composer) {
      var draftReq = this._pendingRequests[msg.draftHandle];
      if (!draftReq)
        return;

      this.universe.attachBlobToDraft(
        draftReq.account,
        draftReq.persistedNamer,
        msg.attachmentDef,
        function (err) {
          this.__sendMessage({
            type: 'attachedBlobToDraft',
            // Note! Our use of 'msg' here means that our reference to the Blob
            // will be kept alive slightly longer than the job keeps it alive,
            // but just slightly.
            handle: msg.handle,
            draftHandle: msg.draftHandle,
            err: err
          });
        }.bind(this));
    }.bind(this));
  },

  _cmd_detachAttachmentFromDraft: function(msg) {
    // for ordering consistency reasons with other draft logic, this needs to
    // require composer as a dependency too.
    require(['./drafts/composer'], function ($composer) {
    var req = this._pendingRequests[msg.draftHandle];
    if (!req)
      return;

    this.universe.detachAttachmentFromDraft(
      req.account,
      req.persistedNamer,
      msg.attachmentIndex,
      function (err) {
        this.__sendMessage({
          type: 'detachedAttachmentFromDraft',
          handle: msg.handle,
          draftHandle: msg.draftHandle,
          err: err
        });
      }.bind(this));
    }.bind(this));
  },

  _cmd_resumeCompose: function mb__cmd_resumeCompose(msg) {
    var req = this._pendingRequests[msg.handle] = {
      type: 'compose',
      active: 'resume',
      account: null,
      persistedNamer: msg.messageNamer,
      die: false
    };

    // NB: We are not acquiring the folder mutex here because
    var account = req.account =
          this.universe.getAccountForMessageSuid(msg.messageNamer.suid);
    var folderStorage = this.universe.getFolderStorageForMessageSuid(
                          msg.messageNamer.suid);
    var self = this;
    folderStorage.runMutexed('resumeCompose', function(callWhenDone) {
      function fail() {
        self.__sendMessage({
          type: 'composeBegun',
          handle: msg.handle,
          error: 'no-message'
        });
        callWhenDone();
      }
      folderStorage.getMessage(msg.messageNamer.suid, msg.messageNamer.date,
                               function(res) {
        try {
          if (!res.header || !res.body) {
            fail();
            return;
          }
          var header = res.header, body = res.body;

          // -- convert from header/body rep to compose rep

          var composeBody = {
            text: '',
            html: null,
          };

          // Body structure should be guaranteed, but add some checks.
          if (body.bodyReps.length >= 1 &&
              body.bodyReps[0].type === 'plain' &&
              body.bodyReps[0].content.length === 2 &&
              body.bodyReps[0].content[0] === 0x1) {
            composeBody.text = body.bodyReps[0].content[1];
          }
          // HTML is optional, but if present, should satisfy our guard
          if (body.bodyReps.length == 2 &&
              body.bodyReps[1].type === 'html') {
            composeBody.html = body.bodyReps[1].content;
          }

          var attachments = [];
          body.attachments.forEach(function(att) {
            attachments.push({
              name: att.name,
              blob: {
                size: att.sizeEstimate,
                type: att.type
              }
            });
          });

          req.active = null;
          self.__sendMessage({
            type: 'composeBegun',
            handle: msg.handle,
            error: null,
            identity: account.identities[0],
            subject: header.subject,
            body: composeBody,
            to: header.to,
            cc: header.cc,
            bcc: header.bcc,
            referencesStr: body.references,
            attachments: attachments,
            sendStatus: header.sendStatus
          });
          callWhenDone();
        }
        catch (ex) {
          fail(); // calls callWhenDone
        }
      });
    });
  },

  /**
   * Save a draft, delete a draft, or try and send a message.
   *
   * Drafts are saved in our IndexedDB storage. This is notable because we are
   * told about attachments via their Blobs.
   */
  _cmd_doneCompose: function mb__cmd_doneCompose(msg) {
    require(['./drafts/composer'], function ($composer) {
      var req = this._pendingRequests[msg.handle], self = this;
      if (!req) {
        return;
      }
      if (msg.command === 'die') {
        if (req.active) {
          req.die = true;
        }
        else {
          delete this._pendingRequests[msg.handle];
        }
        return;
      }
      var account;
      if (msg.command === 'delete') {
        function sendDeleted() {
          self.__sendMessage({
            type: 'doneCompose',
            handle: msg.handle
          });
        }
        if (req.persistedNamer) {
          account = this.universe.getAccountForMessageSuid(
                      req.persistedNamer.suid);
          this.universe.deleteDraft(account, req.persistedNamer, sendDeleted);
        }
        else {
          sendDeleted();
        }
        delete this._pendingRequests[msg.handle];
        // XXX if we have persistedFolder/persistedUID, enqueue a delete of that
        // message and try and execute it.
        return;
      }

      var wireRep = msg.state;
      account = this.universe.getAccountForSenderIdentityId(wireRep.senderId);
      var identity = this.universe.getIdentityForSenderIdentityId(
                       wireRep.senderId);

      if (msg.command === 'send') {
        // To enqueue a message for sending:
        //   1. Save the draft.
        //   2. Move the draft to the outbox.
        //   3. Fire off a job to send pending outbox messages.

        req.persistedNamer = this.universe.saveDraft(
          account, req.persistedNamer, wireRep,
          function(err, newRecords) {
            req.active = null;
            if (req.die) {
              delete this._pendingRequests[msg.handle];
            }

            var outboxFolder = account.getFirstFolderWithType('outbox');
            this.universe.moveMessages([req.persistedNamer], outboxFolder.id);

            // We only want to display notifications if the universe
            // is online, i.e. we expect this sendOutboxMessages
            // invocation to actually fire immediately. If we're in
            // airplane mode, for instance, this job won't actually
            // run until we're online, in which case it no longer
            // makes sense to emit notifications for this job.
            this.universe.sendOutboxMessages(account, {
              reason: 'moved to outbox',
              emitNotifications: this.universe.online
            });
          }.bind(this));

        var initialSendStatus = {
          accountId: account.id,
          suid: req.persistedNamer.suid,
          state: (this.universe.online ? 'sending' : 'pending'),
          emitNotifications: true
        };

        // Send 'doneCompose' nearly immediately, as saveDraft might
        // take a while to complete if other stuff is going on. We'll
        // pass along the initialSendStatus so that we can immediately
        // display status information.
        this.__sendMessage({
          type: 'doneCompose',
          handle: msg.handle,
          sendStatus: initialSendStatus
        });

        // Broadcast the send status immediately here as well.
        this.universe.__notifyBackgroundSendStatus(initialSendStatus);
      }
      else if (msg.command === 'save') {
        // Save the draft, updating our persisted namer.
        req.persistedNamer = this.universe.saveDraft(
          account, req.persistedNamer, wireRep,
          function(err) {
            req.active = null;
            if (req.die)
              delete self._pendingRequests[msg.handle];
            self.__sendMessage({
              type: 'doneCompose',
              handle: msg.handle
            });
          });
      }
    }.bind(this));
  },

  notifyCronSyncStart: function mb_notifyCronSyncStart(accountIds) {
    this.__sendMessage({
      type: 'cronSyncStart',
      accountIds: accountIds
    });
  },

  notifyCronSyncStop: function mb_notifyCronSyncStop(accountsResults) {
    this.__sendMessage({
      type: 'cronSyncStop',
      accountsResults: accountsResults
    });
  },

  /**
   * Notify the frontend about the status of message sends. Data has
   * keys like 'state', 'error', etc, per the sendOutboxMessages job.
   */
  notifyBackgroundSendStatus: function(data) {
    this.__sendMessage({
      type: 'backgroundSendStatus',
      data: data
    });
  }

};

}); // end define
