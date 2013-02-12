/**
 * Validates connection information for an account and verifies the server on
 * the other end is something we are capable of sustaining an account with.
 * Before growing this logic further, first try reusing/adapting/porting the
 * Thunderbird autoconfiguration logic.
 **/

define('mailapi/imap/probe',
  [
    'imap',
    'exports'
  ],
  function(
    $imap,
    exports
  ) {

/**
 * How many milliseconds should we wait before giving up on the connection?
 *
 * This really wants to be adaptive based on the type of the connection, but
 * right now we have no accurate way of guessing how good the connection is in
 * terms of latency, overall internet speed, etc.  Experience has shown that 10
 * seconds is currently insufficient on an unagi device on 2G on an AT&T network
 * in American suburbs, although some of that may be problems internal to the
 * device.  I am tripling that to 30 seconds for now because although it's
 * horrible to drag out a failed connection to an unresponsive server, it's far
 * worse to fail to connect to a real server on a bad network, etc.
 */
exports.CONNECT_TIMEOUT_MS = 30000;

/**
 * Right now our tests consist of:
 * - logging in to test the credentials
 *
 * If we succeed at that, we hand off the established connection to our caller
 * so they can reuse it.
 */
function ImapProber(credentials, connInfo, _LOG) {
  var opts = {
    host: connInfo.hostname,
    port: connInfo.port,
    crypto: connInfo.crypto,

    username: credentials.username,
    password: credentials.password,

    connTimeout: exports.CONNECT_TIMEOUT_MS,
  };
  if (_LOG)
    opts._logParent = _LOG;

  console.log("PROBE:IMAP attempting to connect to", connInfo.hostname);
  this._conn = new $imap.ImapConnection(opts);
  this._conn.connect(this.onLoggedIn.bind(this));
  this._conn.on('error', this.onError.bind(this));

  this.onresult = null;
  this.error = null;
  this.errorDetails = { server: connInfo.hostname };
}
exports.ImapProber = ImapProber;
ImapProber.prototype = {
  onLoggedIn: function ImapProber_onLoggedIn(err) {
    if (err) {
      this.onError(err);
      return;
    }

    getTZOffset(this._conn, this.onGotTZOffset.bind(this));
  },

  onGotTZOffset: function ImapProber_onGotTZOffset(err, tzOffset) {
    if (err) {
      this.onError(err);
      return;
    }

    console.log('PROBE:IMAP happy, TZ offset:', tzOffset / (60 * 60 * 1000));
    this.error = null;

    var conn = this._conn;
    this._conn = null;

    if (!this.onresult)
      return;
    this.onresult(this.error, conn, tzOffset);
    this.onresult = false;
  },

  onError: function ImapProber_onError(err) {
    if (!this.onresult)
      return;
    console.warn('PROBE:IMAP sad', err);

    var normErr = normalizeError(err);
    this.error = normErr.name;

    // we really want to make sure we clean up after this dude.
    try {
      this._conn.die();
    }
    catch (ex) {
    }
    this._conn = null;

    this.onresult(this.error, null, this.errorDetails);
    // we could potentially see many errors...
    this.onresult = false;
  },
};

/**
 * Convert error objects from the IMAP connection to our internal error codes
 * as defined in `MailApi.js` for tryToCreateAccount.  This is used by the
 * probe during account creation and by `ImapAccount` during general connection
 * establishment.
 *
 * @return[@dict[
 *   @key[name String]
 *   @key[reachable Boolean]{
 *     Does this error indicate the server was reachable?  This is to be
 *     reported to the `BackoffEndpoint`.
 *   }
 *   @key[retry Boolean]{
 *     Should we retry the connection?  The answer is no for persistent problems
 *     or transient problems that are expected to be longer lived than the scale
 *     of our automatic retries.
 *   }
 *   @key[reportProblem Boolean]{
 *     Should we report this as a problem on the account?  We should do this
 *     if we expect this to be a persistent problem that requires user action
 *     to resolve and we expect `MailUniverse.__reportAccountProblem` to
 *     generate a specific user notification for the error.  If we're not going
 *     to bother the user with a popup, then we probably want to return false
 *     for this and leave it for the connection failure to cause the
 *     `BackoffEndpoint` to cause a problem to be logged via the listener
 *     mechanism.
 *   }
 * ]]
 */
var normalizeError = exports.normalizeError = function normalizeError(err) {
  var errName, reachable = false, retry = true, reportProblem = false;
  // We want to produce error-codes as defined in `MailApi.js` for
  // tryToCreateAccount.  We have also tried to make imap.js produce
  // error codes of the right type already, but for various generic paths
  // (like saying 'NO'), there isn't currently a good spot for that.
  switch (err.type) {
    // dovecot says after a delay and does not terminate the connection:
    //   NO [AUTHENTICATIONFAILED] Authentication failed.
    // zimbra 7.2.x says after a delay and DOES terminate the connection:
    //   NO LOGIN failed
    //   * BYE Zimbra IMAP server terminating connection
    // yahoo says after a delay and does not terminate the connection:
    //   NO [AUTHENTICATIONFAILED] Incorrect username or password.
  case 'NO':
  case 'no':
    reachable = true;
    if (!err.serverResponse) {
      errName = 'unknown';
      reportProblem = false;
    }
    else {
      // All of these require user action to resolve.
      reportProblem = true;
      retry = false;
      if (err.serverResponse.indexOf(
        '[ALERT] Application-specific password required') !== -1)
        errName = 'needs-app-pass';
      else if (err.serverResponse.indexOf(
            '[ALERT] Your account is not enabled for IMAP use.') !== -1 ||
          err.serverResponse.indexOf(
            '[ALERT] IMAP access is disabled for your domain.') !== -1)
        errName = 'imap-disabled';
      else
        errName = 'bad-user-or-pass';
    }
    break;
  case 'server-maintenance':
    errName = err.type;
    reachable = true;
    // do retry
    break;
  // An SSL error is either something we just want to report (probe), or
  // something that is currently probably best treated as a network failure.  We
  // could tell the user they may be experiencing a MITM attack, but that's not
  // really something they can do anything about and we have protected them from
  // it currently.
  case 'bad-security':
    errName = err.type;
    reachable = true;
    retry = false;
    break;
  case 'unresponsive-server':
  case 'timeout':
    errName = 'unresponsive-server';
    break;
  default:
    errName = 'unknown';
    break;
  }

  return {
    name: errName,
    reachable: reachable,
    retry: retry,
    reportProblem: reportProblem,
  };
};


/**
 * If a folder has no messages, then we need to default the timezone, and
 * California is the most popular!
 *
 * XXX DST issue, maybe vary this.
 */
const DEFAULT_TZ_OFFSET = -7 * 60 * 60 * 1000;

var extractTZFromHeaders = exports._extractTZFromHeaders =
    function extractTZFromHeaders(allHeaders) {
  for (var i = 0; i < allHeaders.length; i++) {
    var hpair = allHeaders[i];
    if (hpair.key !== 'received')
      continue;
    var tzMatch = /([+-]\d{4})/.exec(hpair.value);
    if (tzMatch) {
      var tz =
        parseInt(tzMatch[1].substring(1, 3), 10) * 60 * 60 * 1000 +
        parseInt(tzMatch[1].substring(3, 5), 10) * 60 * 1000;
      if (tzMatch[1].substring(0, 1) === '-')
        tz *= -1;
      return tz;
    }
  }

  return null;
};

/**
 * Try and infer the current effective timezone of the server by grabbing the
 * most recent message as implied by UID (may be inaccurate), and then looking
 * at the most recent Received header's timezone.
 *
 * In order to figure out the UID to ask for, we do a dumb search to figure out
 * what UIDs are valid.
 */
var getTZOffset = exports.getTZOffset = function getTZOffset(conn, callback) {
  function gotInbox(err, box) {
    if (err) {
      callback(err);
      return;
    }
    if (!box.messages.total) {
      callback(null, DEFAULT_TZ_OFFSET);
      return;
    }
    searchRange(box._uidnext - 1);
  }
  function searchRange(highUid) {
    conn.search([['UID', Math.max(1, highUid - 49) + ':' + highUid]],
                gotSearch.bind(null, highUid - 50));
  }
  var viableUids = null;
  function gotSearch(nextHighUid, err, uids) {
    if (!uids.length) {
      if (nextHighUid < 0) {
        callback(null, DEFAULT_TZ_OFFSET);
        return;
      }
      searchRange(nextHighUid);
    }
    viableUids = uids;
    useUid(viableUids.pop());
  }
  function useUid(uid) {
    var fetcher = conn.fetch(
      [uid],
      {
        request: {
          headers: ['RECEIVED'],
          struct: false,
          body: false
        },
      });
    fetcher.on('message', function onMsg(msg) {
        msg.on('end', function onMsgEnd() {
            var tz = extractTZFromHeaders(msg.msg.headers);
            if (tz !== null) {
              callback(null, tz);
              return;
            }
            // If we are here, the message somehow did not have a Received
            // header.  Try again with another known UID or fail out if we
            // have run out of UIDs.
            if (viableUids.length)
              useUid(viableUids.pop());
            else // fail to the default.
              callback(null, DEFAULT_TZ_OFFSET);
          });
      });
    fetcher.on('error', function onFetchErr(err) {
      callback(err);
      return;
    });
  }
  var uidsTried = 0;
  conn.openBox('INBOX', true, gotInbox);
};

}); // end define
