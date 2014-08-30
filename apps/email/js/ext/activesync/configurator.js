/**
 * Configurator for activesync
 **/

define(
  [
    'rdcommon/log',
    '../accountcommon',
    '../a64',
    './account',
    '../date',
    'tcp-socket',
    'require',
    'exports'
  ],
  function(
    $log,
    $accountcommon,
    $a64,
    $asacct,
    $date,
    tcpSocket,
    require,
    exports
  ) {

function checkServerCertificate(url, callback) {
  var match = /^https:\/\/([^:/]+)(?::(\d+))?/.exec(url);
  // probably unit test http case?
  if (!match) {
    callback(null);
    return;
  }
  var port = match[2] ? parseInt(match[2], 10) : 443,
      host = match[1];

  console.log('checking', host, port, 'for security problem');

  var sock = tcpSocket.open(host, port);
  function reportAndClose(err) {
    if (sock) {
      var wasSock = sock;
      sock = null;
      try {
        wasSock.close();
      }
      catch (ex) {
      }
      callback(err);
    }
  }
  // this is a little dumb, but since we don't actually get an event right now
  // that tells us when our secure connection is established, and connect always
  // happens, we write data when we connect to help trigger an error or have us
  // receive data to indicate we successfully connected.
  // so, the deal is that connect is going to happen.
  sock.onopen = function() {
    sock.send(
      new TextEncoder('utf-8').encode('GET /images/logo.png HTTP/1.1\n\n'));
  };
  sock.onerror = function(err) {
    var reportErr = null;
    if (err && typeof(err) === 'object' &&
        /^Security/.test(err.name))
      reportErr = 'bad-security';
    reportAndClose(reportErr);
  };
  sock.ondata = function(data) {
    reportAndClose(null);
  };
}

exports.account = $asacct;
exports.configurator = {
  tryToCreateAccount: function cfg_as_ttca(universe, userDetails, domainInfo,
                                           callback, _LOG) {
    require(['activesync/protocol'], function ($asproto) {
      var credentials = {
        username: domainInfo.incoming.username,
        password: userDetails.password,
      };

      var deviceId = $asacct.makeUniqueDeviceId();

      var self = this;
      var conn = new $asproto.Connection(deviceId);
      conn.open(domainInfo.incoming.server, credentials.username,
                credentials.password);
      conn.timeout = $asacct.DEFAULT_TIMEOUT_MS;

      conn.connect(function(error, options) {
        if (error) {
          // This error is basically an indication of whether we were able to
          // call getOptions or not.  If the XHR request completed, we get an
          // HttpError.  If we timed out or an XHR error occurred, we get a
          // general Error.
          var failureType,
              failureDetails = { server: domainInfo.incoming.server };

          if (error instanceof $asproto.HttpError) {
            if (error.status === 401) {
              failureType = 'bad-user-or-pass';
            }
            else if (error.status === 403) {
              failureType = 'not-authorized';
            }
            // Treat any other errors where we talked to the server as a problem
            // with the server.
            else {
              failureType = 'server-problem';
              failureDetails.status = error.status;
            }
          }
          else {
            // We didn't talk to the server, so it's either an unresponsive
            // server or a server with a bad certificate.  (We require https
            // outside of unit tests so there's no need to branch here.)
            checkServerCertificate(
              domainInfo.incoming.server,
              function(securityError) {
                var failureType;
                if (securityError)
                  failureType = 'bad-security';
                else
                  failureType = 'unresponsive-server';
                callback(failureType, null, failureDetails);
              });
            return;
          }
          callback(failureType, null, failureDetails);
          return;
        }

        var accountId = $a64.encodeInt(universe.config.nextAccountNum++);
        var accountDef = {
          id: accountId,
          name: userDetails.accountName || userDetails.emailAddress,
          defaultPriority: $date.NOW(),

          type: 'activesync',
          syncRange: 'auto',

          syncInterval: userDetails.syncInterval || 0,
          notifyOnNew: userDetails.hasOwnProperty('notifyOnNew') ?
                       userDetails.notifyOnNew : true,
          playSoundOnSend: userDetails.hasOwnProperty('playSoundOnSend') ?
                       userDetails.playSoundOnSend : true,

          credentials: credentials,
          connInfo: {
            server: domainInfo.incoming.server,
            deviceId: deviceId
          },

          identities: [
            {
              id: accountId + '/' +
                  $a64.encodeInt(universe.config.nextIdentityNum++),
              name: userDetails.displayName || domainInfo.displayName,
              address: userDetails.emailAddress,
              replyTo: null,
              signature: null
            },
          ]
        };

        self._loadAccount(universe, accountDef, conn, function (account) {
          callback(null, account, null);
        });
      });
    }.bind(this));
  },

  recreateAccount: function cfg_as_ra(universe, oldVersion, oldAccountInfo,
                                      callback) {
    var oldAccountDef = oldAccountInfo.def;
    var credentials = {
      username: oldAccountDef.credentials.username,
      password: oldAccountDef.credentials.password,
    };
    var accountId = $a64.encodeInt(universe.config.nextAccountNum++);
    var accountDef = {
      id: accountId,
      name: oldAccountDef.name,

      type: 'activesync',
      syncRange: oldAccountDef.syncRange,
      syncInterval: oldAccountDef.syncInterval || 0,
      notifyOnNew: oldAccountDef.hasOwnProperty('notifyOnNew') ?
                   oldAccountDef.notifyOnNew : true,
      playSoundOnSend: oldAccountDef.hasOwnProperty('playSoundOnSend') ?
                   oldAccountDef.playSoundOnSend : true,

      credentials: credentials,
      connInfo: {
        server: oldAccountDef.connInfo.server,
        deviceId: oldAccountDef.connInfo.deviceId ||
                  $asacct.makeUniqueDeviceId()
      },

      identities: $accountcommon.recreateIdentities(universe, accountId,
                                     oldAccountDef.identities)
    };

    this._loadAccount(universe, accountDef, null, function (account) {
      callback(null, account, null);
    });
  },

  /**
   * Save the account def and folder info for our new (or recreated) account and
   * then load it.
   */
  _loadAccount: function cfg_as__loadAccount(universe, accountDef,
                                             protoConn, callback) {
    // XXX: Just reload the old folders when applicable instead of syncing the
    // folder list again, which is slow.
    var folderInfo = {
      $meta: {
        nextFolderNum: 0,
        nextMutationNum: 0,
        lastFolderSyncAt: 0,
        syncKey: '0',
      },
      $mutations: [],
      $mutationState: {},
    };
    universe.saveAccountDef(accountDef, folderInfo);
    universe._loadAccount(accountDef, folderInfo, protoConn, callback);
  },
};

}); // end define
