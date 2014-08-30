define(['slog', './client', 'exports'], function(slog, client, exports) {

  /**
   * Validate that we find an SMTP server using the connection info
   * and that it seems to like our credentials.
   *
   * The process here is in two steps: First, connect to the server
   * and make sure that we can authenticate properly. Then, if that
   * succeeds, we send a "MAIL FROM:<our address>" line to see if
   * the server will reject the e-mail address, followed by "RCPT
   * TO" for the same purpose. This could fail if the user uses
   * manual setup and gets everything right except for their e-mail
   * address. We want to catch this error before they complete
   * account setup; if we don't, they'll be left with an account
   * that can't send e-mail, and we currently don't allow them to
   * change their address after setup.
   */
  exports.probeAccount = function(credentials, connInfo) {
    slog.info('probe:smtp:connecting', {
      _credentials: credentials,
      connInfo: connInfo
    });

    var conn;
    return client.createSmtpConnection(credentials, connInfo)
      .then(function(newConn) {
        conn = newConn;
        return verifyAddress(conn, connInfo.emailAddress);
      }).then(function() {
        slog.info('probe:smtp:success');
        conn.close();
        return conn;
      }).catch(function(err) {
        var errorString = client.analyzeSmtpError(
          conn, err, /* wasSending: */ false);

        if (conn) {
          conn.close();
        }

        slog.error('probe:smtp:error', {
          error: errorString,
          connInfo: connInfo
        });

        throw errorString;
      });
  };

  /**
   * Send the envelope; the server might proactively warn us that we
   * used an invalid email address.
   *
   * @return {Promise}
   *   resolve => (null)
   *   reject => {Object} some sort of error
   */
  function verifyAddress(conn, emailAddress) {
    slog.log('probe:smtp:checking-address-validity');
    return new Promise(function(resolve, reject) {
      conn.useEnvelope({
        from: emailAddress,
        to: [emailAddress]
      });
      conn.onready = function() { resolve(); };
      conn.onerror = function(err) { reject(err); };
    });
  }

}); // end define
