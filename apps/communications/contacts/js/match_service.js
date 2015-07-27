'use strict';

(function(exports) {
  var matchService = {};

  const CONTACTS_APP_ORIGIN = location.origin;
  
  var extensionFrame = null;

  var currentURI;

  matchService.match = function(contactId) {
    extensionFrame = window.open(
      '/contacts/views/matching/matching_contacts.html?contactId=' +
      contactId, 'Contacts match');
    currentURI = '/contacts/views/matching/matching_contacts.html?contactId=' +
      contactId;
    init();
  };

  matchService.showDuplicateContacts = function() {
    extensionFrame = window.open(
      '/contacts/views/matching/matching_contacts.html', 'Contacts match');
    currentURI = '/contacts/views/matching/matching_contacts.html';
    init();
  };

  function init(){
    extensionFrame.addEventListener('load', function fn(){
      extensionFrame.removeEventListener('load', fn);
      extensionFrame.postMessage({
        type: 'sync'
      }, CONTACTS_APP_ORIGIN);
      extensionFrame.onunload = function(){
        extensionFrame.onunload = null;
        window.postMessage({
          type: 'window_close'
        }, CONTACTS_APP_ORIGIN);
      };
    }, false);
  }

  function close(messageId, additionalMessageId) {
    extensionFrame.close();
    unload();
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
        extensionFrame.postMessage({
          type: 'dom_transition_end',
          data: ''
        }, CONTACTS_APP_ORIGIN);
        window.dispatchEvent(new CustomEvent('image-loader-pause'));
        break;
      case 'window_close':
        close(data.messageId, data.additionalMessageId);
        break;
      case 'show_duplicate_contacts':
        extensionFrame.postMessage(data, CONTACTS_APP_ORIGIN);
        break;
      case 'duplicate_contacts_merged':
        extensionFrame.postMessage(data, CONTACTS_APP_ORIGIN);
        break;
    }
  }

  function unload() {
    // Attaching again scrolling handlers on the contact list's image loader
    extensionFrame = currentURI = null;
    window.dispatchEvent(new CustomEvent('image-loader-resume'));
  }

  window.addEventListener('message', messageHandler);

  exports.MatchService = matchService;

}(window));
