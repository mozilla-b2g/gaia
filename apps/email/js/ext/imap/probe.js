/**
 * Validates connection information for an account and verifies that
 * the server on the other end is something we are capable of
 * sustaining an account with.
 */

define([
  'browserbox',
  'slog',
  './client',
  '../syncbase',
  'exports'
], function(BrowserBox, slog, imapclient, syncbase, exports) {

  /**
   * Log in to test credentials, passing the established connection
   * onward if successful for later reuse.
   *
   * @param {object} credentials
   *   keys: hostname, port, crypto
   * @param {object} connInfo
   *   keys: username, password
   * @return {Promise}
   *   resolve => { conn, timezoneOffset }
   *   reject => String (normalized)
   */
  exports.probeAccount = function(credentials, connInfo) {
    slog.info('probe:imap:connecting', {
      connInfo: connInfo
    });

    var conn;
    return imapclient.createImapConnection(credentials, connInfo)
      .then(function(newConn) {
        conn = newConn;
        return getInboxMetadata(conn);
      })
      .then(function(inboxInfo) {
        // If there are no messages in the inbox, assume the default offset.
        if (inboxInfo.exists === 0) {
          return syncbase.DEFAULT_TZ_OFFSET;
        } else {
          return determineTimezoneFromInboxMessage(conn, inboxInfo.uidNext - 1);
        }
      })
      .then(function(timezoneOffset) {
        slog.info('probe:imap:success', {
          timezoneOffset: timezoneOffset / (60 * 60 * 1000)
        });
        return {
          conn: conn,
          timezoneOffset: timezoneOffset
        };
      })
      .catch(function(err) {
        // Normalize the error before passing it on.
        err = imapclient.normalizeImapError(conn, err);
        slog.error('probe:imap:error', { error: err });
        if (conn) {
          conn.close();
        }
        throw err;
      });
  }

  /**
   * Select the inbox, resolving to a promise that contains the
   * inbox's metadata; crucially, the `uidNext` and `exists`
   * parameters.
   *
   * @param {BrowserBox} conn
   * @return {Promise => inboxInfo}
   */
  function getInboxMetadata(conn) {
    return new Promise(function(resolve, reject) {
      conn.selectMailbox('INBOX', { readOnly: true }, function(err, info) {
        if (err) {
          reject(err);
        } else {
          resolve(info);
        }
      });
    });
  }

  /**
   * Try and infer the current effective timezone of the server by
   * grabbing the most recent message as implied by UID (may be
   * inaccurate), and then looking at the most recent Received
   * header's timezone. In order to figure out the UID to ask for, we
   * do a dumb search to figure out which UIDs are valid.
   *
   * @return {Promise => int} timezoneOffset
   */
  function determineTimezoneFromInboxMessage(conn, startUid) {
    return new Promise(function(resolve) {
      var uidsToCheck = null;

      function findValidUidsToCheck(highUid) {
        conn.search(
          { uid: Math.max(1, highUid - 49) + ':' + highUid },
          { byUid: true },
          function(err, uids) {
            if (uids.length) {
              uidsToCheck = uids;
              findTimezoneFromMessageWithUid(uidsToCheck.pop());
            } else {
              var nextHighUid = highUid - 50;
              if (nextHighUid < 0) {
                resolve(syncbase.DEFAULT_TZ_OFFSET);
              } else {
                findValidUidsToCheck(nextHighUid);
              }
            }
          });
      }
      function findTimezoneFromMessageWithUid(uid) {
        slog.log('probe:imap:checking-uid', { uid: uid });
        conn.listMessages(
          uid,
          ['uid', 'body.peek[header.fields (Received)]'],
          { byUid: true },
          function (err, messages) {
            var tz = null;
            var receivedHeader = messages[0]['body[header.fields (received)]'];
            if (!err && messages[0]) {
              tz = extractTZFromString(receivedHeader);
            }

            slog.log('probe:imap:uid-timezone', {
              uid: uid,
              tz: tz,
              _receivedHeader: receivedHeader
            });

            if (tz !== null /* distinct from zero */) {
              resolve(tz);
            } else {
              // The message didn't have a Received header. Try again with
              // another UID if possible.
              if (uidsToCheck.length) {
                findTimezoneFromMessageWithUid(uidsToCheck.pop());
              } else { // fail to the default.
                resolve(syncbase.DEFAULT_TZ_OFFSET);
              }
            }
          });
      }
      findValidUidsToCheck(startUid);
    });
  }

  /**
   * Extract a timezone from a string as seen in an email's Received
   * header. Exported for tests.
   */
  var extractTZFromString = exports.extractTZFromString = function(s) {
    var tzMatch = / ([+-]\d{4})/.exec(s);
    if (tzMatch) {
      var tz =
            parseInt(tzMatch[1].substring(1, 3), 10) * 60 * 60 * 1000 +
            parseInt(tzMatch[1].substring(3, 5), 10) * 60 * 1000;
      if (tzMatch[1].substring(0, 1) === '-')
        tz *= -1;
      return tz;
    }

    return null;
  };


}); // end define
