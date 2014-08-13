'use strict';

/* exported CallHandler */
/* global KeypadManager */

var CallHandler = {
  _telephony: window.navigator.mozTelephony,
  _emergencyAlert: document.getElementById('emergencyAlert'),
  _emergencyMsg: document.getElementById('emergencyAlert-msg'),
  _emergencyAlertBtn: document.getElementById('emergencyAlert-btn'),

  init: function init() {
    this._emergencyAlertBtn.addEventListener('click', function(){
      this._emergencyAlert.hidden = true;
    }.bind(this));
  },

  call: function ch_call(number) {
    var sanitizedNumber = number.replace(/-/g, '');
    var telephony = this._telephony;
    if (telephony) {
      /* XXX: Temporary fix to handle old and new telephony API
         To remove when bug 969218 lands */
      var promiseOrCall = telephony.dialEmergency(sanitizedNumber);
      if (promiseOrCall && promiseOrCall.then) {
        promiseOrCall.then(function(call) {
          this._installHandlers(call);
        }.bind(this)).catch(function(errorName) {
          navigator.mozL10n.ready(function() {
            var _ = navigator.mozL10n.get;
            this._emergencyMsg.textContent = _('emergency-call-error',
                                               {number: sanitizedNumber});
            this._emergencyAlert.hidden = false;
          }.bind(this));
        }.bind(this));
      } else {
        this._installHandlers(promiseOrCall);
      }
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

window.addEventListener('load', function onload() {
  window.removeEventListener('load', onload);
  KeypadManager.init();
  CallHandler.init();
});
