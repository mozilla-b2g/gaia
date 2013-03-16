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
    var _ = navigator.mozL10n.get;

    if (this.mobileConnection.cardState === 'absent') {
      this.simSecurityDesc.textContent = _('noSimCard');
      this.simPinCheckBox.disabled = true;
      this.changeSimPinItem.hidden = true;
      return;
    }
    // with SIM card, query its status
    var self = this;
    var req = this.mobileConnection.getCardLock('pin');
    req.onsuccess = function spl_checkSuccess() {
      var enabled = req.result.enabled;
      self.simSecurityDesc.textContent = (enabled) ?
        _('enabled') : _('disabled');
      self.simPinCheckBox.disabled = false;
      self.simPinCheckBox.checked = enabled;
      self.changeSimPinItem.hidden = !enabled;
    };
  },

  init: function spl_init() {
    this.mobileConnection = window.navigator.mozMobileConnection;
    if (!this.mobileConnection)
      return;

    this.mobileConnection.addEventListener('cardstatechange',
      this.updateSimCardStatus.bind(this));

    var self = this;
    this.simPinCheckBox.onchange = function spl_toggleSimPin() {
      switch (self.mobileConnection.cardState) {
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
            document.location.hash
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
            document.location.hash
          );
          break;
      }
    };
    this.changeSimPinButton.onclick = function spl_changePin() {
      SimPinDialog.show('changePin', null, null, document.location.hash);
    };

    this.updateSimCardStatus();
  }
};

navigator.mozL10n.ready(SimPinLock.init.bind(SimPinLock));

