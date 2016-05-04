/**
 * imap/client.js: Wraps IMAP connection creation, to avoid redundancy
 * between connection-related setup in imap/account.js and
 * imap/probe.js.
 */
define(function(require, exports) {

  var BrowserBox = require('browserbox');
  var ImapClient = require('browserbox-imap');
  var imapHandler = require('imap-handler');
  var logic = require('logic');
  var syncbase = require('../syncbase');
  var errorutils = require('../errorutils');
  var oauth = require('../oauth');

  var setTimeout = window.setTimeout;
  var clearTimeout = window.clearTimeout;

  exports.setTimeoutFunctions = function(setFn, clearFn) {
    setTimeout = setFn;
    clearTimeout = clearFn;
  };

  function noop() {
    // nothing
  }

  var scope = logic.scope('ImapClient');

   /**
   * Open a connection to an IMAP server.
   *
   * @param {object} credentials
   *   keys: username, password, [oauth2]
   * @param {object} connInfo
   *   keys: hostname, port, crypto
   * @param {function(credentials)} credsUpdatedCallback
   *   Callback, called if the credentials have been updated and
   *   should be stored to disk. Not called if the credentials are
   *   already up-to-date.
   * @return {Promise}
   *   resolve => {BrowserBox} conn
   *   reject => {String} normalized String error
   */

  exports.createImapConnection = function(credentials, connInfo,
                                          credsUpdatedCallback) {
    var conn;

    return oauth.ensureUpdatedCredentials(credentials, credsUpdatedCallback)
    .then(function() {
      return new Promise(function(resolve, reject) {
        conn = new BrowserBox(
          connInfo.hostname,
          connInfo.port, {
            auth: {
              user: credentials.username,
              pass: credentials.password,
              xoauth2: credentials.oauth2 ?
                         credentials.oauth2.accessToken : null
            },
            id: {
              vendor: 'Mozilla',
              name: 'GaiaMail',
              version: '0.2',
              'support-url': 'http://mzl.la/file-gaia-email-bug'
            },
            useSecureTransport: (connInfo.crypto === 'ssl' ||
                                 connInfo.crypto === true),
            requireTLS: connInfo.crypto === 'starttls',
            // In the case no encryption is explicitly requested (either for
            // testing or because a user regrettably chose to disable it via
            // manual config), we want to avoid opportunistic encryption
            // since in the latter case the user may have done this because
            // the server's certificates are invalid.
            ignoreTLS: connInfo.crypto === 'plain'
          });

        var connectTimeout = setTimeout(function() {
          conn.onerror('unresponsive-server');
          conn.close();
        }, syncbase.CONNECT_TIMEOUT_MS);

        conn.onauth = function() {
          clearTimeout(connectTimeout);
          logic(scope, 'connected', { connInfo: connInfo });
          conn.onauth = conn.onerror = noop;
          resolve(conn);
        };
        conn.onerror = function(err) {
          clearTimeout(connectTimeout);
          // XXX: if error is just expired access token, try to refresh one time
          reject(err);
        };

        conn.connect();
      });
    }).catch(function(errorObject) {
      var errorString = normalizeImapError(conn, errorObject);
      if (conn) {
        conn.close();
      }

      // Could hit an oauth reauth case due to date skews, so give a token
      // review a shot before really bailing.
      if (errorString === 'needs-oauth-reauth' &&
          oauth.isRenewPossible(credentials)) {
        return oauth.ensureUpdatedCredentials(credentials,
                                              credsUpdatedCallback, true)
        .then(function() {
          return exports.createImapConnection(credentials, connInfo,
                                              credsUpdatedCallback);
        });
      } else {
        logic(scope, 'connect-error', {
          error: errorString
        });
        throw errorString;
      }
    });
  };

  //****************************************************************
  // UNFORTUNATE IMAP WORKAROUNDS & SHIMS BEGIN HERE
  //----------------------------------------------------------------

  // ImapClient (from BrowserBox) doesn't pass along any useful error
  // information other than a human-readable string, and even then,
  // not always reliably. When we receive an IMAP protocol error
  // response form the server, all of the data we care about is in the
  // most recent 'NO' or 'BAD' response line. Until we can add
  // improved error handling upstream, cache the most recent error
  // response from the IMAP server so that we can extract detailed
  // error codes when we handle error events from the IMAP library.
  var processResponse = ImapClient.prototype._processResponse;
  ImapClient.prototype._processResponse = function(response) {
    processResponse.apply(this, arguments);

    var cmd = (response && response.command || '').toString()
          .toUpperCase().trim();

    if (['NO', 'BAD'].indexOf(cmd) !== -1) {
      logic(scope, 'protocol-error', {
        humanReadable: response.humanReadable,
        responseCode: response.code,
        // Include the command structure
        commandData: this._currentCommand && this._currentCommand.request &&
                     imapHandler.compiler(this._currentCommand.request)
      });
      this._lastImapError = {
        // To most accurately report STARTTLS issues, latch the active command
        // at the time of the failure rather than just the response.  (An evil
        // attacker could say "NO SUCKER" instead of "NO STARTTLS" or
        // something.)
        command: this._currentCommand,
        response: response
      };
    }
  }

  // ImapClient passes data directly into the `new Error()`
  // constructor, which causes err.message to equal "[Object object]"
  // rather than the actual error object with details. This is just a
  // copy of that function, with the `new Error` constructor stripped
  // out so that the error details pass through to onerror.
   ImapClient.prototype._onError = function(evt) {
    if (this.isError(evt)) {
      this.onerror(evt);
    } else if (evt && this.isError(evt.data)) {
      this.onerror(evt.data);
    } else {
      this.onerror(evt && evt.data && evt.data.message ||
                   evt.data || evt || 'Error');
    }

    this.close();
  };

  /**
   * Given an error possibly generated by the IMAP client, analyze it
   * and convert it to a normalized string if possible. Otherwise,
   * return null.
   */
  function analyzeLastImapError(lastErrInfo, conn) {
    // Make sure it's an error we know how to analyze:
    if (!lastErrInfo || !lastErrInfo.response) {
      return null;
    }

    // If the most recent command was to initiate STARTTLS, then this is a
    // security error.
    if (lastErrInfo.command && lastErrInfo.command.request &&
        lastErrInfo.command.request.command === 'STARTTLS') {
      return 'bad-security';
    }

    var wasOauth = conn && !!conn.options.auth.xoauth2;

    // Structure of an IMAP error response:
    // { "tag":"W2",
    //   "command": "NO",
    //   "code": "AUTHENTICATIONFAILED",
    //   "attributes": [
    //     {"type":"TEXT","value":"invalid password"}
    //   ],
    //   "humanReadable": "invalid password" }

    // Dovecot says after a delay and does not terminate the connection:
    //     NO [AUTHENTICATIONFAILED] Authentication failed.
    // Zimbra 7.2.x says after a delay and DOES terminate the connection:
    //     NO LOGIN failed
    //     * BYE Zimbra IMAP server terminating connection
    // Yahoo says after a delay and does not terminate the connection:
    //     NO [AUTHENTICATIONFAILED] Incorrect username or password.

    var err = lastErrInfo.response;
    var str = (err.code || '') + (err.humanReadable || '');

    if (/Your account is not enabled for IMAP use/.test(str) ||
               /IMAP access is disabled for your domain/.test(str)) {
      return 'imap-disabled';
    } else if (/UNAVAILABLE/.test(str)) {
      return 'server-maintenance';
    // If login failed and LOGINDISABLED was claimed, then it's
    // server-maintenance.  We used to be more aggressive about
    // LOGINDISABLED and would just give up if we saw it, but we had a
    // bad regression, so the balance has tipped here.  Additionally, it
    // makes a lot of sense to only report the error if we actually failed
    // to login!
    } else if (conn.capability.indexOf('LOGINDISABLED') != -1 &&
               !conn.authenticated) {
      return 'server-maintenance';
    // The invalid-credentials case goes last, because we
    // optimistically assume that any other not-authenticated failure
    // is caused by the user's invalid credentials.
    } else if (/AUTHENTICATIONFAILED/.test(str) ||
               /Invalid credentials/i.test(str) || // Gmail bad access token
               /login failed/i.test(str) ||
               /password/.test(str) ||
               // We can't trust state since it gets updated on close, but
               // authenticated latches to true and stays that way.
               !conn.authenticated) {
      // If we got a protocol-level error but we weren't authenticated
      // yet, it's likely an authentication problem, as authenticating
      // is the first thing we do. Any other socket-level connection
      // problems (including STARTTLS, since we pass that along as an
      // exception) will be surfaced before hitting this conditional.

      if (wasOauth) {
        // Gmail returns "NO [ALERT] Invalid credentials (Failure)" in
        // the case of a failed OAUTH password.
        return 'needs-oauth-reauth';
      } else {
        return 'bad-user-or-pass';
      }
    } else {
      return null;
    }
  }

  /**
   * Here's where the cascades come in: This function accepts an error
   * of potentially unknown origin. Maybe it's an exception; maybe
   * it's an IMAP library error with details; maybe it has no useful
   * details, in which case we can see if the IMAP connection reported
   * any error responses. No matter what, we take an IMAP-related
   * error, analyze it, and convert it to our normalized string error
   * representation.
   *
   * @param {BrowserBox} conn
   *   The IMAP connection; necessary if you expect us to analyze
   *   protocol errors
   * @param {object} err
   *   The exception or error that started all the trouble.
   */
  var normalizeImapError = exports.normalizeImapError = function(conn, err) {
    var socketLevelError = errorutils.analyzeException(err);
    var protocolLevelError =
          conn && analyzeLastImapError(conn.client._lastImapError, conn);

    var reportAs = (socketLevelError ||
                    protocolLevelError ||
                    'unknown');

    logic(scope, 'normalized-error', {
      error: err,
      errorName: err && err.name,
      errorMessage: err && err.message,
      errorStack: err && err.stack,
      socketLevelError: socketLevelError,
      protocolLevelError: protocolLevelError,
      reportAs: reportAs
    });

    return reportAs;
  };

});
