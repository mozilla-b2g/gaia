'use strict';
/*
 * This code is in charge of launching a diferent window
 * to handle if one or more contacts have the same info
 * that the one we are trying to save.
 */
 
(function(exports) {
  var matchService = {};

  const CONTACTS_APP_ORIGIN = location.origin;
  
  var matcherWindow = null;
  var currentURL;

  function openWindow(url) {
    if (!url) {
      return;
    }
    matcherWindow = window.open(url);
    currentURL = url;
    init();
  }

  function closeWindow(messageId, additionalMessageId) {
    matcherWindow.close();
    unload();
  }

  matchService.match = function(contactId) {
    var url =
      '/contacts/views/matching/matching_contacts.html?contactId=' +
      contactId;
    openWindow(url);
  };

  matchService.showDuplicateContacts = function() {
    var url =
      '/contacts/views/matching/matching_contacts.html';
    openWindow(url);
  };

  function init(){
    matcherWindow.addEventListener('load', function fn(){
      matcherWindow.removeEventListener('load', fn);
      matcherWindow.postMessage({
        type: 'sync'
      }, CONTACTS_APP_ORIGIN);
      matcherWindow.onunload = function(){
        window.postMessage({
          type: 'window_close'
        }, CONTACTS_APP_ORIGIN);
      };
    }, false);
  }

  // This function can also be executed when other messages arrive
  // That's why we cannot call notifySettings outside the switch block
  function messageHandler(e) {
    if (!currentURL || e.origin !== CONTACTS_APP_ORIGIN) {
      return;
    }

    var data = e.data;

    switch (data.type) {
      case 'ready':
        matcherWindow.postMessage({
          type: 'dom_transition_end',
          data: ''
        }, CONTACTS_APP_ORIGIN);
        window.dispatchEvent(new CustomEvent('image-loader-pause'));
        break;
      case 'window_close':
        closeWindow(data.messageId, data.additionalMessageId);
        break;
      case 'show_duplicate_contacts':
        matcherWindow.postMessage(data, CONTACTS_APP_ORIGIN);
        break;
      case 'duplicate_contacts_merged':
        matcherWindow.postMessage(data, CONTACTS_APP_ORIGIN);
        break;
    }
  }

  function unload() {
    // Attaching again scrolling handlers on the contact list's image loader
    matcherWindow = currentURL = null;
    window.dispatchEvent(new CustomEvent('image-loader-resume'));
  }

  window.addEventListener('message', messageHandler);

  exports.MatchService = matchService;

}(window));
