/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var PinLock = {
  get pinlockOverlay() {
    delete this.pinlockOverlay;
    return this.pinlockOverlay = document.getElementById('pinkeypadscreen');
  },

  pinCode: '',
  conn: undefined,

  init: function pl_init() {
    this.hideKeypad();
    this.conn = window.navigator.mozMobileConnection;
    if (!this.conn) {
      console.debug('No mozMobileConnection :(');
      return;
    }
    this.conn.addEventListener('cardstatechange', this);
    this.pinlockOverlay.addEventListener('click', this);
    this.handleSim();
  },

  hideKeypad: function hideKeypad() {
    this.pinlockOverlay.hidden = true;
  },

  showKeypad: function showKeypad() {
    this.pinlockOverlay.hidden = false;
    this.updateCodeUI();
  },

  reset: function reset() {
    this.pinCode = '';
    this.updateCodeUI();
  },

  unlockSim: function unlockSim() {
    if (!this.conn.cardState == 'pin_required') {
      console.log('No PIN code required.');
      this.reset();
      return;
    }

    if (!this.pinCode.length) {
      console.log("No PIN code provided, can't unlock.");
      return;
    }
    var unlock = this.conn.unlockCardLock({lockType: 'pin', pin: this.pinCode});
    var pinLock = this;
    unlock.onsuccess = function() {
      var res = unlock.result;
      /* whatever happens, we need to reset the status:
         we got a reponse from the SIM card, so either current
         PIN code is good and we will clear and exit, or it
         is not and there is no point in keeping it */
      pinLock.reset();
      console.log('Unlocking SIM: ' + res.result);
      if (res.result == true) {
        pinLock.hideKeypad();
      } else {
        console.log('Bad PIN code! Number of retries: ' + res.retryCount);
        this.notifyRetryCount(res.retryCount);
      }
    }
    this.reset();
  },

  handleSim: function handleSim() {
    // Currently we handle an unlocked sim and an absent sim in the same way.
    // This might change in the future.
    switch (this.conn.cardState) {
      case 'pin_required':
        this.pinCode = '';
        this.showKeypad();
        break;

      case 'ready':
      default:
        this.reset();
        this.hideKeypad();
        break;
    }
  },

  notifyRetryCount: function notifyRetryCount(retryCount) {
    var desc = document.getElementById('pinkeypadscreen-desc');
    desc.innerHTML = 'Bad PIN, retry (' + retryCount + ')';
  },

  updateCodeUI: function updateCodeUI() {
    var d = document.getElementById('pinkeypadscreen-display');
    d.innerHTML = '';
    for (var i = 0; i < this.pinCode.length; i++) {
      d.innerHTML += '¤';
    }
  },

  handleEvent: function pinlock_handleEvent(ev) {
    switch (ev.type) {
      case 'cardstatechange':
        this.handleSim();
        break;

      case 'click':
        switch (ev.target.dataset.key) {
          // Emergency
          case 'e':
            // XXX: TBD
            break;

          // Back
          case 'b':
            // Back one character
            this.pinCode = this.pinCode.substr(0, this.pinCode.length - 1);
            this.updateCodeUI();
            break;

          case 'o':
            if (!this.pinCode.length) {
              console.log('Cannot submit empty pincode!');
              break;
            }
            this.unlockSim();
            break;

          default:
            this.pinCode += ev.target.dataset.key;
            this.updateCodeUI();
            break;
        }
        break;

      default:
        console.log('Got unhandled event: ' + ev.type);
        break;
    }
  }
};
