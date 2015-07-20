'use strict';
/* global utils */

(function(exports) {
  var matchService = {};

  const CONTACTS_APP_ORIGIN = location.origin;

  var extensionFrame = document.createElement('iframe');
  extensionFrame.id = 'match-extension';
  document.body.appendChild(extensionFrame);
  
  var currentURI;

  matchService.match = function(contactId) {
    extensionFrame.src = currentURI = 
      '/contacts/views/matching/matching_contacts.html?contactId=' + contactId;
  };

  matchService.showDuplicateContacts = function() {
    extensionFrame.src = currentURI = 
      '/contacts/views/matching/matching_contacts.html';
  };

  function close(messageId, additionalMessageId) {
    extensionFrame.addEventListener('transitionend', function tclose() {
      extensionFrame.removeEventListener('transitionend', tclose);
      extensionFrame.classList.add('hidden');
      unload();

      if (messageId) {
        utils.status.show(messageId, additionalMessageId);
      }
    // Otherwise we do nothing as the sync process will finish sooner or later
    });
    extensionFrame.classList.remove('opening');
  }

  // This function can also be executed when other messages arrive
  // That's why we cannot call notifySettings outside the switch block
  function messageHandler(e) {
    if (!currentURI || e.origin !== CONTACTS_APP_ORIGIN) {
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
            }, CONTACTS_APP_ORIGIN);
            // Stop scrolling listeners on the contact list's image loader to
            // prevent images cancelled while friends are being imported
            window.dispatchEvent(new CustomEvent('image-loader-pause'));
          });
        }, 0);
      break;
      case 'window_close':
        close(data.messageId, data.additionalMessageId);
      break;
      case 'show_duplicate_contacts':
        extensionFrame.contentWindow.postMessage(data, CONTACTS_APP_ORIGIN);
        break;

      case 'duplicate_contacts_merged':
        extensionFrame.contentWindow.postMessage(data, CONTACTS_APP_ORIGIN);
      break;
    }
  }

  function unload() {
    // Attaching again scrolling handlers on the contact list's image loader
    window.dispatchEvent(new CustomEvent('image-loader-resume'));
    extensionFrame.src = currentURI = null;
  }

  window.addEventListener('message', messageHandler);

  exports.MatchService = matchService;

}(window));
