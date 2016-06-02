define(['logic', './client', 'exports'], function(logic, client, exports) {

  var scope = logic.scope('SmtpProber');

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

    logic(scope, 'connecting', {
      _credentials: credentials,
      connInfo: connInfo
    });

    var conn;
    return client.createSmtpConnection(
      credentials,
      connInfo,
      function onCredentialsUpdated() {
        // Normally we shouldn't see a request to update credentials
        // here, as the caller should have already passed a valid
        // accessToken during account setup. This might indicate a
        // problem with our OAUTH handling, so log it just in case.
        logic(scope, 'credentials-updated');
      }
    ).then(function(newConn) {
        conn = newConn;
        return verifyAddress(conn, connInfo.emailAddress);
      }).then(function() {
        logic(scope, 'success');
        conn.close();
        return conn;
      }).catch(function(err) {
        var errorString = client.analyzeSmtpError(
          conn, err, /* wasSending: */ false);

        if (conn) {
          conn.close();
        }

        logic(scope, 'error', {
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
    logic(scope, 'checking-address-validity', {
      ns: 'SmtpProber',
      _address: emailAddress
    });
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
