/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SimPinLock = {
  simSecurityDesc: document.getElementById('simCardLock-desc'),
  simPinCheckBox: document.querySelector('#simpin-enabled input'),
  changeSimPinItem: document.getElementById('simpin-change'),
  changeSimPinButton: document.querySelector('#simpin-change button'),

  mobileConnection: null,

  updateSimCardStatus: function spl_updateSimStatus() {
    var cardStateMapping = {
      'null': 'simCardNotReady',
      'unknown': 'unknownSimCardState',
      'absent': 'noSimCard'
    };
    var cardStateL10nId = cardStateMapping[IccHelper.cardState || 'null'];
    if (cardStateL10nId) { // no SIM card
      localize(simSecurityDesc, cardStateL10nId);
      this.simPinCheckBox.disabled = true;
      this.changeSimPinItem.hidden = true;
      return;
    }

    // with SIM card, query its status
    var self = this;
    var req = IccHelper.getCardLock('pin');
    req.onsuccess = function spl_checkSuccess() {
      var enabled = req.result.enabled;
      localize(self.simSecurityDesc, (enabled ? 'enabled' : 'disabled'));
      self.simPinCheckBox.disabled = false;
      self.simPinCheckBox.checked = enabled;
      self.changeSimPinItem.hidden = !enabled;
    };
  },

  init: function spl_init() {
    this.mobileConnection = window.navigator.mozMobileConnection;
    if (!this.mobileConnection)
      return;

    if (!IccHelper.enabled)
      return;

    IccHelper.addEventListener('cardstatechange',
      this.updateSimCardStatus.bind(this));

    var self = this;
    this.simPinCheckBox.onchange = function spl_toggleSimPin() {
      switch (IccHelper.cardState) {
        case 'pukRequired':
          var enabled = this.checked;
          SimPinDialog.show('unlock',
            function() {
              // successful unlock puk will be in simcard lock enabled state
              self.simPinCheckBox.checked = true;
              self.updateSimCardStatus();
            },
            function() {
              self.simPinCheckBox.checked = !enabled;
              self.updateSimCardStatus();
            },
            Settings.currentPanel
          );
          break;
        default:
          var enabled = this.checked;
          SimPinDialog.show('enable',
            function() {
              self.updateSimCardStatus();
            },
            function() {
              self.simPinCheckBox.checked = !enabled;
              self.updateSimCardStatus();
            },
            Settings.currentPanel
          );
          break;
      }
    };
    this.changeSimPinButton.onclick = function spl_changePin() {
      SimPinDialog.show('changePin', null, null, Settings.currentPanel);
    };

    this.updateSimCardStatus();
  }
};

navigator.mozL10n.ready(SimPinLock.init.bind(SimPinLock));

