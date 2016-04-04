define(function(require, exports) {

  var errorutils = require('./errorutils');
  var syncbase = require('./syncbase');
  var logic = require('logic');
  var date = require('./date');

  /**
   * A window in which a renew request can be sent as a last ditch effort to
   * get a valid access_token. This value is consulted when a connection fails
   * due to an expired access_token, but the code did not realize it needed to
   * try for a renew due to problems with an incorrect system clock. Most access
   * tokens only last about an hour. So pick a renew window time that is shorter
   * than that but would only result in one or two tries for a last ditch
   * effort. If the token is really bad or the user really needs to just
   * reauthorize the app, then do not want to keep hammering away at the renew
   * API.
   */
  var RENEW_WINDOW_MS = 30 * 60 * 1000;

  // Extra timeout padding for oauth tokens.
  var TIMEOUT_MS = 30 * 1000;

  var scope = logic.scope('Oauth');

  /**
   * Decides if a renew may be feasible to do. Does not allow renew within a
   * time window. This kind of renew is only used as a last ditch effort to get
   * oauth to work, where the cached oauth2 data indicates the access token is
   * still good, but it is being fooled by things like an incorrect clock.
   *
   * This can be reset between restarts of the app, since performance.now can
   * be reset or changed. So it is possible it could try for more than
   * RENEW_WINDOW_MS if the app has been closed but restarted within that
   * window.
   */
  exports.isRenewPossible = function(credentials) {
    var oauth2 = credentials.oauth2,
        lastRenew = oauth2 && (oauth2._transientLastRenew || 0),
        now = date.PERFNOW();

    if (!oauth2) {
      return false;
    }

    if (!oauth2 || (lastRenew && (now - lastRenew) < RENEW_WINDOW_MS)) {
      return false;
    } else {
      return true;
    }
  };

  /**
   * Ensure that the credentials given are still valid, and refresh
   * them if not. For an OAUTH account, this may entail obtaining a
   * new access token from the server; for non-OAUTH accounts, this
   * function always succeeds.
   *
   * @param {object} credentials
   *   An object with (at a minimum) 'refreshToken' (and 'accessToken',
   *   if one had already been obtained).
   * @param {Function} [credsUpdatedCallback] a callback to be called if the
   * credentials have been updated via a renew.
   * @param {Boolean} [forceRenew] forces the renewAccessToken step.
   * @return {Promise}
   *   success: {boolean} True if the credentials were modified.
   *   failure: {String} A normalized error string.
   */
  exports.ensureUpdatedCredentials = function(credentials,
                                              credsUpdatedCallback,
                                              forceRenew) {
    if (forceRenew) {
      console.log('ensureUpdatedCredentials: force renewing token');
    }

    var oauth2 = credentials.oauth2;
    // If this is an OAUTH account, see if we need to refresh the
    // accessToken. If not, just continue on our way.
    if (oauth2 &&
        (!oauth2.accessToken ||
         oauth2.expireTimeMS < date.NOW()) ||
         forceRenew) {
      return renewAccessToken(oauth2)
        .then(function(newTokenData) {
          oauth2.accessToken = newTokenData.accessToken;
          oauth2.expireTimeMS = newTokenData.expireTimeMS;

          logic(scope, 'credentials-changed', {
            _accessToken: oauth2.accessToken,
            expireTimeMS: oauth2.expireTimeMS
          });

          if (credsUpdatedCallback) {
            credsUpdatedCallback(credentials);
          }
        });
    } else {
      logic(scope, 'credentials-ok');
      // Not OAUTH; everything is fine.
      return Promise.resolve(false);
    }
  };

  /**
   * Given an OAUTH refreshToken, ask the server for a new
   * accessToken. If this request fails with the 'needs-oauth-reauth'
   * error, you should invalidate the refreshToken and have the user
   * go through the OAUTH flow again.
   *
   * @param {String} refreshToken
   *   The long-lived refresh token we've stored in long-term storage.
   * @return {Promise}
   *   success: {String} { accessToken, expireTimeMS }
   *   failure: {String} normalized errorString
   */
  function renewAccessToken(oauthInfo) {
    logic(scope, 'renewing-access-token');
    return new Promise(function(resolve, reject) {
      oauthInfo._transientLastRenew = date.PERFNOW();
      var xhr = logic.interceptable('oauth:renew-xhr', function() {
        return new XMLHttpRequest({ mozSystem: true });
      });
      xhr.open('POST', oauthInfo.tokenEndpoint, true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      xhr.timeout = syncbase.CONNECT_TIMEOUT_MS;
      xhr.send([
        'client_id=', encodeURIComponent(oauthInfo.clientId),
        '&client_secret=', encodeURIComponent(oauthInfo.clientSecret),
        '&refresh_token=', encodeURIComponent(oauthInfo.refreshToken),
        '&grant_type=refresh_token'
      ].join(''));
      xhr.onload = function() {
        // If we couldn't retrieve the access token, either the user
        // revoked the access we granted (per Google's OAUTH docs) or
        // something has gone horribly wrong. The best we can assume
        // is that the problem will be resolved, or clarified by
        // instructing the user to reauthenticate.
        if (xhr.status < 200 || xhr.status >= 300) {
          // We do still get a JSON response if that goes bad, so let's include
          // it.
          try {
            var errResp = JSON.parse(xhr.responseText);
          }
          catch (ex) {
          }
         logic(scope, 'xhr-fail',
               { tokenEndpoint: oauthInfo.tokenEndpoint,
                 status: xhr.status, errResp: errResp });
          reject('needs-oauth-reauth');
        } else {
          try {
            var data = JSON.parse(xhr.responseText);
            if (data && data.access_token) {
              logic(scope, 'got-access-token', {
                _accessToken: data.access_token
              });
              // OAUTH returns an expire time as "seconds from now";
              // convert that to an absolute DateMS, then subtract a bit of time
              // to give a buffer from a the token expiring before a renewal is
              // attempted.
              var expiresInMS = data.expires_in * 1000;
              var expireTimeMS = date.NOW() +
                                 Math.max(0, expiresInMS - TIMEOUT_MS);
              resolve({
                accessToken: data.access_token,
                expireTimeMS: expireTimeMS
              });
            } else {
             logic(scope, 'no-access-token', {
                data: xhr.responseText
              });
              reject('needs-oauth-reauth');
            }
          } catch(e) {
            logic(scope, 'bad-json', {
              error: e,
              data: xhr.responseText
            });
            reject('needs-oauth-reauth');
          }
        }
      };

      xhr.onerror = function(err) {
        reject(errorutils.analyzeException(err));
      };

      xhr.ontimeout = function() {
        reject('unresponsive-server');
      };
    });
  }

});
