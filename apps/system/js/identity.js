/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

// When bug 794999 is resolved, switch to use the abstract Trusted UI Component

'use strict';

const kIdentityScreen = 'https://notoriousb2g.personatest.org/sign_in#NATIVE';
const kIdentityFrame = 'https://notoriousb2g.personatest.org/communication_iframe';

var Identity = (function() {
  var iframe;

  return {
    chromeEventId: null,

    init: function() {
      window.addEventListener('mozChromeEvent', this);
    },

    handleEvent: function onMozChromeEvent(e) {
      // We save the mozChromeEvent identifiers to send replies back from content
      // with this exact value.
      this.chromeEventId = e.detail.id;
      if (!this.chromeEventId)
        return;

      switch (e.detail.type) {
        // Chrome asks Gaia to show the identity dialog.
        case 'open-id-dialog':
          if (!e.detail.showUI && iframe) {
            this._dispatchEvent({
              id: this.chromeEventId,
              frame: iframe
            });
            return;
          }
          var frame = document.createElement('iframe');
          frame.setAttribute('mozbrowser', 'true');
          frame.setAttribute('remote', true);
          frame.classList.add('screen');
          frame.src = e.detail.showUI ? kIdentityScreen : kIdentityFrame;
          frame.addEventListener('mozbrowserloadstart', function loadStart(evt) {
            // After creating the new frame containing the identity
            // flow, we send it back to chrome so the identity callbacks can be
            // injected.
            this._dispatchEvent({
              id: this.chromeEventId,
              frame: evt.target
            });
          }.bind(this));


          if (e.detail.showUI) {
            // The identity flow is shown within the trusted UI.
            TrustedUIManager.open('IdentityFlow', frame, this.chromeEventId);
          } else {
            var container = document.getElementById('screen');
            container.appendChild(frame);
            frame.classList.add('communication-frame');
            iframe = frame;
          }
          break;

        case 'received-id-assertion':
          if (e.detail.showUI) {
            TrustedUIManager.close(null);
          }
          this._dispatchEvent({ id: this.chromeEventId });
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

Identity.init();
