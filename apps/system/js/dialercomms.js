'use strict';
/* global IACHandler */

(function(exports) {

  /**
   * DialerComms allows the user to stop the ringtone from playing
   * by interacting with the hardware. When the user presses the sleep
   * or volumedown button, the ringtone will stop playing.
   * @class DialerComms
   * @requires IACHandler
   */
  function DialerComms() {
    window.addEventListener('sleep', this.stopRingtone);
    window.addEventListener('volumedown', this.stopRingtone);
  }

  DialerComms.prototype = {

    /**
     * Notifies the dialer app that the system requests the ringtone
     * stop playing. Posts a stop_ringtone message to the dialercomms port.
     * @memberof DialerComms.prototype
     * @param  {DOMEvent} evt The event.
     */
    stopRingtone: function() {
      var port = IACHandler.getPort('dialercomms');
      if (!port) {
        return;
      }

      port.postMessage('stop_ringtone');
    }
  };

  exports.DialerComms = DialerComms;

})(window);
