'use strict';
/* global utils */
/* global fb */
/* exported extServices*/

(function(exports) {
  var extServices = {};

  // TODO Remove fb- prefixes: Bug 1181469
  var extensionFrame = document.querySelector('#fb-extensions');
  var oauthFrame = document.querySelector('#fb-oauth');
  oauthFrame.src = '/shared/pages/import/oauth.html';
  var currentURI, access_token;
  var canClose = true, canCloseLogout = true;
  var closeRequested = false;

  extServices.importGmail = function(evt) {
    loadService('gmail');
  };

  extServices.importLive = function(evt) {
    loadService('live');
  };

  function loadService(serviceName) {
    closeRequested = false;
    canClose = false;
    canCloseLogout = false;
    load('/shared/pages/import/import.html?service=' + serviceName,
         'friends', serviceName);
  }

  function load(uri, from, serviceName) {
    oauthFrame.contentWindow.postMessage({
      type: 'start',
      data: {
        from: from,
        service: serviceName
      }
    }, fb.CONTACTS_APP_ORIGIN);
    currentURI = uri;
  }

  function unload() {
    // Attaching again scrolling handlers on the contact list's image loader
    window.dispatchEvent(new CustomEvent('image-loader-resume'));
    extensionFrame.src = currentURI = null;
  }

  function close(messageId, additionalMessageId) {
    extensionFrame.addEventListener('transitionend', function tclose() {
      extensionFrame.removeEventListener('transitionend', tclose);
      extensionFrame.classList.add('hidden');
      if (canClose === true && canCloseLogout === true) {
        unload();
      }
      else {
        closeRequested = true;
      }

      if (messageId) {
        utils.status.show(messageId, additionalMessageId);
      }
    // Otherwise we do nothing as the sync process will finish sooner or later
    });
    extensionFrame.classList.remove('opening');
  }

  function notifySettings(evtype) {
    // Notify observers that a change from FB could have happened
    var eventType = evtype || 'fb_changed';

    var event = new CustomEvent(eventType, {
      'detail' : true
    });

    document.dispatchEvent(event);
  }

  // This function can also be executed when other messages arrive
  // That's why we cannot call notifySettings outside the switch block
  function messageHandler(e) {
    if (!currentURI || e.origin !== fb.CONTACTS_APP_ORIGIN) {
      return;
    }

    var data = e.data;

    switch (data.type) {
      case 'ready':
        extensionFrame.classList.remove('hidden');
        window.setTimeout(function displaying() {
          extensionFrame.classList.add('opening');
          extensionFrame.addEventListener('transitionend', function topen() {
            extensionFrame.removeEventListener('transitionend', topen);
            extensionFrame.contentWindow.postMessage({
              type: 'dom_transition_end',
              data: ''
            }, fb.CONTACTS_APP_ORIGIN);
            // Stop scrolling listeners on the contact list's image loader to
            // prevent images cancelled while friends are being imported
            window.dispatchEvent(new CustomEvent('image-loader-pause'));
          });
        }, 0);
      break;

      case 'authenticated':
        extensionFrame.src = currentURI;
        access_token = data.data;
      break;

      case 'token_stored':
        notifySettings('fb_token_ready');
      break;

      case 'token_error':
        notifySettings('fb_token_error');
      break;

      case 'abort':
        unload();
      break;

      case 'window_close':
        close(data.messageId, data.additionalMessageId);
        notifySettings();
      break;

      case 'import_updated':
        extensionFrame.contentWindow.postMessage({
            type: 'contacts_loaded',
            data: ''
          }, fb.CONTACTS_APP_ORIGIN);
      break;

      case 'sync_finished':
        // Sync finished thus the iframe can be safely "removed"
        canClose = true;
        if (closeRequested && canCloseLogout) {
          unload();
        }

        // Check whether there has been changes or not
        if (data.data > 0) {
          notifySettings();
        }
      break;

      case 'logout_finished':
        canCloseLogout = true;
        if (closeRequested && canClose) {
          unload();
        }
      break;

      case 'messaging_ready':
        extensionFrame.contentWindow.postMessage({
          type: 'token',
          data: access_token
        }, fb.CONTACTS_APP_ORIGIN);
        break;

    }
  }

  window.addEventListener('message', messageHandler);

  exports.ExtServices = extServices;

}(window));
