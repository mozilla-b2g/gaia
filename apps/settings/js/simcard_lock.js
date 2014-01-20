/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global Template, SimPinDialog, SimPinLock, SettingsListener */

'use strict';

(function(exports) {

  var _ = window.navigator.mozL10n.get;

  var SimPinLock = {
    init: function() {
      // init
      var self = this;
      this.conns = window.navigator.mozMobileConnections;
      this.iccManager = window.navigator.mozIccManager;
      this.mozSettings = window.navigator.mozSettings;
      this.isAirplaneMode = false;
      this.setAllElements();
      this.simPinTemplate = new Template(this.simPinTmpl);
      this.simPinDialog = new SimPinDialog(this.dialog);

      // event handlers
      this.simPinContainer.addEventListener('click', this);
      this.addIccDetectedEvent();
      this.addIccUndetectedEvent();
      this.addAirplaneModeChangeEvent();

      // init UI
      var req = this.mozSettings.createLock().get('ril.radio.disabled');
      req.onsuccess = function() {
        self.isAirplaneMode = req.result['ril.radio.disabled'];
        self.initSimPinBackButton();
        self.initSimPinsUI();
        self.updateSimPinsUI();
        self.addChangeEventOnIccs();
      };
      req.onerror = function() {
        console.log('Error, cant access ril.radio.disabled');
        console.log('Initialize simcardLock failed');
      };
    },
    initSimPinBackButton: function() {
      // Because this panel is used in one-sim & two-sim structures,
      // the entry point of sim security is different.
      //
      // In this way, we have to make sure users can go back to the
      // right panel.
      if (this.isSingleSim()) {
        this.simPinBackButton.setAttribute('href', '#root');
      } else {
        this.simPinBackButton.setAttribute('href', '#sim-manager');
      }
    },
    initSimPinsUI: function() {
      var simPinHTMLs = [];

      Array.prototype.forEach.call(this.conns, function(conn, index) {
        var simPinIndex = index + 1;

        if (this.isSingleSim()) {
          simPinIndex = '';
        }

        simPinHTMLs.push(
          this.simPinTemplate.interpolate({
            'sim-index': index.toString(),
            'sim-name': _('simPinWithIndex', { 'index': simPinIndex })
          })
        );
      }.bind(this));

      this.simPinContainer.innerHTML = simPinHTMLs.join('');
    },
    updateSimPinUI: function(cardIndex) {
      var iccId = this.conns[cardIndex].iccId;
      var icc = this.iccManager.getIccById(iccId);

      var changeSimPinItem =
        this.simPinContainer.querySelector('.simpin-change-' + cardIndex);

      var simPinCheckbox =
        this.simPinContainer.querySelector('.simpin-enabled-' +
          cardIndex + ' input');

      var isSimAvailable = icc && icc.cardState && icc.cardState !== 'unknown';

      // when fugu is in airplane mode, icc.cardState will not be changed ...
      // in this way, we have to use isAirplaneMode to check this situation
      if (!isSimAvailable || this.isAirplaneMode) {
        simPinCheckbox.disabled = true;
        changeSimPinItem.hidden = true;
        return;
      }

      // with SIM card, query its status
      var req = icc.getCardLock('pin');
      req.onsuccess = function() {
        var enabled = req.result.enabled;
        simPinCheckbox.disabled = false;
        simPinCheckbox.checked = enabled;
        changeSimPinItem.hidden = !enabled;
      };
      req.onerror = function() {
        console.log('onerror');
        console.log('cardIndex', cardIndex);
      };
    },
    updateSimPinsUI: function() {
      Array.prototype.forEach.call(this.conns, function(simcard, cardIndex) {
        this.updateSimPinUI(cardIndex);
      }.bind(this));
    },
    updateSimSecurityDescUI: function(enabled) {
      window.navigator.mozL10n.localize(this.simSecurityDesc, enabled ?
        'enabled' : 'disabled');
      this.simSecurityDesc.dataset.l10nId = enabled ? 'enabled' : 'disabled';
    },
    handleEvent: function(evt) {
      var target = evt.target;
      var cardIndex = target.dataset && target.dataset.simIndex;
      var type = target.dataset && target.dataset.type;
      var self = this;

      switch (type) {
        case 'checkSimPin':
          this.checkSimPin(target, cardIndex);
          break;

        case 'changeSimPin':
          // TODO:
          // remember to update SimPinDialog for DSDS structure
          this.simPinDialog.show('change_pin', {
            cardIndex: cardIndex,
            // show toast after user successfully change pin
            onsuccess: function toastOnSuccess() {
              var toast;
              if (self.isSingleSim()) {
                toast = {
                  messageL10nId: 'simPinChangedSuccessfully',
                  latency: 3000,
                  useTransition: true
                };
              } else {
                toast = {
                  messageL10nId: 'simPinChangedSuccessfullyWithIndex',
                  messageL10nArgs: {'index': cardIndex + 1},
                  latency: 3000,
                  useTransition: true
                };
              }
              Toaster.showToast(toast);
            }
          });
          break;
      }
    },
    checkSimPin: function(checkbox, cardIndex) {
      var enabled = checkbox.checked;
      var self = this;

      var iccId = this.conns[cardIndex].iccId;
      var icc = this.iccManager.getIccById(iccId);

      switch (icc.cardState) {
        case 'pukRequired':
          this.simPinDialog.show('unlock_puk', {
            cardIndex: cardIndex,
            onsuccess: function() {
              // successful unlock puk will be in simcard lock enabled state
              checkbox.checked = true;
              self.updateSimPinUI(cardIndex);
              self.updateSimSecurityDescUI(true);
            },
            oncancel: function() {
              checkbox.checked = !enabled;
              self.updateSimPinUI(cardIndex);
            }
          });
          break;
        default:
          var action = enabled ? 'enable_lock' : 'disable_lock';
          this.simPinDialog.show(action, {
            cardIndex: cardIndex,
            onsuccess: function() {
              self.updateSimSecurityDescUI(enabled);
              self.updateSimPinUI(cardIndex);
            },
            oncancel: function() {
              checkbox.checked = !enabled;
              self.updateSimPinUI(cardIndex);
            }
          });
          break;
      }
    },
    setAllElements: function() {
      this.dialog = document.getElementById('simpin-dialog');
      this.simPinTmpl = document.getElementById('simpin-tmpl');
      this.simPinContainer = document.getElementById('simpin-container');
      this.simPinBackButton = document.getElementById('simpin-back');
      this.simSecurityDesc = document.getElementById('simCardLock-desc');
    },
    addIccDetectedEvent: function() {
      // if there is a change that icc instance is available
      // we can update its cardstatus to make it reflect the
      // real world.
      this.iccManager.addEventListener('iccdetected', function(evt) {
        var iccId = evt.iccId;
        var icc = self.iccManager.getIccById(iccId);

        if (icc) {
          var cardIndex = self.getCardIndexByIccId(iccId);

          // we have to update its status and add change event
          // for it to make it reflect status on to UI
          self.updateSimPinUI(cardIndex);
          self.addChangeEventOnIccByIccId(iccId);
        }
      });
    },
    addIccUndetectedEvent: function() {
      // if there is a change that icc instance is not available
      // we have to update all cards' status
      this.iccManager.addEventListener('iccundetected', function(evt) {
        self.updateSimPinsUI();
      });
    },
    addAirplaneModeChangeEvent: function() {
      var self = this;
      this.mozSettings.addObserver('ril.radio.disabled', function(evt) {
        self.isAirplaneMode = evt.settingValue;
        self.updateSimPinsUI();
      });
    },
    addChangeEventOnIccs: function() {
      for (var i = 0; i < this.conns.length; i++) {
        var iccId = this.conns[i].iccId;
        var icc = this.iccManager.getIccById(iccId);
        if (icc) {
          this.addChangeEventOnIccByIccId(iccId);
        }
      }
    },
    addChangeEventOnIccByIccId: function(iccId) {
      var self = this;
      var icc = this.iccManager.getIccById(iccId);
      if (icc) {
        icc.addEventListener('cardstatechange', function() {
          var cardIndex = self.getCardIndexByIccId(iccId);
          self.updateSimPinUI(cardIndex);
        });
      }
    },
    getCardIndexByIccId: function(iccId) {
      var cardIndex;
      for (var i = 0; i < this.conns.length; i++) {
        if (this.conns[i].iccId == iccId) {
          cardIndex = i;
        }
      }
      return cardIndex;
    },
    isSingleSim: function() {
      return this.conns.length == 1;
    }
  };

  exports.SimPinLock = SimPinLock;

})(window);

navigator.mozL10n.ready(SimPinLock.init.bind(SimPinLock));

