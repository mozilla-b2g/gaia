/* exported DtmfTone */

'use strict';

/**
 * DTMF tone constructor, providing the SIM on which this tone will be played
 * is mandatory.
 *
 * @param {String} tone The tone to be played.
 * @param {Boolean} short True if this will be a short tone, false otherwise.
 * @param {Integer} serviceId The ID of the SIM card on which to play the tone.
 */
function DtmfTone(tone, short, serviceId) {
  this.tone = tone;
  this.short = short;
  this.serviceId = serviceId;
  this.timer = 0;
}

/**
 * Length of a short DTMF tone, currently 120ms.
 */
DtmfTone.kShortToneLength = 120;

DtmfTone.prototype = {
  /**
   * Starts playing the tone, if this is a short tone it will stop automatically
   * after kShortToneLength milliseconds, otherwise it will play until stopped.
   */
  play: function dt_play() {
    clearTimeout(this.timer);

    // Stop previous tone before dispatching a new one
    navigator.mozTelephony.stopTone(this.serviceId);
    navigator.mozTelephony.startTone(this.tone, this.serviceId);

    if (this.short) {
      this.timer = window.setTimeout(function dt_stopTone(serviceId) {
        navigator.mozTelephony.stopTone(serviceId);
      }, DtmfTone.kShortToneLength, this.serviceId);
    }
  },

  /**
   * Stop the DTMF tone, this is safe to call even if the DTMF tone has already
   * stopped.
   */
  stop: function dt_stop() {
    clearTimeout(this.timer);
    navigator.mozTelephony.stopTone(this.serviceId);
  }
};
