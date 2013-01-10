/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var RemoteDebugger = (function() {

  return {
    init: function() {
      window.addEventListener('mozChromeEvent', this);
    },

    handleEvent: function onMozChromeEvent(e) {
      if (e.detail.type !== 'remote-debugger-prompt') {
        return;
      }

      // Reusing the ModalDialog infrastructure.
      ModalDialog.showWithPseudoEvent({
        text: navigator.mozL10n.get('remoteDebuggerMessage'),
        type: 'confirm',
        callback: function() {
            RemoteDebugger._dispatchEvent(true);
          },
        cancel: function() {
            RemoteDebugger._dispatchEvent(false);
          }
      });
    },

    _dispatchEvent: function su_dispatchEvent(value) {
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozContentEvent', true, true,
                            { type: 'remote-debugger-prompt',
                              value: value });
      window.dispatchEvent(event);
    }
  };
})();

RemoteDebugger.init();
