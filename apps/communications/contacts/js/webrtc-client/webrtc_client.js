/* exports WebrtcClient */
/* global MozActivity */
/* global Promise */

/*
 * This class is in charge of adding, in a 'plug&play' way, the buttons
 * related with the new feature for calling through WebRTC other phone or
 * email, taking into account the Contact info.
 *
 * We will check with MozActivity if the app is installed or not, and if it
 * is installed we will show the buttons in the Detail of the contact.
 */


(function(exports) {
  'use strict';
    
  var ACTIVITY_NAME = 'webrtc-call';

  var _webrtcClientIntegrationDOM, _detailListDOM;
  
  var _cachedContact = null;
  
  var _isInDetail = false;
  var _isWebrtcClientInstalled;
  var voiceCallButton, videoCallButton;

  function _launchActivity(videoEnabled) {
    var activity = new MozActivity({
      name: ACTIVITY_NAME,
      data: {
        video: videoEnabled,
        type: 'webcontacts/contact',
        contact: _cachedContact
      }
    });

    activity.onerror = function() {
      // TODO Add string if needed
    };
  }
  
  function _checkIfInstalled(forceCheck) {
    return new Promise(function(resolve, reject) {
      // If the value was previously checked we dont need to recheck again.
      if (_isWebrtcClientInstalled !== undefined && !forceCheck) {
        _isWebrtcClientInstalled ? resolve() : reject();
        return;
      }
      var activity =
        new MozActivity(
          {
            name: ACTIVITY_NAME,
            data: {
              type: 'webcontacts/contact',
              video: false,
              contact: null
            },
            // With this param we retrieve a list of apps
            // which could handle this activity.
            getFilterResults: true
          }
        );

      activity.onsuccess = function(e) {
        if (activity.result.length > 0) {
          _isWebrtcClientInstalled = true;
          resolve();
        } else {
          _isWebrtcClientInstalled = false;
          reject();
        }
      };
      activity.onerror = function(e) {
        _isWebrtcClientInstalled = false;
        reject();
      };
    });
  }

  function _createDOM() {
    // Let's build the structure we are going to use
    // First of all the element is going to be added to a list
    // so we create the 'li' element
    _webrtcClientIntegrationDOM = document.createElement('li');
    _webrtcClientIntegrationDOM.id = 'webrtc-client-actions';
    
    var title = document.createElement('h2');
    title.textContent = 'WebRTC Client';

    var colsWrapper = document.createElement('div');
    colsWrapper.className = 'fillflow-twocols';
    
    voiceCallButton = document.createElement('button');
    voiceCallButton.className = 'activity icon icon-webrtc-voice';
    navigator.mozL10n.localize(voiceCallButton, 'audio');
    voiceCallButton.addEventListener(
      'click',
      function onVoiceCallRequest() {
        _launchActivity(false);
      }
    );

    videoCallButton = document.createElement('button');
    videoCallButton.className = 'activity icon icon-webrtc-video';
    navigator.mozL10n.localize(videoCallButton, 'video');
    videoCallButton.addEventListener(
      'click',
      function onVideoCallRequest() {
        _launchActivity(true);
      }
    );

    colsWrapper.appendChild(voiceCallButton);
    colsWrapper.appendChild(videoCallButton);
    // Append elements to the new section
    _webrtcClientIntegrationDOM.appendChild(title);
    _webrtcClientIntegrationDOM.appendChild(colsWrapper);
  }

  function _enableButtons() {
    voiceCallButton.disabled = false;
    videoCallButton.disabled = false;
  }

  function _disableButtons() {
    voiceCallButton.disabled = true;
    videoCallButton.disabled = true;
  }

  function _init() {
    // Cache the parent element
    _detailListDOM = document.getElementById('details-list');
    // Create the DOM for the new element in the 'details-list'
    _createDOM();
  }

  function _insert() {
    // Get the section which is going to be shown after, we will use it
    // as a reference
    var reference;
    // Is there any email element?
    var emails = _detailListDOM.querySelectorAll('[data-mail]');
    var emailsLength = emails && emails.length;
    if (emailsLength > 0) {
      reference = emails[emailsLength - 1];
    } else {
      // Is there any phone number element?
      var phoneNumbers = _detailListDOM.querySelectorAll('[data-phone]');
      reference = phoneNumbers[phoneNumbers.length - 1];
    }

    // Append into the right position
    if (reference) {
      _detailListDOM.insertBefore(
        _webrtcClientIntegrationDOM,
        reference.nextSibling
      );
    } else {
      reference = _detailListDOM.children[0];
      _detailListDOM.insertBefore(_webrtcClientIntegrationDOM, reference);
    }
  }

  function _remove() {
    if (!!document.getElementById('webrtc-client-actions')) {
      _detailListDOM.removeChild(_webrtcClientIntegrationDOM);
    }
  }

  function _render() {
    if (!_webrtcClientIntegrationDOM) {
      _init();
    }
    _insert();
  }

  function _onVisibilityChange() {
    if (!document.hidden) {
      _checkIfInstalled(true).then(
        _onWebrtcClientInstalled,
        _onWebrtcClientUninstalled
      );
    }
  }

  function _startListeningAppChanges() {
    document.addEventListener('visibilitychange', _onVisibilityChange);
  }

  function _stopListeningAppChanges() {
    document.removeEventListener('visibilitychange', _onVisibilityChange);
  }

  function _onWebrtcClientInstalled() {
    // If we are not in the detail of a contact, we
    // dont need to render any button
    if (!_isInDetail) {
      return;
    }

    // If is not appended yet, we added it
    if (!document.getElementById('webrtc-client-actions')) {
      _render();
    }

    // Check if we need to enable or disable the button
    var phones = _cachedContact && _cachedContact.tel || [];
    var emails = _cachedContact && _cachedContact.email || [];
    
    if (phones.length === 0 && emails.length === 0) {
      _disableButtons();
    } else {
      _enableButtons();
    }
  }

  function _onWebrtcClientUninstalled() {
    _remove();
  }

  var WebrtcClient = {
    start: function start(contact, forceCheck) {
      if (!_isInDetail) {
        // Specify that we are in the detail of a contact
        _isInDetail = true;
        // Listening for app changes
        _startListeningAppChanges();
      }
      // Cache the contact for future events
      _cachedContact = contact;
      // If installed we need to render
      _checkIfInstalled(forceCheck).then(
        _onWebrtcClientInstalled,
        _onWebrtcClientUninstalled
      );
      
    },
    stop: function stop() {
      // Clean the previous params
      _cachedContact = null;
      _isInDetail = false;
      // Stop listening for app changes
      _stopListeningAppChanges();
    }
  };

  exports.WebrtcClient = WebrtcClient;
}(this));
