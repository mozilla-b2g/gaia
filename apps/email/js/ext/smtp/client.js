/**
 * smtp/client.js: Wraps SMTP connection creation, to avoid redundancy
 * between connection-related setup in smtp/account.js and
 * smtp/probe.js.
 */
define(function(require, exports) {

  var logic = require('logic');
  var SmtpClient = require('smtpclient');
  var syncbase = require('../syncbase');
  var oauth = require('../oauth');

  var setTimeout = window.setTimeout;
  var clearTimeout = window.clearTimeout;
  exports.setTimeoutFunctions = function(setFn, clearFn) {
    setTimeout = setFn;
    clearTimeout = clearFn;
  };

  var scope = logic.scope('SmtpClient');

  /**
   * Create an SMTP connection using the given credentials and
   * connection info, returning a Promise.
   *
   * @param {object} credentials
   *   keys: hostname, port, crypto
   * @param {object} connInfo
   *   keys: username, password
   * @param {function(credentials)} credsUpdatedCallback
   *   Callback, called if the credentials have been updated and
   *   should be stored to disk. Not called if the credentials are
   *   already up-to-date.
   * @return {Promise}
   *   resolve => {SmtpClient} connection
   *   reject => {String} normalized error
   */
  exports.createSmtpConnection = function(credentials, connInfo,
                                          credsUpdatedCallback) {
    var conn;

    return oauth.ensureUpdatedCredentials(credentials, credsUpdatedCallback)
    .then(function() {
      return new Promise(function(resolve, reject) {

        var auth = {
          // Someday, `null` might be a valid value, so be careful here
          user: (credentials.outgoingUsername !== undefined ?
                 credentials.outgoingUsername :
                 credentials.username),
          pass: (credentials.outgoingPassword !== undefined ?
                 credentials.outgoingPassword :
                 credentials.password),
          xoauth2: credentials.oauth2 ?
                     credentials.oauth2.accessToken : null
        };
        logic(scope, 'connect', {
          _auth: auth,
          usingOauth2: !!credentials.oauth2,
          connInfo: connInfo
        });
        conn = new SmtpClient(
          connInfo.hostname, connInfo.port,
          {
            auth: auth,
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

        function clearConnectTimeout() {
          if (connectTimeout) {
            clearTimeout(connectTimeout);
            connectTimeout = null;
          }
        }

        conn.onidle = function() {
          clearConnectTimeout();
          logic(scope, 'connected', connInfo);
          conn.onidle = conn.onclose = conn.onerror = function() { /* noop */ };
          resolve(conn);
        };
        conn.onerror = function(err) {
          clearConnectTimeout();
          reject(err);
        };
        // if the connection closes without any of the other callbacks,
        // the server isn't responding properly.
        conn.onclose = function() {
          clearConnectTimeout();
          reject('server-maybe-offline');
        };

        conn.connect();
      });
    }).catch(function(err) {
      var errorString = analyzeSmtpError(conn, err, /* wasSending: */ false);
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
          error: errorString,
          connInfo: connInfo
        });
        throw errorString;
      }
    });
  };

  //****************************************************************
  // UNFORTUNATE SMTP WORKAROUNDS & SHIMS BEGIN HERE
  //----------------------------------------------------------------

  // SmtpClient doesn't provide any useful information in its onerror
  // handlers. Instead, intercept error responses and cache them so
  // that we can retrieve the most recent server error when needed.
  var onCommand = SmtpClient.prototype._onCommand;
  SmtpClient.prototype._onCommand = function(command) {
    if (command.statusCode && !command.success) {
      this._lastSmtpError = command;
    }
    onCommand.apply(this, arguments);
  };

  // SmtpClient passes data directly into the `new Error()`
  // constructor, which causes err.message to equal "[Object object]"
  // rather than the actual error object with details. This is just a
  // copy of that function, with the `new Error` constructor stripped
  // out so that the error details pass through to onerror.
  SmtpClient.prototype._onError = function(evt) {
    if (evt instanceof Error && evt.message) {
      this.onerror(evt);
    } else if (evt && evt.data instanceof Error) {
      this.onerror(evt.data);
    } else {
      this.onerror(evt && evt.data && evt.data.message ||
                   evt.data || evt || 'Error');
    }

    this.close();
  };

  /**
   * Analyze a connection error for its cause and true nature,
   * returning a plain-old string. The error could come from the SMTP
   * dialog, or perhaps a socket error.
   *
   * @param {SmtpClient} conn
   * @param {Object} [rawError]
   *   If provided, use this error object if we couldn't find
   *   anything useful from the SMTP session's last error.
   *   For instance, socket errors will only get caught directly
   *   by the onerror handler.
   * @param {boolean} wasSending
   *   True if we were in the process of sending a message. If so,
   *   we need to interpret server error codes differently, as the
   *   SmtpClient doesn't maintain any easy-to-grab state about
   *   what mode the connection was in.
   */
  var analyzeSmtpError = exports.analyzeSmtpError =
        function(conn, rawError, wasSending) {
    var err = rawError;
    // If the error object is just an exception with no useful data,
    // try looking at recent SMTP errors.
    if ((err && !err.statusCode && err.name === 'Error') || !err) {
      err = conn && conn._lastSmtpError || null;
    }

    if (!err) {
      err = 'null-error';
    }

    var wasOauth = conn && !!conn.options.auth.xoauth2;
    var normalizedError = 'unknown';

    // If we were able to extract a negative SMTP response, we can
    // analyze the statusCode:
    if (err.statusCode) {
      // If we were processing startTLS then any failure where the server told
      // us something means it's a security problem.  Connection loss is
      // ambiguous, which is why we only do this when there's a statusCode.
      //
      // Likewise, if we were in EHLO and we generate an error, it's because
      // EHLO failed which implies no HELO.  (Note!  As of writing this comment,
      // I've just submitted the fix to smtpclient to generate the error and
      // have updated our local copy of smtpclient appropriately.  In that fix
      // I have the error messages mention STARTTLS; we could key off that, but
      // I'm expecting that might end up working differently at some point, so
      // this is potentially slightly less brittle.
      if (conn._currentAction === conn._actionSTARTTLS ||
          conn._currentAction === conn._actionEHLO) {
        normalizedError = 'bad-security';
      } else {
        // Example SMTP error:
        //   { "statusCode": 535,
        //     "enhancedStatus": "5.7.8",
        //     "data": "Wrong username or password, crook!",
        //     "line": "535 5.7.8 Wrong username or password, crook!",
        //     "success": false }
        switch (err.statusCode) {
        case 535:
          if (wasOauth) {
            normalizedError = 'needs-oauth-reauth';
          } else {
            normalizedError = 'bad-user-or-pass';
          }
          break;
        // This technically means that the auth mechanism is weaker than
        // required.  We've only seen this for the gmail case where two
        // factor is needed, we're not doing oauth, and the user is using
        // their normal password instead of an application-specific password
        // (and we've now removed support for providing a special error for
        // that).  We're calling this bad-user-or-pass because it's less
        // misleading than 'unknown' is.
        case 534:
          normalizedError = 'bad-user-or-pass';
          break;
        case 501: // Invalid Syntax
          if (wasSending) {
            normalizedError = 'bad-message';
          } else {
            normalizedError = 'server-maybe-offline';
          }
          break;
        case 550: // Mailbox Unavailable
        case 551: // User not local, will not send
        case 553: // Mailbox name not allowed
        case 554: // Transaction failed (in response to bad addresses)
          normalizedError = 'bad-address';
          break;
        case 500:
          normalizedError = 'server-problem';
          break;
        default:
          if (wasSending) {
            normalizedError = 'bad-message';
          } else {
            normalizedError = 'unknown';
          }
          break;
        }
      }
    }
    // Socket errors only have a name:
    else if (err.name === 'ConnectionRefusedError') {
      normalizedError = 'unresponsive-server';
    }
    else if (/^Security/.test(err.name)) {
      normalizedError = 'bad-security';
    }
    // If we provided a string only, it's probably already normalized
    else if (typeof err === 'string') {
      normalizedError = err;
    }

    logic(scope, 'analyzed-error', {
      statusCode: err.statusCode,
      enhancedStatus: err.enhancedStatus,
      rawError: rawError,
      rawErrorName: rawError && rawError.name,
      rawErrorMessage: rawError && rawError.message,
      rawErrorStack: rawError && rawError.stack,
      normalizedError: normalizedError,
      errorName: err.name,
      errorMessage: err.message,
      errorData: err.data,
      wasSending: wasSending
    });

    return normalizedError;
  };
});
