'use strict';

/* exported CallHandler */
/* global KeypadManager */

var CallHandler = {
  _telephony: window.navigator.mozTelephony,

  call: function ch_call(number) {
    var sanitizedNumber = number.replace(/-/g, '');
    var telephony = this._telephony;
    if (telephony) {
      var callPromise = telephony.dialEmergency(sanitizedNumber);
      callPromise.then(function(call) {
        this._installHandlers(call);
      }.bind(this));
    }
  },

  _installHandlers: function(call) {
    if (call) {
      var cb = function clearPhoneView() {
        KeypadManager.updatePhoneNumber('');
      };
      call.onconnected = cb;

      call.ondisconnected = function callEnded() {
        cb();
      };
    }
  }
};
/** @global CallHandler */
window.CallHandler = CallHandler;

window.addEventListener('load', function onload() {
  /* Tell the audio channel manager that we want to adjust the "content"
   * channel when the user presses the volumeup/volumedown buttons. */
  if (navigator.mozAudioChannelManager) {
    navigator.mozAudioChannelManager.volumeControlChannel = 'content';
  }

  window.removeEventListener('load', onload);
  window.KeypadManager.init(/* oncall */ false);
});
