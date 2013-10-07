var fb = window.fb || {};

if (typeof fb.msg === 'undefined') {
  (function(document) {
    var Msg = fb.msg = {};
    var to;
    var message;
    var params = oauthflow.params.facebook;
    var appId = params['applicationId'];
    var redirectURI = params['redirectMsg'];

    Msg.CID_PARAM = 'contactid';

    // Only needed if we decide to craft our own UI
    Msg.wallPost = function(uid, msg) {
      to = uid || to;
      message = msg || message;
      oauth2.getAccessToken(doWallPost, 'wallPost', 'facebook');
    };

    Msg.sendPrivate = function(uid, msg) {
      // TODO: To be implemented (if we decide to craft our custom UI)
    };

    // This code is for posting to user's wall. Only will be necessary if
    // we decide to craft our own UI for posting to the wall
    function doWallPost(token) {
      var msgWallService = 'https://graph.facebook.com/#/feed?method=POST';

      msgWallService = msgWallService.replace(/#/, to);

      var params = [
        'access_token' + '=' + token,
        'message' + '=' + message,
        'callback' + '=' + 'fb.msg.ui.wallPosted'
      ];

      var q = params.join('&');

      var jsonp = document.createElement('script');
      jsonp.src = msgWallService + '&' + q;

      document.body.appendChild(jsonp);
    }

    var UI = Msg.ui = {};

    function getFbContactUid(contactId, callback) {
       var req = fb.utils.getContactData(contactId);

      req.onsuccess = function() {
        var fbContact = new fb.Contact(req.result);
        callback(fbContact.uid);
      };

      req.onerror = function() {
        window.console.error('Contacts: Contact not found!');
        callback(null);
      };
    }

    function openMsgDialog(dialogURI, uid) {
      var params = [
        'app_id' + '=' + appId,
        'to' + '=' + uid,
        'redirect_uri' + '=' + encodeURIComponent(redirectURI)
      ];

      var target = dialogURI + params.join('&');
      window.open(target);
    }

    // Use the FB Dialogs functionality for posting to the wall
    UI.wallPost = function(contactId) {
      getFbContactUid(contactId, function ui_wallPost(uid) {
        if (uid) {
          var dialogURI = 'https://m.facebook.com/dialog/feed?';
          openMsgDialog(dialogURI, uid);
        }
      });
    };

    // Use a Web view from Facebook for sending private messages
    // TODO: Check with Facebook why the send message dialog seems not to be
    // working on mobile
    UI.sendPrivateMsg = function(contactId) {
      getFbContactUid(contactId, function ui_sendMsg(uid) {
        if (uid) {
           window.open('https://m.facebook.com/compose_message/?uid=' + uid);
        }
      });
    };

    UI.wallPosted = function(result) {
      UI.end();
      window.console.log(JSON.stringify(result));
    };

  })(document);
}
