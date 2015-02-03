/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const kIdentityScreen = '/sign_in#NATIVE';
const kIdentityFrame = '/communication_iframe';

var Identity = (function() {
  var iframe;

  return {
    trustedUILayers: {},

    init: function() {
      window.addEventListener('mozChromeEvent', this);
    },

    handleEvent: function onMozChromeEvent(e) {
      var chromeEventId = e.detail.id;
      var personaUri = e.detail.uri;
      var requestId = e.detail.requestId;
      switch (e.detail.type) {
        // Chrome asks Gaia to show the identity dialog.
        case 'id-dialog-open':
          if (!chromeEventId) {
            return;
          }
          // When opening the dialog, we record the chrome event id, which
          // we will need to send back to the TrustedWindowManager when asking
          // to close.
          this.trustedUILayers[requestId] = chromeEventId;

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
          frame.src = personaUri +
            (e.detail.showUI ? kIdentityScreen : kIdentityFrame);
          frame.dataset.url = frame.src;
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
            // We need to tell the chrome side about the user manually closing
            // the identity flow so the mozId API can notify to the caller about
            // the flow being canceled.
            var ontrustedclosed = (function(event) {
              if (!event.detail ||
                  !event.detail.config ||
                  !event.detail.config.requestId) {
                return;
              }
              window.removeEventListener('trustedclosed', ontrustedclosed);
              this._dispatchEvent({
                id: event.detail.config.requestId,
                type: 'cancel',
                errorMsg: 'DIALOG_CLOSED_BY_USER'
              });
            }).bind(this);
            window.addEventListener('trustedclosed', ontrustedclosed);

            window.dispatchEvent(new CustomEvent('launchtrusted', {
              detail: {
                name: navigator.mozL10n.get('persona-signin'),
                frame: frame,
                requestId: requestId,
                chromeId: chromeEventId
              }
            }));
          } else {
            var container = document.getElementById('screen');
            container.appendChild(frame);
            frame.classList.add('communication-frame');
            iframe = frame;
          }
          break;

        case 'id-dialog-done':
          if (e.detail.showUI) {
            window.dispatchEvent(new CustomEvent('killtrusted', {
              detail: {
                requestId: requestId,
                chromeId: chromeEventId
              }
            }));
          }
          this._dispatchEvent({ id: chromeEventId });
          break;

        case 'id-dialog-close-iframe':
          if (iframe) {
            iframe.parentNode.removeChild(iframe);
            iframe = null;
          }
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

// unit tests call init() manually
if (navigator.mozL10n) {
  navigator.mozL10n.once(Identity.init.bind(Identity));
}
