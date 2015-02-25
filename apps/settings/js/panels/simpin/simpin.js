define(function(require) {
  'use strict';

  var _ = window.navigator.mozL10n.get;
  var AirplaneModeHelper = require('shared/airplane_mode_helper');
  var SIMSlotManager = require('shared/simslot_manager');
  var SimPinDialog = require('simcard_dialog');
  var Template = require('shared/template');
  var Toaster = require('shared/toaster');

  var SimPin = function(elements) {
    this._elements = elements;
  };

  SimPin.prototype = {
    init: function simpin_init() {
      AirplaneModeHelper.ready(() => {
        this.conns = window.navigator.mozMobileConnections;
        this.iccManager = window.navigator.mozIccManager;
        this.isAirplaneMode = (AirplaneModeHelper.getStatus() === 'enabled');
        this.simPinTemplate = new Template(this._elements.simPinTmpl);
        this.simPinDialog = new SimPinDialog(this._elements.dialog);

        this._elements.simPinContainer.addEventListener('click', this);
        this.addIccDetectedEvent();
        this.addIccUndetectedEvent();
        this.addAirplaneModeChangeEvent();

        this.initSimPinBack();
        this.initSimPinsUI();
        this.updateSimPinsUI();
        this.addChangeEventOnIccs();
      });
    },
    initSimPinBack: function simpin_initSimPinBack() {
      // Because this panel is used in one-sim & two-sim structures,
      // the entry point of sim security is different.
      //
      // In this way, we have to make sure users can go back to the
      // right panel.
      this._elements.simPinHeader.dataset.href = SIMSlotManager.isMultiSIM() ?
        '#sim-manager': '#root';
    },
    initSimPinsUI: function simpin_initSimPinsUI() {
      var simPinHTMLs = [];

      [].forEach.call(this.conns, (conn, index) => {
        var simPinIndex = index + 1;

        if (!SIMSlotManager.isMultiSIM()) {
          simPinIndex = '';
        }

        simPinHTMLs.push(
          this.simPinTemplate.interpolate({
            'sim-index': index.toString(),
            'sim-name': _('simPinWithIndex', { 'index': simPinIndex }),
            'change-sim-label': _('changeSimPin')
          })
        );
      });

      this._elements.simPinContainer.innerHTML = simPinHTMLs.join('');
    },
    updateSimPinUI: function simpin_updateSimPinUI(cardIndex) {
      var iccId = this.conns[cardIndex].iccId;
      var icc = this.iccManager.getIccById(iccId);

      var changeSimPinItem =
        this._elements.simPinContainer.querySelector(
          '.simpin-change-' + cardIndex);

      var simPinCheckbox =
        this._elements.simPinContainer.querySelector(
          '.simpin-enabled-' + cardIndex + ' input');

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
    updateSimPinsUI: function simpin_updateSimPinsUI() {
      [].forEach.call(this.conns, (simcard, cardIndex) => {
        this.updateSimPinUI(cardIndex);
      });
    },
    handleEvent: function simpin_handleEvent(evt) {
      var target = evt.target;
      var cardIndex = target.dataset && target.dataset.simIndex;
      var type = target.dataset && target.dataset.type;

      // We need number type
      cardIndex = parseInt(cardIndex, 10);

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
              if (SIMSlotManager.isMultiSIM()) {
                toast = {
                  messageL10nId: 'simPinChangedSuccessfullyWithIndex',
                  messageL10nArgs: {'index': +(cardIndex) + 1},
                  latency: 3000,
                  useTransition: true
                };
              } else {
                toast = {
                  messageL10nId: 'simPinChangedSuccessfully',
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
    checkSimPin: function simpin_checkSimPin(checkbox, cardIndex) {
      var enabled = checkbox.checked;
      var iccId = this.conns[cardIndex].iccId;
      var icc = this.iccManager.getIccById(iccId);

      switch (icc.cardState) {
        case 'pukRequired':
          this.simPinDialog.show('unlock_puk', {
            cardIndex: cardIndex,
            onsuccess: () => {
              // successful unlock puk will be in simcard lock enabled state
              checkbox.checked = true;
              this.updateSimPinUI(cardIndex);
            },
            oncancel: () => {
              checkbox.checked = !enabled;
              this.updateSimPinUI(cardIndex);
            }
          });
          break;
        default:
          var action = enabled ? 'enable_lock' : 'disable_lock';
          this.simPinDialog.show(action, {
            cardIndex: cardIndex,
            onsuccess: () => {
              this.updateSimPinUI(cardIndex);
            },
            oncancel: () => {
              checkbox.checked = !enabled;
              this.updateSimPinUI(cardIndex);
            }
          });
          break;
      }
    },
    addIccDetectedEvent: function simpin_addIccDetectedEvent() {
      // if there is a change that icc instance is available
      // we can update its cardstatus to make it reflect the
      // real world.
      this.iccManager.addEventListener('iccdetected', (evt) => {
        var iccId = evt.iccId;
        var icc = this.iccManager.getIccById(iccId);

        if (icc) {
          var cardIndex = this.getCardIndexByIccId(iccId);

          // we have to update its status and add change event
          // for it to make it reflect status on to UI
          this.updateSimPinUI(cardIndex);
          this.addChangeEventOnIccByIccId(iccId);
        }
      });
    },
    addIccUndetectedEvent: function simpin_addIccDetectedEvent() {
      // if there is a change that icc instance is not available
      // we have to update all cards' status
      this.iccManager.addEventListener('iccundetected', (evt) => {
        this.updateSimPinsUI();
      });
    },
    addAirplaneModeChangeEvent: function simpin_addAirplaneModeChangeEvent() {
      AirplaneModeHelper.addEventListener('statechange', (status) => {
        this.isAirplaneMode = (status === 'enabled');
        this.updateSimPinsUI();
      });
    },
    addChangeEventOnIccs: function simpin_addChangeEventOnIccs() {
      for (var i = 0; i < this.conns.length; i++) {
        var iccId = this.conns[i].iccId;
        var icc = this.iccManager.getIccById(iccId);
        if (icc) {
          this.addChangeEventOnIccByIccId(iccId);
        }
      }
    },
    addChangeEventOnIccByIccId:
      function simpin_addChangeEventOnIccByIccId(iccId) {
        var icc = this.iccManager.getIccById(iccId);
        if (icc) {
          icc.addEventListener('cardstatechange', () => {
            var cardIndex = this.getCardIndexByIccId(iccId);
            this.updateSimPinUI(cardIndex);
          });
        }
    },
    getCardIndexByIccId: function simpin_getCardIndexByIccId(iccId) {
      var cardIndex;
      for (var i = 0; i < this.conns.length; i++) {
        if (this.conns[i].iccId == iccId) {
          cardIndex = i;
        }
      }
      return cardIndex;
    }
  };

  return function ctor_simpin(elements) {
    return new SimPin(elements);
  };
});
