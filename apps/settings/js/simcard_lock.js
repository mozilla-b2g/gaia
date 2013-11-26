/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SimPinLock = {
  dialog: document.getElementById('simpin-dialog'),
  simPinCheckBox: document.querySelector('#simpin-enabled input'),
  changeSimPinItem: document.getElementById('simpin-change'),
  changeSimPinButton: document.querySelector('#simpin-change button'),

  mobileConnection: null,

  updateSimCardStatus: function spl_updateSimStatus() {
    var cardStateMapping = {
      'null': 'noSimCard',
      'unknown': 'unknownSimCardState'
    };
    var cardStateL10nId = cardStateMapping[IccHelper.cardState || 'null'];
    if (cardStateL10nId) { // no SIM card
      this.simPinCheckBox.disabled = true;
      this.changeSimPinItem.hidden = true;
      return;
    }

    // with SIM card, query its status
    var self = this;
    var req = IccHelper.getCardLock('pin');
    req.onsuccess = function spl_checkSuccess() {
      var enabled = req.result.enabled;
      self.simPinCheckBox.disabled = false;
      self.simPinCheckBox.checked = enabled;
      self.changeSimPinItem.hidden = !enabled;
    };
  },

  init: function spl_init() {

    // XXX: check bug-926169
    // this is used to keep all tests passing while introducing multi-sim APIs
    this.mobileConnection = window.navigator.mozMobileConnection ||
      window.navigator.mozMobileConnections &&
        window.navigator.mozMobileConnections[0];

    if (!this.mobileConnection)
      return;

    if (!IccHelper)
      return;

    IccHelper.addEventListener('cardstatechange',
      this.updateSimCardStatus.bind(this));

    var self = this;
    var pinDialog = new SimPinDialog(this.dialog);

    this.simPinCheckBox.onchange = function spl_toggleSimPin() {
      var enabled = this.checked;
      switch (IccHelper.cardState) {
        case 'pukRequired':
          pinDialog.show('unlock_puk', {
            onsuccess: function() {
              // successful unlock puk will be in simcard lock enabled state
              self.simPinCheckBox.checked = true;
              self.updateSimCardStatus();
            },
            oncancel: function() {
              self.simPinCheckBox.checked = !enabled;
              self.updateSimCardStatus();
            }
          });
          break;
        default:
          pinDialog.show(enabled ? 'enable_lock' : 'disable_lock', {
            onsuccess: function() {
              self.updateSimCardStatus();
            },
            oncancel: function() {
              self.simPinCheckBox.checked = !enabled;
              self.updateSimCardStatus();
            }
          });
          break;
      }
    };
    this.changeSimPinButton.onclick = function spl_changePin() {
      pinDialog.show('change_pin');
    };

    this.updateSimCardStatus();
  }
};

navigator.mozL10n.ready(SimPinLock.init.bind(SimPinLock));

