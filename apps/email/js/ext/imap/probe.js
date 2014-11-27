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
   *   keys: username, password, xoauth2 (if OAUTH)
   * @return {Promise}
   *   resolve => { conn, timezoneOffset }
   *   reject => String (normalized)
   */
  exports.probeAccount = function(credentials, connInfo) {
    slog.info('probe:imap:connecting', {
      connInfo: connInfo
    });

    var conn;
    return imapclient.createImapConnection(
      credentials,
      connInfo,
      function onCredentialsUpdated() {
        // Normally we shouldn't see a request to update credentials
        // here, as the caller should have already passed a valid
        // accessToken during account setup. This might indicate a
        // problem with our OAUTH handling, so log it just in case.
        slog.warn('probe:imap:credentials-updated');
      }
    ).then(function(newConn) {
        conn = newConn;
        return getInboxMetadata(conn);
      })
      .then(function(inboxInfo) {
        // If there are no messages in the inbox, assume the default offset.
        if (inboxInfo.exists === 0) {
          return syncbase.DEFAULT_TZ_OFFSET;
        // Some servers do not provide UIDNEXT even though RFC 3501 says they
        // should.  Why, servers, why?!  Why must you cover the entire
        // permutation space!
        } else if (!inboxInfo.uidNext) {
          return determineTimezoneFromInboxMessage(
            conn, 'seq', inboxInfo.exists);

        } else {
          return determineTimezoneFromInboxMessage(
            conn, 'uid', inboxInfo.uidNext - 1);
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
   * If no high UID is provided, we use sequence numbers.  Now, one might
   * ask why we don't just use sequence numbers all the time?  It probably
   * had to do with deciding early on that we would only deal in UIDs since
   * they are sane and the belief this might help servers be performant.  In
   * practice it turns out servers can't usually escape the sequence number
   * problem (although an IMAP enhancement has been proposed.)
   *
   * The answer as to why we don't use that simplification now is primarily
   * a risk mitigation thing.  No changes for existing servers, only broken
   * servers get new logic.  Especially that we send an ID now, no chance
   * of a server forever assuming we need sequence numbers because we used
   * them once on our initial login.
   *
   * @return {Promise => int} timezoneOffset
   */
  function determineTimezoneFromInboxMessage(conn, method, startFrom) {
    return new Promise(function(resolve) {
      var uidsToCheck = null;
      // Don't leave the user hanging forever if this isn't working out.
      var checksRemaining = 32;

      // Scan the UID numeric space for valid UIDs.  Yes, this is not
      // super-efficient compared to the sequence number case.
      function findValidUidsToCheck(highUid) {
        conn.search(
          { uid: Math.max(1, highUid - 49) + ':' + highUid },
          { byUid: true },
          function(err, uids) {
            if (uids.length) {
              uidsToCheck = uids;
              findTimezoneFromMessageWithId('uid', uidsToCheck.pop());
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

      function findTimezoneFromMessageWithId(mechanism, id) {
        slog.log('probe:imap:checking-tz', { how: mechanism, id: id });
        conn.listMessages(
          id,
          // even though we don't care about the UID, we need imap-handler to
          // generate a LIST to contain the args or our imapd.js fake-server
          // parsing logic breaks and it's way too brittle to mess with now.  We
          // just want to switch to hoodiecrow in the future.
          ['uid', 'body.peek[header.fields (Received)]'],
          { byUid: mechanism === 'uid' },
          function (err, messages) {
            if (err) {
              slog.warn('probe:imap:timezone-fail', {});
              // in case of failure, use the default TZ offset.
              resolve(syncbase.DEFAULT_TZ_OFFSET);
              return;
            }

            var tzMillis = null;
            var receivedHeader = messages[0]['body[header.fields (received)]'];
            if (!err && messages[0]) {
              tzMillis = extractTZFromString(receivedHeader);
            }

            slog.log('probe:imap:timezone', {
              how: mechanism,
              tzMillis: tzMillis,
            });

            if (tzMillis !== null /* distinct from zero */) {
              resolve(tzMillis);
            } else if (--checksRemaining < 0) {
              // fail to the default
              resolve(syncbase.DEFAULT_TZ_OFFSET);
            } else if (mechanism === 'uid') {
              // The message didn't have a Received header. Try again with
              // another UID if possible.
              if (uidsToCheck.length) {
                findTimezoneFromMessageWithId(uidsToCheck.pop());
              } else { // fail to the default.
                resolve(syncbase.DEFAULT_TZ_OFFSET);
              }
            }
            else { // mechanism === 'seq'
              // For sequence numbers, just keep decrementing
              if (id > 1) {
                findTimezoneFromMessageWithId('seq', id - 1);
              } else { // fail to the default.
                resolve(syncbase.DEFAULT_TZ_OFFSET);
              }
            }
          });
      }
      if (method === 'uid') {
        findValidUidsToCheck(startFrom);
      } else {
        findTimezoneFromMessageWithId('seq', startFrom);
      }
    });
  }

  /**
   * Extract a timezone from a string as seen in an email's Received
   * header. Exported for tests.
   *
   * @param s
   *   An RFC 2822 "Received" trace header, which should contain a "date-time"
   *   grammar construct inside it.  The key bit is that "time" is defined as
   *   `time-of-day FWS zone` and zone is defined as
   *   `(( "+" / "-" ) 4DIGIT) / obs-zone`.  "obs-zone" is for textual
   *   UT/GMT/EST/EDT/etc. legacy stuff.
   *
   *   RFC 2822 A.4 contains an example of "21 Nov 1997 10:05:43 -0600"
   *
   * @return
   *   The timezone offset in milliseconds.
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
