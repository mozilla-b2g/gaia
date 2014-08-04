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

  var WEBRTC_CLIENTNAME = 'Firefox Hello';

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
    // This has been hardcoded to prevent uplifting issues to v2.0
    title.textContent = WEBRTC_CLIENTNAME;

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
    // Is there any phone element?
    var phoneNumbers = _detailListDOM.querySelectorAll('[data-phone]');
    var phonesLength = phoneNumbers && phoneNumbers.length;
    if (phonesLength) {
      reference = phoneNumbers[phonesLength - 1].nextSibling;
    }
    else {
      var emails = _detailListDOM.querySelectorAll('[data-mail]');
      var emailsLength = emails && emails.length;
      if (emailsLength) {
        reference = emails[emailsLength - 1];
      }
    }

    _detailListDOM.insertBefore(
      _webrtcClientIntegrationDOM,
      reference
    );
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

  function _webRtcClientAvailable(contact) {
    var mailPresent = false;
    var telPresent = false;

    if (Array.isArray(contact.email)) {
      if (contact.email.length > 0 && contact.email[0] &&
          contact.email[0].value && contact.email[0].value.trim()) {
        mailPresent = true;
      }
    }

    if (Array.isArray(contact.tel)) {
      if (contact.tel.length > 0 && contact.tel[0] &&
          contact.tel[0].value && contact.tel[0].value.trim()) {
        telPresent = true;
      }
    }

    return telPresent || mailPresent;
  }

  function _onWebrtcClientInstalled() {
    // If we are not in the detail of a contact, we
    // dont need to render any button
    if (!_webRtcClientAvailable(_cachedContact) || !_isInDetail) {
      return;
    }

    // If is not appended yet, we added it
    if (!document.getElementById('webrtc-client-actions')) {
      _render();
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
