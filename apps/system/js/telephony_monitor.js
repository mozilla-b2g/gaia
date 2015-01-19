/* global BaseModule */
'use strict';

(function() {
  var TelephonyMonitor = function(telephony) {
    this.telephony = telephony;
  };
  TelephonyMonitor.STATES = [
    'inCall',
    'hasActiveCall'
  ];
  BaseModule.create(TelephonyMonitor, {
    name: 'TelephonyMonitor',
    inCall: false,
    /**
     * Check if there is active call
     * @param  {Number}  index If not specified, it means any active call;
     *         if specified, it means the active call at this SIM slot.
     * @return {Boolean} There is active call or not.
     */
    hasActiveCall: function(index) {
      if (index) {
        return this.telephony.active &&
               this.telephony.active.serviceId === index;
      } else {
        return !!this.telephony.active;
      }
    },
    handleEvent: function(evt) {
      this.inCall = this.telephony.calls.length > 0;
      this.publish('callschanged', {
        detail: evt.detail
      });
    },
    _start: function() {
      this.telephony.addEventListener('callschanged', this);
    },
    _stop: function() {
      this.telephony.removeEventListener('callschanged', this);
    }
  });
}());
