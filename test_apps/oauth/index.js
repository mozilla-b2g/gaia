/* hacky oauth things! */

(function(window) {

  function buildUrl(url, params) {
    var list = [];

    for (var key in params) {
      list.push(key + '=' + encodeURIComponent(params[key]));
    }

    return url + '?' + list.join('&');
  }

  function parseTokens(url) {
    var url = url.slice(url.lastIndexOf('?') + 1);
    var result = {};

    url.split('&').forEach(function(parts) {
      parts = parts.split('=');
      result[parts[0]] = parts[1];
    });

    return result;
  }

  var CLIENT_SECRET = 'jQTKlOhF-RclGaGJot3HIcVf';
  var TOKEN_URL = 'https://accounts.google.com/o/oauth2/token';

  var AUTH_PARAMS = {
    response_type: 'code',
    client_id: '605300196874-1ki833poa7uqabmh3hq' +
               '6u1onlqlsi54h.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/calendar',
    redirect_uri: 'https://oauth.gaiamobile.org/authenticated',
    state: 'foobar',
    access_type: 'offline',
    approval_prompt: 'force'
  };

  var AUTH_URL =
    buildUrl('https://accounts.google.com/o/oauth2/auth', AUTH_PARAMS);

  dump('AUTH URL:' + AUTH_URL + '\n\n');

  function aquireCode() {
    var iframe = document.createElement('iframe');
    iframe.setAttribute('mozbrowser', true);
    iframe.src = AUTH_URL;

    iframe.addEventListener('mozbrowserlocationchange', function(e) {
      dump('GOT URL:' + e.detail + '\n');
      if (e.detail && (e.detail.indexOf(AUTH_PARAMS.redirect_uri) === 0)) {
        var result = parseTokens(e.detail);
        var tokens = JSON.stringify(result);
        dump('\nGOT TOKENS:' + tokens + '\n');

        iframe.parentNode.removeChild(iframe);
        aquireTokens(result.code);
      }
    });

    document.body.appendChild(iframe);
  }

  function xhrWithFormData(url, params, callback) {
    var formData = new FormData();

    for (var key in params) {
      formData.append(key, params[key]);
    }

    var xhr = new XMLHttpRequest({ mozSystem: true });
    xhr.open('POST', url, true);

    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status == 200) {
          var json = JSON.parse(xhr.responseText.trim());
          dump('SUCCESS 200 - ' + JSON.stringify(json) + '\n');
          callback(json);
        } else {
          dump('SENT:' + JSON.stringify(params) + '\n');
          dump('XHR PROBLENS:' + xhr.status + ' - ' + xhr.responseText + '\n');
        }
      }
    };

    return xhr.send(formData);
  }

  function aquireTokens(code) {
    xhrWithFormData(
      TOKEN_URL,
      {
        code: code,
        client_id: AUTH_PARAMS.client_id,
        client_secret: CLIENT_SECRET,
        redirect_uri: AUTH_PARAMS.redirect_uri,
        grant_type: 'authorization_code'
      },
      function(response) {
        dump('GOT AUTH ' + JSON.stringify(response) + '\n\n');
        setInterval(function() {
          refreshToken(response);
        }, 10000);
      }
    );
  }

  function refreshToken(content) {
    xhrWithFormData(
      TOKEN_URL,
      {
        client_id: AUTH_PARAMS.client_id,
        refresh_token: content.refresh_token,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token'
      },
      function(content) {
        dump('GOT REFRESH' + JSON.stringify(content) + '\n\n');
      }
    );
  }

  function init() {
    var request = navigator.mozApps.getSelf();
    request.onerror = function() {
      alert('Sorry you cannot clear');
    };

    request.onsuccess = (function() {
      var gotThing = request.result.clearBrowserData();
      aquireCode();
    });
  }

  window.addEventListener('DOMContentLoaded', init);

}(this));
