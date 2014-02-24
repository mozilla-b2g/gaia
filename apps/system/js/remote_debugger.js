'use strict';
/* global ScreenManager, ModalDialog */

(function(exports) {

  /**
   * RemoteDebugger displays a prompt asking the user if they want to enable
   * remote debugging on their device. This is generally called when the user
   * attempts to access the device from the App Manager.
   * @requires ModalDialog
   * @requires ScreenManager
   * @class RemoteDebugger
   */
  function RemoteDebugger() {
    window.addEventListener('mozChromeEvent', this);
  }

  RemoteDebugger.prototype = {

    /**
     * General event handler interface.
     * Displays the modal dialog when we needed.
     * @memberof RemoteDebugger.prototype
     * @param  {DOMEvent} evt The event.
     */
    handleEvent: function(e) {
      if (e.detail.type !== 'remote-debugger-prompt') {
        return;
      }

      // We want the user attention, so we need to turn the screen on
      // if it's off.
      if (!ScreenManager.screenEnabled) {
        ScreenManager.turnScreenOn();
      }

      // Reusing the ModalDialog infrastructure.
      ModalDialog.showWithPseudoEvent({
        text: navigator.mozL10n.get('remoteDebuggerMessage'),
        type: 'confirm',
        callback: this._dispatchEvent.bind(this, true),
        cancel: this._dispatchEvent.bind(this, false)
      });
    },

    /**
     * Dispatches an event based on the user selection of the modal dialog.
     * @memberof RemoteDebugger.prototype
     * @param  {Boolean} value True if the user enabled the remote debugger.
     */
    _dispatchEvent: function(value) {
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozContentEvent', true, true,
                            { type: 'remote-debugger-prompt',
                              value: value });
      window.dispatchEvent(event);
    }
  };

  exports.RemoteDebugger = RemoteDebugger;

}(window));
