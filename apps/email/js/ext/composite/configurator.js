/**
 * Configurator for imap+smtp and pop3+smtp.
 **/

define(
  [
    'logic',
    '../accountcommon',
    '../a64',
    '../allback',
    './account',
    '../date',
    'require',
    'exports'
  ],
  function(
    logic,
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
                               callback) {
    var credentials, incomingInfo, smtpConnInfo, incomingType;
    if (domainInfo) {
      incomingType = (domainInfo.type === 'imap+smtp' ? 'imap' : 'pop3');
      var password = null;
      // If the account has an outgoingPassword, use that; otherwise
      // use the main password. We must take care to treat null values
      // as potentially valid in the future, if we allow password-free
      // account configurations.
      if (userDetails.outgoingPassword !== undefined) {
        password = userDetails.outgoingPassword;
      } else {
        password = userDetails.password;
      }
      credentials = {
        username: domainInfo.incoming.username,
        password: userDetails.password,
        outgoingUsername: domainInfo.outgoing.username,
        outgoingPassword: password,
      };
      if (domainInfo.oauth2Tokens) {
        // We need to save off all the information so:
        // - the front-end can reauthorize exclusively from this info.
        // - the back-end can refresh its token
        // - on upgrades so we can know if our scope isn't good enough.  (Note
        //   that we're not saving off the secret group; upgrades would need to
        //   factor in the auth or token endpoints.)
        credentials.oauth2 = {
          authEndpoint: domainInfo.oauth2Settings.authEndpoint,
          tokenEndpoint: domainInfo.oauth2Settings.tokenEndpoint,
          scope: domainInfo.oauth2Settings.scope,
          clientId: domainInfo.oauth2Secrets.clientId,
          clientSecret: domainInfo.oauth2Secrets.clientSecret,
          refreshToken: domainInfo.oauth2Tokens.refreshToken,
          accessToken: domainInfo.oauth2Tokens.accessToken,
          expireTimeMS: domainInfo.oauth2Tokens.expireTimeMS,
          // Treat the access token like it was recently retrieved; although we
          // generally expect the XOAUTH2 case should go through without
          // failure, in the event something is wrong, immediately re-fetching
          // a new accessToken is not going to be useful for us.
          _transientLastRenew: $date.PERFNOW()
        };
      }
      incomingInfo = {
        hostname: domainInfo.incoming.hostname,
        port: domainInfo.incoming.port,
        crypto: (typeof domainInfo.incoming.socketType === 'string' ?
                 domainInfo.incoming.socketType.toLowerCase() :
                 domainInfo.incoming.socketType),
      };

      if (incomingType === 'pop3') {
        incomingInfo.preferredAuthMethod = null;
      }
      smtpConnInfo = {
        emailAddress: userDetails.emailAddress, // used for probing
        hostname: domainInfo.outgoing.hostname,
        port: domainInfo.outgoing.port,
        crypto: (typeof domainInfo.outgoing.socketType === 'string' ?
                 domainInfo.outgoing.socketType.toLowerCase() :
                 domainInfo.outgoing.socketType),
      };
    }

    // Note: For OAUTH accounts, the credentials may be updated
    // in-place if a new access token was required. We don't need to
    // explicitly save those changes here because we define the
    // account with the same object below.
    var incomingPromise = new Promise(function(resolve, reject) {
      if (incomingType === 'imap') {
        require(['../imap/probe'], function(probe) {
          probe.probeAccount(credentials, incomingInfo).then(resolve, reject);
        });
      } else {
        require(['../pop3/probe'], function(probe) {
          probe.probeAccount(credentials, incomingInfo).then(resolve, reject);
        });
      }
    });

    var outgoingPromise = new Promise(function(resolve, reject) {
      require(['../smtp/probe'], function(probe) {
        probe.probeAccount(credentials, smtpConnInfo).then(resolve, reject);
      });
    });

    // Note: Promise.all() will fire the catch handler as soon as one
    // of the promises is rejected. While this means we will only see
    // the first error that returns, it actually works well for our
    // semantics, as we only notify the user about one side's problems
    // at a time.
    Promise.all([incomingPromise, outgoingPromise])
      .then(function(results) {
        var incomingConn = results[0].conn;
        var defineAccount;

        if (incomingType === 'imap') {
          defineAccount = this._defineImapAccount;
        } else if (incomingType === 'pop3') {
          incomingInfo.preferredAuthMethod = incomingConn.authMethod;
          defineAccount = this._definePop3Account;
        }
        defineAccount.call(this,
                           universe, userDetails, credentials,
                           incomingInfo, smtpConnInfo, incomingConn,
                           callback);
      }.bind(this))
      .catch(function(ambiguousErr) {
        // One of the account sides failed. Normally we leave the
        // IMAP/POP3 side open for reuse, but if the SMTP
        // configuration falied we must close the incoming connection.
        // (If the incoming side failed as well, we won't receive the
        // `.then` callback.)
        incomingPromise.then(function incomingOkButOutgoingFailed(result) {
          result.conn.close();
          // the error is no longer ambiguous; it was SMTP
          callback(ambiguousErr, /* conn: */ null,
                   { server: smtpConnInfo.hostname });
        }).catch(function incomingFailed(incomingErr) {
          callback(incomingErr, /* conn: */ null,
                   { server: incomingInfo.hostname });
        });
     });
 },

  recreateAccount: function(universe, oldVersion, oldAccountInfo, callback) {
    var oldAccountDef = oldAccountInfo.def;

    var credentials = {
      username: oldAccountDef.credentials.username,
      password: oldAccountDef.credentials.password,
      // (if these two keys are null, keep them that way:)
      outgoingUsername: oldAccountDef.credentials.outgoingUsername,
      outgoingPassword: oldAccountDef.credentials.outgoingPassword,
      authMechanism: oldAccountDef.credentials.authMechanism,
      oauth2: oldAccountDef.credentials.oauth2
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
      playSoundOnSend: oldAccountDef.hasOwnProperty('playSoundOnSend') ?
                   oldAccountDef.playSoundOnSend : true,

      credentials: credentials,
      receiveConnInfo: {
        hostname: oldAccountDef.receiveConnInfo.hostname,
        port: oldAccountDef.receiveConnInfo.port,
        crypto: oldAccountDef.receiveConnInfo.crypto,
        preferredAuthMethod:
          oldAccountDef.receiveConnInfo.preferredAuthMethod || null,
      },
      sendConnInfo: {
        hostname: oldAccountDef.sendConnInfo.hostname,
        port: oldAccountDef.sendConnInfo.port,
        crypto: oldAccountDef.sendConnInfo.crypto,
      },

      identities: $accountcommon.recreateIdentities(universe, accountId,
                                     oldAccountDef.identities)
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
                               callback) {
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
      playSoundOnSend: userDetails.hasOwnProperty('playSoundOnSend') ?
                   userDetails.playSoundOnSend : true,

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
          signature: null,
          signatureEnabled: false
        },
      ]
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
      playSoundOnSend: userDetails.hasOwnProperty('playSoundOnSend') ?
                   userDetails.playSoundOnSend : true,

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
          signature: null,
          signatureEnabled: false
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
            protoConn.capability
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
