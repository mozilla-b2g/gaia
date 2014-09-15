'use strict';
define(function(require) {
  var queryString = require('query_string');
  var services = require('services');
  // All of the oauthSecrets we know.
  var oauthSecrets = services.oauth2;
  // The secrets for the oauth we're currently doing.
  var curOauthSecrets;
  // Flag to indicate the work for redeeming the auth code is still in progress,
  // so detection of the auth window closing should not cancel the operation.
  var redeemingCode = false;

  var TIMEOUT_MS = 30 * 1000;

  var deferred, p, win, winIntervalId, oauthSettings;

  /**
   * The postMessage listener called from redirect.html to indicate the final
   * data returned from the oauth jump.
   * @param  {DOMEvent} event the event sent via redirect.html's postMessage.
   */
  function oauthOnMessage(event) {
    var data = event.data,
        origin = document.location.protocol + '//' + document.location.host;

    if (data.messageType === 'oauthRedirect' && event.origin === origin) {
      if (!data.code) {
        reset('reject', new Error('no code returned'));
        return;
      }

      // Okay, so we've got a code.  And now we need to redeem that code for
      // tokens.
      console.log('oauth redirect returned with code');
      redeemingCode = true;
      redeemCode(data.code).then(
        function(redeemed) {
          // Microsoft provides expires_on too but Google only provides
          // expires_in, so let's just use expires_in for now.
          var expiresInMS = parseInt(redeemed.expires_in, 10) * 1000;
          // Make the time absolute and let's take 30 seconds off the end to
          // allow for ridiculous latency.
          var expireTimeMS = Date.now() +
                Math.max(0, expiresInMS - TIMEOUT_MS);
          var result = {
            status: 'success',
            tokens: {
              accessToken: redeemed.access_token,
              refreshToken: redeemed.refresh_token,
              expireTimeMS: expireTimeMS
            },
            secrets: curOauthSecrets
          };

          reset('resolve', result);
        },
        function(err) {
          reset('reject', err);
        });
    }
  }

  /**
   * Turns the code received from the oauth jump into an actual oauth token
   * data.
   * @param  {String} code the code received from the oauth2 provider.
   * @return {Promise}
   */
  function redeemCode(code) {
    console.log('redeeming oauth code');
    return new Promise(function(xhrResolve, xhrReject) {
      var xhr = new XMLHttpRequest({ mozSystem: true });
      xhr.open('POST', oauthSettings.tokenEndpoint, true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      xhr.timeout = TIMEOUT_MS;

      xhr.onload = function() {
        if (xhr.status < 200 || xhr.status >= 300) {
          console.error('token redemption failed', xhr.status,
                        xhr.responseText);
          xhrReject('status' + xhr.status);
        } else {
          try {
            // yeah, we could have just set responseType.
            var data = JSON.parse(xhr.responseText);
            console.log('oauth code redeemed. access_token? ' +
                        !!data.access_token + ', refresh_token? ' +
                        !! data.refresh_token);
            xhrResolve(data);
          } catch (ex) {
            console.error('badly formed JSON response for token redemption:',
                          xhr.responseText);
            xhrReject(ex);
          }
        }
      };

      xhr.onerror = function(err) {
        console.error('token redemption weird error:', err);
        xhrReject(err);
      };
      xhr.ontimeout = function() {
        console.error('token redemption timeout');
        xhrReject('timeout');
      };

      var redemptionArgs = {
        code: code,
        client_id: curOauthSecrets.clientId,
        client_secret: curOauthSecrets.clientSecret,
        // uh, this doesn't seem right, but the docs want it?  hopefully it just
        // gets forever ignored?
        redirect_uri: 'http://localhost',
        grant_type: 'authorization_code'
      };

      xhr.send(queryString.fromObject(redemptionArgs));
    });
  }

  /**
   * Checks that the browser window used to show the oauth provider's oauth2
   * flow to the user is still in operation. If it is not, it means the user
   * canceled the flow by closing that browser window.
   */
  function dialogHeartbeat() {
    if ((!win || win.closed) && !redeemingCode) {
      reset('resolve', { status: 'cancel' });
    }
  }

  function reset(actionName, value) {
    console.log('oauth2 fetch reset with action: ' + actionName);
    var action = deferred[actionName];
    if (winIntervalId) {
      clearInterval(winIntervalId);
      winIntervalId = 0;
    }

    if (win && !win.closed) {
      win.close();
    }

    window.removeEventListener('message', oauthOnMessage);

    deferred = p = win = null;
    redeemingCode = false;

    action(value);
  }

  /**
   * Does the OAuth dialog dance.
   *
   * @param {Object} o2Settings
   * @param {String} o2Settings.authEndpoint
   *   URL of the authorization endpoint.
   * @param {String} o2Settings.scope
   *   The scope to request.
   * @param {String} [o2Settings.secretGroup]
   *   Secret group identifier if this is an initial OAuth.  If this is a reauth
   *   then the clientId should be provided instead and reused.
   * @param {String} [o2Settings.clientId]
   *   If this is a reauth (or don't need to/want to use our internal secret
   *   table, the client_id to reuse.  clientSecret should also be provided
   *   (even though we don't use it ourselves) for consistency.
   * @param  {Object} [extraQueryObject] extra query args to pass to the
   * provider. These are typically only known at runtime vs the o2Settings.
   * The property names in the extraQueryObject will be mapped to the provider's
   * preferred names by using o2Settings.extraArgsMap
   *
   * @return {Promise} The resolved value will be an object with these
   * properties:
   * * status: String indicating status of the request. 'succcess' and 'cancel'
   * are the possible values.
   * * tokens: If status is 'success', this will be the token data in the form
   *   { accessToken, refreshToken, expireTimeMS }
   * * secrets: The clientId and clientSecret used for this oauth.
   */
  return function oauthFetch(o2Settings, extraQueryObject) {
    // Only one auth session at a time.
    if (deferred) {
      reset('reject', new Error('Multiple oauth calls, starting new one'));
    }
    p = new Promise(function(res, rej) {
      deferred = {
        resolve: res,
        reject: rej
      };
    });

    // Set up listening for message from cards/oauth/redirect.html
    window.addEventListener('message', oauthOnMessage);
    oauthSettings = o2Settings;

    curOauthSecrets = undefined;
    if (o2Settings.clientId && o2Settings.clientSecret) {
      curOauthSecrets = {
        clientId: o2Settings.clientId,
        clientSecret: o2Settings.clientSecret
      };
    } else if (o2Settings.secretGroup) {
      curOauthSecrets = oauthSecrets[o2Settings.secretGroup];
    }
    if (!curOauthSecrets) {
      reset('reject',
            new Error('no secrets for group: ' + o2Settings.secretGroup));
      return p;
    }

    var authEndpointQuery = {
      client_id: curOauthSecrets.clientId,
      // This must match what's in our manifest so we're not considering it
      // something that's allowed to change.  Because this is currently
      // fairly gmail specific with the "installed app" flow, we (must) use
      // localhost, but we are maintaining a redirect for our theoretical
      // https://email.gaiamobile.org/ domain.
      redirect_uri: 'http://localhost',
      response_type: 'code',
      scope: o2Settings.scope,
      // max_auth_age set to 0 means that google will not keep the user signed
      // in after completing the oauth jump. This is important so that if an
      // account is deleted, someone else could not then just set up another
      // account using the cached sign in cookies.
      max_auth_age: 0
    };

    var url = o2Settings.authEndpoint + '?' +
              queryString.fromObject(authEndpointQuery);

    if (extraQueryObject) {
      var extraArgs = queryString.fromObject(extraQueryObject);
      if (extraArgs) {
        url += '&' + extraArgs;
      }
    }

    // Need to watch for a window close. Best way is to poll that status of
    // the window.
    win = window.open(url, '', 'dialog');
    winIntervalId = setInterval(dialogHeartbeat, 1000);

    return p;
  };
});
