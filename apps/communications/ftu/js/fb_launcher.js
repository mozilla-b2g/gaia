'use strict';

var FbLauncher = (function(document) {
    var extensionFrame = document.querySelector('#fb-extensions');
    var oauthFrame = document.querySelector('#fb-oauth');

    var currentURI = '/contacts/fb_import.html?ftu=1',
        access_token;


    function open() {
      extensionFrame.className = 'opening';
    }

    function load() {
      window.addEventListener('message', messageHandler);
      oauthFrame.contentWindow.postMessage({
        type: 'start',
        data: {
          from: 'friends'
        }
      }, fb.CONTACTS_APP_ORIGIN);
    }

    function unload() {
      window.removeEventListener('message', messageHandler);
      extensionFrame.src = null;
    }

    function close(message) {
      extensionFrame.addEventListener('transitionend', function tclose() {
        extensionFrame.removeEventListener('transitionend', tclose);
        extensionFrame.src = null;
        if (message) {
          utils.status.show(message);
        }
      });
      extensionFrame.className = 'closing';
      window.removeEventListener('message', messageHandler);

       // Notify observers that a change from FB could have happened
      var event = new CustomEvent('fb_imported', {
        'detail' : true
      });

      document.dispatchEvent(event);
    }


    // This function can also be executed when other messages arrive
    // That's why we cannot call notifySettings outside the switch block
    function messageHandler(e) {
      var data = e.data;

      switch (data.type) {
        case 'ready':
          open();
          break;

        case 'abort':
          unload();
          break;

        case 'window_close':
          close(data.message);
          break;

        case 'authenticated':
          extensionFrame.src = currentURI;
          access_token = data.data;
          break;

        case 'messaging_ready':
          extensionFrame.contentWindow.postMessage({
            type: 'token',
            data: access_token
          }, fb.CONTACTS_APP_ORIGIN);
          break;
      }
    }

    return {
      start: load
    };

  })(document);
