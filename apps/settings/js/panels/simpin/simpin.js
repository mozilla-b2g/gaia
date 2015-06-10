define(function(require) {
  'use strict';

  var _ = window.navigator.mozL10n.get;
  var AirplaneModeHelper = require('shared/airplane_mode_helper');
  var SIMSlotManager = require('shared/simslot_manager');
  var DialogService = require('modules/dialog_service');
  var Sanitizer = require('shared/sanitizer');
  var Toaster = require('shared/toaster');
  var SimSecurity = require('modules/sim_security');

  var SimPin = function(elements) {
    this._elements = elements;
  };

  SimPin.prototype = {
    init: function simpin_init() {
      AirplaneModeHelper.ready(() => {
        this.conns = window.navigator.mozMobileConnections;
        this.iccManager = window.navigator.mozIccManager;
        this.isAirplaneMode = (AirplaneModeHelper.getStatus() === 'enabled');

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
    simPinView: function({simIndex, simName, changeSimLabel}) {
      return Sanitizer.escapeHTML `
        <li class="simpin-enabled simpin-enabled-${simIndex}
          simpin-${simIndex}">
          <label class="pack-switch">
            <input type="checkbox" data-ignore data-sim-index="${simIndex}"
              data-type="checkSimPin"/>
            <span>${simName}</span>
        </label>
        </li>
        <li class="simpin-change simpin-change-${simIndex} simpin-${simIndex}"
          hidden>
          <a class="menu-item" href="#" data-sim-index="${simIndex}"
            data-type="changeSimPin">
            <span data-l10n-id="changeSimPin">${changeSimLabel}</span>
          </a>
        </li>`;
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
          this.simPinView({
            'simIndex': index.toString(),
            'simName': _('simPinWithIndex', { 'index': simPinIndex }),
            'changeSimLabel': _('changeSimPin')
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
        return Promise.resolve();
      }

      // with SIM card, query its status
      return SimSecurity.getCardLock(cardIndex, 'pin').then((result) => {
        var enabled = result.enabled;
        simPinCheckbox.disabled = false;
        simPinCheckbox.checked = enabled;
        changeSimPinItem.hidden = !enabled;
      }, () => {
        console.log('onerror');
        console.log('cardIndex', cardIndex);
      });
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
          this.changeSimPin(cardIndex);
          break;
      }
    },
    checkSimPin: function simpin_checkSimPin(checkbox, cardIndex) {
      var enabled = checkbox.checked;
      var iccId = this.conns[cardIndex].iccId;
      var icc = this.iccManager.getIccById(iccId);

      switch (icc.cardState) {
        case 'pukRequired':
          return DialogService.show('simpin-dialog', {
            method: 'unlock_puk',
            cardIndex: cardIndex
          }).then((result) => {
            var type = result.type;
            if (type === 'submit') {
              // successful unlock puk will be in simcard lock enabled state
              checkbox.checked = true;
              this.updateSimPinUI(cardIndex);
            } else {
              checkbox.checked = !enabled;
              this.updateSimPinUI(cardIndex);
            }
          });
        default:
          var action = enabled ? 'enable_lock' : 'disable_lock';
          return DialogService.show('simpin-dialog', {
            method: action,
            cardIndex: cardIndex
          }).then((result) => {
            var type = result.type;
            if (type === 'submit') {
              this.updateSimPinUI(cardIndex);
            } else {
              checkbox.checked = !enabled;
              this.updateSimPinUI(cardIndex);
            }
          });
      }
    },
    changeSimPin: function(cardIndex) {
      return DialogService.show('simpin-dialog', {
        method: 'change_pin',
        cardIndex: cardIndex
      }).then(function(result) {
        var type = result.type;
        if (type === 'submit') {
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
