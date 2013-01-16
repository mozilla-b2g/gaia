/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

// When bug 794999 is resolved, switch to use the abstract Trusted UI Component

'use strict';

const kIdentityScreen = 'https://login.native-persona.org/sign_in#NATIVE';
const kIdentityFrame =
    'https://login.native-persona.org/communication_iframe';

var Identity = (function() {
  var iframe;

  return {
    trustedUILayerID: null,

    init: function() {
      window.addEventListener('mozChromeEvent', this);
    },

    handleEvent: function onMozChromeEvent(e) {
      var chromeEventId = e.detail.id;
      switch (e.detail.type) {
        // Chrome asks Gaia to show the identity dialog.
        case 'open-id-dialog':
          // When opening the dialog, we record the chrome event id, which
          // we will need to send back to the TrustedUIManager when asking
          // to close.
          this.trustedUILayerID = chromeEventId;
          if (!this.trustedUILayerID)
            return;

          if (!e.detail.showUI && iframe) {
            this._dispatchEvent({
              id: chromeEventId,
              frame: iframe
            });
            return;
          }
          var frame = document.createElement('iframe');
          frame.setAttribute('mozbrowser', 'true');
          frame.setAttribute('remote', true);
          frame.classList.add('screen');
          frame.src = e.detail.showUI ? kIdentityScreen : kIdentityFrame;
          frame.addEventListener('mozbrowserloadstart',
              function loadStart(evt) {
            // After creating the new frame containing the identity flow, we
            // send it back to chrome so the identity callbacks can be injected.
            this._dispatchEvent({
              id: chromeEventId,
              frame: evt.target
            });
          }.bind(this));


          if (e.detail.showUI) {
            // The identity flow is shown within the trusted UI.
            TrustedUIManager.open(navigator.mozL10n.get('persona-signin'), frame, this.trustedUILayerID);
          } else {
            var container = document.getElementById('screen');
            container.appendChild(frame);
            frame.classList.add('communication-frame');
            iframe = frame;
          }
          break;

        case 'received-id-assertion':
          if (e.detail.showUI) {
            TrustedUIManager.close(this.trustedUILayerID, null);
          }
          this._dispatchEvent({ id: chromeEventId });
          break;
      }
    },
    _dispatchEvent: function su_dispatchEvent(obj) {
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozContentEvent', true, true, obj);
      window.dispatchEvent(event);
    }
  };
})();

// Make sure L10n is ready before init
if (navigator.mozL10n.readyState == 'complete' ||
    navigator.mozL10n.readyState == 'interactive') {
  Identity.init();
} else {
  window.addEventListener('localized', Identity.init.bind(Identity));
}

