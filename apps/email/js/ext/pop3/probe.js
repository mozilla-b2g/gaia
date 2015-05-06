define([
  './pop3',
  '../syncbase',
  'logic',
  '../errorutils',
  'exports'
], function(pop3, syncbase, logic, errorutils, exports) {

var scope = logic.scope('Pop3Prober');


/**
 * Validate connection information for an account and verify that the
 * server on the other end is something we are capable of sustaining
 * an account with.
 *
 * If we succeed at logging in, hand off the established connection to
 * our caller so they can reuse the connection.
 */
exports.probeAccount = function(credentials, connInfo) {
  var opts = {
    host: connInfo.hostname,
    port: connInfo.port,
    crypto: connInfo.crypto,
    username: credentials.username,
    password: credentials.password,
    connTimeout: syncbase.CONNECT_TIMEOUT_MS
  };

  logic(scope, 'connecting', { connInfo: connInfo });

  var resolve, reject;
  var promise = new Promise(function(_resolve, _reject) {
    resolve = _resolve;
    reject = _reject;
  });

  // We need the server to support UIDL and TOP. To test that it does,
  // first we assume that there's a message in the mailbox. If so, we
  // can just run `UIDL 1` and `TOP 1` to see if it works. If there
  // aren't any messages, we'll just run `UIDL` by itself to see if
  // that works. If so, great. If it errors out in any other path, the
  // server doesn't have the support we need and we must give up.
  var conn = new pop3.Pop3Client(opts, function(err) {
    if (err) { reject(err); return; }
    conn.protocol.sendRequest('UIDL', ['1'], false, function(err, rsp) {
      if (rsp) {
        conn.protocol.sendRequest('TOP', ['1', '0'], true, function(err, rsp) {
          if (rsp) {
            // both UIDL and TOP work. Awesome!
            resolve(conn);
          } else if (err.err) {
            // Uh, this server must not support TOP. That sucks.
            logic(scope, 'server-not-great', { why: 'no TOP' });
            reject('pop-server-not-great');
          } else {
            // if the error was socket-level or something, let it pass
            // through untouched
            reject(rsp.err);
          }
        });
      } else {
        // Either their inbox is empty or they don't support UIDL.
        conn.protocol.sendRequest('UIDL', [], true, function(err, rsp) {
          if (rsp) {
            // It looks like they support UIDL, so let's go for it.
            resolve(conn);
          } else if (err.err) {
            // They must not support UIDL. Not good enough.
            logic(scope, 'server-not-great', { why: 'no UIDL' });
            reject('pop-server-not-great');
          } else {
            // if the error was socket-level or something, let it pass
            // through untouched
            reject(rsp.err);
          }
        });
      }
    });
  });

  return promise
    .then(function(conn) {
      logic(scope, 'success');
      return {
        conn: conn,
        timezoneOffset: null
      };
    })
    .catch(function(err) {
      err = normalizePop3Error(err);
      logic(scope, 'error', { error: err });
      if (conn) {
        conn.close();
      }
      return Promise.reject(err);
    });
}

// These strings were taken verbatim from failed Gmail POP connection logs:
var GMAIL_POP_DISABLED_RE = /\[SYS\/PERM\] Your account is not enabled for POP/;
var GMAIL_DOMAIN_DISABLED_RE =
      /\[SYS\/PERM\] POP access is disabled for your domain\./;


function analyzePop3LibraryError(err) {
  if (!err || !err.name) {
    return null;
  }
  // All POP3 library callback errors are normalized to the following form:
  //
  //    var err = {
  //      scope: 'connection|authentication|mailbox|message',
  //      name: '...',
  //      message: '...',
  //      request: Pop3Client.Request (if applicable),
  //      exception: (A socket error, if available),
  //    };

  if (err.name === 'bad-user-or-pass' &&
      err.message && GMAIL_POP_DISABLED_RE.test(err.message)) {
    return 'pop3-disabled';
  }
  else if (err.name === 'bad-user-or-pass' &&
             err.message && GMAIL_DOMAIN_DISABLED_RE.test(err.message)) {
    return 'pop3-disabled';
  }
  // If there was a socket exception and the exception looks like
  // a security exception, note that it was a security-related
  // problem rather than just a bad server connection.
  else if (err.name === 'unresponsive-server' && err.exception &&
      err.exception.name && /security/i.test(err.exception.name)) {
    return 'bad-security';
  }
  // In two cases (bad auth, and unresponsive server), we might get
  // a more detailed status message from the server that saysa that
  // our account (or the entire server) is temporarily unavailble.
  // Per RFC 3206, these statuses indicate that the server is
  // unavailable right now but will be later.
  else if ((err.name === 'unresponsive-server' ||
            err.name === 'bad-user-or-pass') &&
           err.message && /\[(LOGIN-DELAY|SYS|IN-USE)/i.test(err.message)) {
    return 'server-maintenance';
  } else {
    return err.name;
  }
}

var normalizePop3Error = exports.normalizePop3Error = function(err) {
  var reportAs = (analyzePop3LibraryError(err) ||
                  errorutils.analyzeException(err) ||
                  'unknown');

  logic(scope, 'normalized-error', { error: err, reportAs: reportAs });
  return reportAs;
};

/**
 * Notes on transient failures:
 *
 * LOGIN-DELAY: RFC2449 defines the LOGIN-DELAY capability to tell the
 * client how often it should check and introduces it as a response
 * code if the client checks too frequently. See
 * http://tools.ietf.org/html/rfc2449#section-8.1.1
 *
 * SYS: RFC3206 provides disambiguation between system failures and
 * auth failures. SYS/TEMP is something that should go away on its
 * own. SYS/PERM is for errors that probably require a human involved.
 * We aren't planning on actually telling the user what the SYS/PERM
 * problem was so they can contact tech support, so we lump them in
 * the same bucket. See http://tools.ietf.org/html/rfc3206#section-4
 *
 * IN-USE: Someone else is already in the maildrop, probably another
 * POP3 client. If optimizing for multiple POP3-using devices was
 * something we wanted to optimize for we would indicate a desire to
 * retry here with a more extensive back-off strategy. See
 * http://tools.ietf.org/html/rfc2449#section-8.1.2
 */


}); // end define
