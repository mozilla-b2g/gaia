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
   *   resolve => { conn: conn }
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
        slog.info('probe:imap:success');
        return { conn: conn };
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

}); // end define
