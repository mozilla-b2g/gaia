/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var PinLock = {
  get pinlockOverlay() {
    delete this.pinlockOverlay;
    return this.pinlockOverlay = document.getElementById('pinkeypadscreen');
  },

  hasPincode: false,
  pinCode: "1234",
  conn: undefined,

  init: function pl_init() {
    this.hideKeypad();
    this.conn = window.navigator.mozMobileConnection;
    if (!this.conn) {
      console.debug("No mozMobileConnection :(");
      return;
    }
    this.conn.addEventListener('cardstatechange', this);
    this.pinlockOverlay.addEventListener('click', this);
    this.handleSim();
  },

  hideKeypad: function hideKeypad() {
    this.pinlockOverlay.style.display = "none";
  },

  showKeypad: function showKeypad() {
    this.pinlockOverlay.style.display = "block";
    this.updateCodeUi();
  },

  reset: function reset() {
    this.hasPincode = false;
    this.pinCode = "";
  },

  unlockSim: function unlockSim() {
    if (!this.conn.cardState == 'pin_required') {
      console.log("No PIN code required.");
      this.reset();
      return;
    }

    if (this.hasPincode) {
      var unlock = this.conn.unlockCardLock({lockType: "pin", pin: this.pinCode});
      var pinLock = this;
      unlock.onsuccess = function () {
        var res = unlock.result;
        console.log("Unlocking SIM: " + res.result);
        if (res.result == true) {
          pinLock.reset();
          pinLock.hideKeypad();
        }
      }
    } else {
      console.log("No PIN code provided, can't unlock.");
    }

    this.reset();
  },

  handleSim: function handleSim() {
    console.log("Ready to handle SIM lock.");
    if (this.conn.cardState == 'pin_required') {
      console.log("SIM is locked, unlocking ...");
      this.hasPincode = false;
      this.pinCode = "";
      this.showKeypad();
    }
  },

  updateCodeUi: function updateCodeUi() {
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
            // Back to lock screen
            if (!this.pinCode) {
              break;
            }

            // Back one character
            this.pinCode = this.pinCode.substr(0, this.pinCode.length - 1);
            this.updateCodeUi();
            break;

          case 'o':
            if (this.pinCode.length > 0) {
              this.hasPincode = true;
              this.unlockSim();
            } else {
              console.log("Cannot submit empty pincode!");
            }
            break;

          default:
            this.pinCode += ev.target.dataset.key;
            this.updateCodeUi();
            break;
        }
        break;

      default:
        console.log("Got unhandled event: " + ev.type);
        break;
    }
  },
};
