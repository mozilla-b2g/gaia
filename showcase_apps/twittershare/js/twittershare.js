'use strict';

/*

Todo:

*/

var twitter = (function() {
  var oauthToken, oauthVerifier, account, imgToShare, authWindow,
      config = {};

  var init = function() {
    config = (function() {
      var data = {
        ready: false,
        consumerKey: '',
        consumerSecret: ''
      };

      var xhr = new XMLHttpRequest({mozSystem: true});
      xhr.open('get', 'http://redirector.cloudfoundry.com/twitter.json', true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          data.ready = true;
          var responseObj = JSON.parse(xhr.responseText);
          data.consumerKey = responseObj.consumer_key;
          data.consumerSecret = responseObj.consumer_secret;
        }
      };
      xhr.send();

      return {
        get ready() {
          return data.ready;
        },
        get consumerKey() {
          return data.consumerKey;
        },
        get consumerSecret() {
          return data.consumerSecret;
        }
      };
    }());

    // Add event listener to catch images through activity
    document.addEventListener('onImageReceived', function(e) {
      var img = document.createElement('img');
      imgToShare = e.detail.data;
      img.src = URL.createObjectURL(imgToShare);
      img.onload = function() { URL.revokeObjectURL(img.src); };

      var imgContainer = document.querySelector('#img_container');
      imgContainer.innerHTML = '';
      imgContainer.appendChild(img);
    });

    // Restore saved Twitter acc
    if (localStorage.account !== undefined) {
      account = JSON.parse(localStorage.account);
    }

    // Check if in the process of loggin in, carry on if so
    if (document.location.href.indexOf('#oauth_token') !== -1) {
      login();
      return true;
    } else {
      UserDetails.init();
      UserDetails.load();
    }
  };

  var login = function() {
    if (!config.ready) {
      alert('Twitter is not ready yet, try again!');
      return false;
    }

    Notification.show(
      'Logging in',
      'Connecting to Twitter. This may take a couple seconds...'
    );

    if (document.location.href.indexOf('#oauth_token') !== -1) {
      fetchURL();
      getAccessToken();
      return false;
    }

    /**
      Process the twitter request with the http verb as second
      parameters and any extra options needed.

      In this case we are passing what's the callback url once
      the authentication is done in Twitter.

      That url: http://redirector.cloudfoundry.com is a deployed
      version of this open source project:
      https://github.com/arcturus/postmessageitor

      That callback will do a postMessage to the opener window
      passing any parameter received, in this case from Twitter.
    **/
    processTwitterXHR(
      'https://api.twitter.com/oauth/request_token',
      'POST',
      {oauth_callback: 'http://redirector.cloudfoundry.com'},
      function(xhr) {
        if (xhr.status !== 200 && xhr.status !== 0) {
          alert('Request refused:', xhr.status);
          Notification.set('Logging in', 'Request refused:', xhr.status);
          return;
        }

        if (xhr.responseText.match('oauth_token=')) {
          Notification.set('Logging in', 'Extracting Twitter temporary token');

          var request_token_regex =
            new RegExp('oauth_token=(.*)&oauth_token_secret=.*');
          var request_token_ar = request_token_regex.exec(xhr.responseText);
          var request_token_full = request_token_ar[0];
          var request_token_only = request_token_ar[1];
          var authorize =
            'https://api.twitter.com/oauth/authorize?' + request_token_full;

          Notification.set('Logging in', 'Opening window to login Twitter');

          authWindow = window.open(authorize);

          window.addEventListener('message', function messageHandler(event) {
            if (event.origin == 'https://api.twitter.com') {
              return;
            }

            var data = event.data;

            getAccessToken(data.oauth_token, data.oauth_verifier, function() {
              UserDetails.init();
              UserDetails.load();
              Notification.hide();
              Gui.renderHeader();
            });
          }, false);

        }
      }
    );
  };

  var getAccessToken = function(token, verifier, callback) {
    processTwitterXHR(
      'https://api.twitter.com/oauth/access_token',
      'POST',
      {oauth_verifier: verifier, oauth_token: token},
      function(xhr) {
        if (xhr.status != 200 && xhr.status !== 0) {
          Notification.set(
            'Logging in',
            'Request refused! Status: ' + xhr.status
          );
          return;
        }

        Notification.set('Logging in', 'Access token received');

        account =
          extractTwitterAccessToken(xhr.responseText);

        localStorage.account = JSON.stringify(account);

        twitter.account = account;
        if (authWindow) {
          authWindow.close();
        }

        if (typeof callback !== 'undefined') {
          callback();
        }
      }
    );
  }

  var revoke = function() {
    account = undefined;
    localStorage.clear();

    UserDetails.revoke();
    UserDetails.render();
    Gui.renderHeader();
  }.bind(this);

  var fetchURL = function() {

    var urlArr = document.location.href.split('#');
    var hash = urlArr[1];
    var hashArr = hash.split('&');
    var unfetchedOauthToken = hashArr[0];
    var unfetchedOauthVerifier = hashArr[1];
    var oauthTokenArr = unfetchedOauthToken.split('=');
    oauthToken = oauthTokenArr[1];
    var oauthVerifierArr = unfetchedOauthVerifier.split('=');
    oauthVerifier = oauthVerifierArr[1];
    document.location.hash = '';

  };

  var processTwitterXHR = function(url, method, params, callback) {
    var target_url = buildTwitterURL(url, method, params);
    var xhr = new XMLHttpRequest({mozSystem: true});
    xhr.open(method, target_url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        callback(xhr);
      }
    };
    xhr.send();
  };

  var buildTwitterURL = function(url, method, parameters) {
    var accessor = {
      token: null,
      tokenSecret: null,
      consumerKey: config.consumerKey,
      consumerSecret: config.consumerSecret
    };

    // # Add saved twitter acc details
    if (typeof account !== 'undefined') {
      accessor.token = account.oauth_token;
      accessor.tokenSecret = account.oauth_token_secret;
    }

    var message = {
      action: url,
      method: method,
      parameters: parameters
    };

    OAuth.completeRequest(message, accessor);
    OAuth.SignatureMethod.sign(message, accessor);
    return url + '?' + OAuth.formEncode(message.parameters);
  };

  var extractTwitterAccessToken = function(string) {
    var res = {};
    var ar = string.split('&');
    for (var id in ar) {
      var param = ar[id].split('=');
      res[param[0]] = param[1];
    }
    return res;
  }

  var upload = function(msg) {
    var btnSend = document.querySelector('#btnSend');
    btnSend.disabled = true;

    if (!config.ready) {
      alert('Twitter is not ready yet, try again!');
      btnSend.disabled = false;
      return false;
    }

    Notification.show(
      'Uplading image',
      'Connecting to Twitter. This may take coupele seconds...'
    );

    var twstatus = msg;

    if (typeof account == 'undefined') {
      twitter.login();
      btnSend.disabled = false;
      return false;
    }

    var url = buildTwitterURL(
      'https://upload.twitter.com/1/statuses/update_with_media.json',
      'POST',
      {include_entities: true, status: twstatus}
    );

    var picture = new FormData();
    picture.append('media', imgToShare);

    XHRUpload(url, picture, function(xhr) {
      var json = JSON.parse(xhr.responseText);
      var id_str = json.entities.media[0].id_str;
      var ex_url = json.entities.media[0].expanded_url;
      btnSend.disabled = false;
      ActivityHandler.postSuccess();
    });
  };

  var XHRUpload = function(url, data, callback) {
    var xhr = new XMLHttpRequest({mozSystem: true});
    xhr.open('POST', url, true);

    xhr.upload.addEventListener('progress', function(e) {
      var percentage = Math.round(e.loaded / (e.total / 100));
      if (e.lengthComputable) {
        Notification.set('Uplading image', 'Uploaded ' + percentage + '%');
      }
    }, false);

    xhr.upload.addEventListener('load', function(e) {
      var percentage = Math.round(e.loaded / (e.total / 100));
      Notification.set('Uplading image', 'Uploaded ' + percentage + '%');
    }, false);

    xhr.onreadystatechange = function() {
      if (xhr.readyState == XMLHttpRequest.DONE) {
        var response = JSON.parse(xhr.responseText);

        if (typeof response.error === 'undefined') {
          Notification.set('Uplading image', 'Upload finished!');
          callback(xhr);
        } else {
          alert('Error: ' + response.error);
          Notification.hide();
        }

      }
    };

    xhr.send(data);
  };

  var linkDomElements = function() {
    // # Setup input
    var btnSend = document.querySelector('#btnSend');
    var msgInput = document.querySelector('#msg_input');

    // # Close activiy button
    var btnCloseActivity = document.querySelector('#closeActivity');
    btnCloseActivity.addEventListener('click', function() {
      ActivityHandler.postCancel();
    }, false);
  };

  var UserDetails = (function() {
    var data, dom = {};

    var init = function() {
      dom.frame = document.querySelector('.user_details');
      dom.img = document.querySelector('#user_detail_img');
      dom.fullName = document.querySelector('#user_detail_full_name');
      dom.screenName = document.querySelector('#user_detail_screenName');
    };

    var load = function() {
      // If not saved to localStorage
      if (typeof localStorage.userDetailsData === 'undefined') {
        if (typeof account === 'undefined') {
          return false;
        }
        var url = 'https://api.twitter.com/1/users/show.json?screen_name=';
        url += account.screen_name + '&include_entities=true';
        var xhr = new XMLHttpRequest({mozSystem: true});
        xhr.open('get', url, true);
        xhr.onreadystatechange = function() {
          if (xhr.readyState == XMLHttpRequest.DONE) {
            data = JSON.parse(xhr.response);
            if (typeof data.error === 'undefined') {
              localStorage.userDetailsData = xhr.response;
              render();
              show();
            } else {
              alert(data.error);
            }
          }
        }
        xhr.send();
      } else { // If data is saved to localStorage
        data = JSON.parse(localStorage.userDetailsData);
        render();
        show();
      }

      return this.data;
    };

    var revoke = function() {
      data = {
        frame: undefined,
        profile_image_url: 'style/images/default_profile_2_normal.png',
        name: 'Full Name',
        screen_name: 'ScreenName'
      };

      hide();

      return data;
    };

    var render = function() {
      dom.img.src = data.profile_image_url;
      dom.fullName.textContent = data.name;
      dom.screenName.textContent = '@' + data.screen_name;

      return dom;
    };

    var show = function() {
      dom.frame.classList.add('active');
    };

    var hide = function() {
      dom.frame.classList.remove('active');
    };

    return {
      load: load,
      data: data,
      init: init,
      revoke: revoke,
      render: render
    };
  }());

  var Notification = (function() {
    var dom = {};

    var init = function() {
      dom.frame = document.querySelector('#notification');
      dom.title = document.querySelector('#notification #title');
      dom.msg = document.querySelector('#notification #msg');

    };

    var show = function(title, msg) {
      dom.frame.classList.add('active');
      dom.title.textContent = title;
      dom.msg.textContent = msg;
    };

    var set = function(title, msg) {
      dom.title.textContent = title;
      dom.msg.textContent = msg;
    };

    var hide = function() {
      dom.frame.classList.remove('active');
    };

    init();

    return {
      show: show,
      hide: hide,
      set: set
    };
  }());

  var Gui = (function() {
    var msgArea, msgInput, counter, btnSend, btnSigninOut;

    var init = function() {
      msgArea = document.querySelector('#msg_area');
      counter = document.querySelector('#counter');
      msgInput = document.querySelector('#msg_input');
      btnSend = document.querySelector('#btnSend');
      btnSigninOut = document.querySelector('#btnSigninOut');

      Gui.renderHeader();

      msgInput.addEventListener('keyup', function() {
        calcCounter();
      }, false);

      calcCounter();
    };

    var calcCounter = function() {
      var lengthLeft = 116 - msgInput.value.length;

      if (lengthLeft < 0) {
        msgInput.value = msgInput.value.substring(0, 116);
        lengthLeft = 116 - msgInput.value.length;
      }

      counter.textContent = lengthLeft;

      if (20 < lengthLeft) {
        counter.style.color = '#C0C0C0';
      }

      if (lengthLeft <= 20) {
        counter.style.color = '#C80000';
      }
    };

    var onloadOld = window.onload;
    window.onload = function() {
      init();
      if (onloadOld) {
        onloadOld();
      }
    };

    var renderHeader = function() {
      if (typeof account !== 'undefined') {
        btnSend.classList.add('active');
        btnSend.addEventListener('click', function() {
          twitter.upload(msgInput.value);
        }, false);

        // # Setup sign in/out button
        btnSigninOut.textContent = 'Logout';
        btnSigninOut.onclick = function() {
          twitter.revoke();
        };

      } else {
        btnSend.classList.remove('active');

        btnSigninOut.textContent = 'Login';
        btnSigninOut.onclick = function() {
          twitter.login();
        };
      }
    };

    return {
      renderHeader: renderHeader
    };
  }());

  init();

  var onloadOld = window.onload;
  window.onload = function() {
    linkDomElements();
    if (onloadOld) {
      onloadOld();
    }
  };

  return {
    login: login,
    account: account,
    upload: upload,
    revoke: revoke,
    UserDetails: UserDetails,
    Notification: Notification
  };
}());
