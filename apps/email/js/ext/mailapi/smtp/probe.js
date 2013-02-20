/**
 * SMTP probe logic.
 **/

define('mailapi/smtp/probe',
  [
    'simplesmtp/lib/client',
    'exports'
  ],
  function(
    $simplesmtp,
    exports
  ) {

var setTimeoutFunc = window.setTimeout.bind(window),
    clearTimeoutFunc = window.clearTimeout.bind(window);

exports.TEST_useTimeoutFuncs = function(setFunc, clearFunc) {
  setTimeoutFunc = setFunc;
  clearTimeoutFunc = clearFunc;
};

exports.TEST_USE_DEBUG_MODE = false;

/**
 * How many milliseconds should we wait before giving up on the connection?
 *
 * I have a whole essay on the rationale for this in the IMAP prober.  Us, we
 * just want to use the same value as the IMAP prober.  This is a candidate for
 * centralization.
 */
exports.CONNECT_TIMEOUT_MS = 30000;

/**
 * Validate that we find an SMTP server using the connection info and that it
 * seems to like our credentials.
 *
 * Because the SMTP client has no connection timeout support, use our own timer
 * to decide when to give up on the SMTP connection.  We use the timer for the
 * whole process, including even after the connection is established.
 */
function SmtpProber(credentials, connInfo) {
  console.log("PROBE:SMTP attempting to connect to", connInfo.hostname);
  this._conn = $simplesmtp(
    connInfo.port, connInfo.hostname,
    {
      secureConnection: connInfo.crypto === true,
      ignoreTLS: connInfo.crypto === false,
      auth: { user: credentials.username, pass: credentials.password },
      debug: exports.TEST_USE_DEBUG_MODE,
    });
  // onIdle happens after successful login, and so is what our probing uses.
  this._conn.on('idle', this.onResult.bind(this, null));
  this._conn.on('error', this.onResult.bind(this));
  this._conn.on('end', this.onResult.bind(this, 'unknown'));

  this.timeoutId = setTimeoutFunc(
                     this.onResult.bind(this, 'unresponsive-server'),
                     exports.CONNECT_TIMEOUT_MS);

  this.onresult = null;
  this.error = null;
  this.errorDetails = { server: connInfo.hostname };
}
exports.SmtpProber = SmtpProber;
SmtpProber.prototype = {
  onResult: function(err) {
    if (!this.onresult)
      return;
    if (err && typeof(err) === 'object') {
      // detect an nsISSLStatus instance by an unusual property.
      if ('isNotValidAtThisTime' in err) {
        err = 'bad-security';
      }
      else {
        switch (err.name) {
          case 'AuthError':
            err = 'bad-user-or-pass';
            break;
          case 'UnknownAuthError':
          default:
            err = 'server-problem';
            break;
        }
      }
    }

    this.error = err;
    if (err)
      console.warn('PROBE:SMTP sad. error: |' + err + '|');
    else
      console.log('PROBE:SMTP happy');

    clearTimeoutFunc(this.timeoutId);

    this.onresult(this.error, this.errorDetails);
    this.onresult = null;

    this._conn.close();
  },
};

}); // end define
