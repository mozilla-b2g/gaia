/* exported SimCardManager */
/* global Template, SimUIModel,
   SimSettingsHelper, MobileOperator, SimCardManager,
   AirplaneModeHelper, localize */

'use strict';

(function(exports) {

  var _ = window.navigator.mozL10n.get;

  /*
   * SimCardManager is responsible for
   *   1. handling simcard UI
   *   2. handling simcard virtual status (please refer SimUIModel class)
   *   3. handling related mozSettings (please refer SimSettingsHelper class)
   */
  var SimCardManager = {
    init: function() {
      // we store all SimUIModel instances into this array
      this.simcards = [];
      this.isAirplaneMode = false;

      // init DOM related stuffs
      this.setAllElements();
      this.simItemTemplate = new Template(this.simCardTmpl);

      // `handleEvent` is used to handle these sim related changes
      this.simManagerOutgoingCallSelect.addEventListener('change', this);
      this.simManagerOutgoingMessagesSelect.addEventListener('change', this);

      // XXX because we handle `onchange` event differently in value selector,
      // in order to show confirm dialog after users changing value, the better
      // way right now is to check values when `onblur` event triggered.
      this.addOutgoingDataSelectEvent();

      this.addVoiceChangeEventOnConns();
      this.addCardStateChangeEventOnIccs();
      this.addLocalizedChangeEventOnIccs();

      // because in fugu, airplaneMode will not change cardState
      // but we still have to make UI consistent. In this way,
      // when airplaneMode is on in fugu, we have to mimic the nosim
      // situation in single sim.
      this.addAirplaneModeChangeEvent();

      // init UI
      this.isAirplaneMode =
        AirplaneModeHelper.getStatus() === 'enabled' ? true : false;
      this.initSimCardsInfo();
      this.initSimCardManagerUI();
    },
    initSimCardsInfo: function() {
      var conns = window.navigator.mozMobileConnections;

      for (var cardIndex = 0; cardIndex < conns.length; cardIndex++) {
        var conn = conns[cardIndex];
        var iccId = conn.iccId;
        var simcard = new SimUIModel(cardIndex);
        this.simcards.push(simcard);
        this.updateCardState(cardIndex, iccId);
      }
    },
    handleEvent: function(evt) {

      var cardIndex = evt.target.value;

      // it means users is seleting '--' options
      // when simcards are all disabled
      if (cardIndex == SimSettingsHelper.EMPTY_OPTION_VALUE) {
        return;
      }

      switch (evt.target) {
        case this.simManagerOutgoingCallSelect:
          SimSettingsHelper.setServiceOnCard('outgoingCall', cardIndex);
          break;

        case this.simManagerOutgoingMessagesSelect:
          SimSettingsHelper.setServiceOnCard('outgoingMessages', cardIndex);
          break;
      }
    },
    addOutgoingDataSelectEvent: function() {
      var prevCardIndex;
      var newCardIndex;

      // initialize these two variables when focus
      this.simManagerOutgoingDataSelect.addEventListener('focus', function() {
          prevCardIndex = this.selectedIndex;
          newCardIndex = this.selectedIndex;
      });

      this.simManagerOutgoingDataSelect.addEventListener('blur', function() {
          newCardIndex = this.selectedIndex;
          if (prevCardIndex !== newCardIndex) {
            // UX needs additional hint for users to make sure
            // they really want to change data connection
            var wantToChange =
              window.confirm(_('change-outgoing-data-confirm'));

            if (wantToChange) {
              SimSettingsHelper.setServiceOnCard('outgoingData',
                newCardIndex);
            } else {
              this.selectedIndex = prevCardIndex;
            }
          }
      });
    },
    getSimCardsCount: function() {
      return this.simcards.length;
    },
    getSimCardInfo: function(cardIndex) {
      return this.simcards[cardIndex].getInfo();
    },
    getSimCard: function(cardIndex) {
      return this.simcards[cardIndex];
    },
    updateSimCardsUI: function() {
      this.simcards.forEach(function(simcard, cardIndex) {
        this.updateSimCardUI(cardIndex);
      }.bind(this));
    },
    updateSimCardUI: function(cardIndex) {
      var simcardInfo = this.getSimCardInfo(cardIndex);
      var selectors = ['name', 'number', 'operator'];

      var cardSelector = '.sim-card-' + cardIndex;

      var cardDom =
        this.simCardContainer.querySelector(cardSelector);

      // reflect cardState on UI
      cardDom.classList.toggle('absent', simcardInfo.absent);
      cardDom.classList.toggle('locked', simcardInfo.locked);
      cardDom.classList.toggle('enabled', simcardInfo.enabled);

      // we are in three rows now, we have to fix styles
      cardDom.classList.toggle('with-number', !!simcardInfo.number);

      // relflect wordings on UI
      selectors.forEach(function(selector) {

        // will generate ".sim-card-0 .sim-card-name" for example
        var targetSelector = cardSelector + ' .sim-card-' + selector;

        this.simCardContainer.querySelector(targetSelector)
          .textContent = simcardInfo[selector];
      }.bind(this));
    },
    setAllElements: function() {
      var elementsId = [
        'sim-card-container',
        'sim-card-tmpl',
        'sim-manager-security-entry',
        'sim-manager-security-desc',
        'sim-manager-outgoing-call-select',
        'sim-manager-outgoing-call-desc',
        'sim-manager-outgoing-messages-select',
        'sim-manager-outgoing-messages-desc',
        'sim-manager-outgoing-data-select',
        'sim-manager-outgoing-data-desc-new'
      ];
      var toCamelCase = function toCamelCase(str) {
        return str.replace(/\-(.)/g, function(str, p1) {
          return p1.toUpperCase();
        });
      };
      elementsId.forEach(function loopElement(name) {
        this[toCamelCase(name)] =
          document.getElementById(name);
      }, this);
    },
    initSimCardManagerUI: function() {
      this.initSimCardsUI();
      this.updateSelectOptionsUI();

      // we only inject basic DOM from templates before
      // , so we have to map UI to its info
      this.updateSimCardsUI();
      this.updateSimSecurityUI();
    },
    initSimCardsUI: function() {
      var simItemHTMLs = [];

      // inject new childs
      this.simcards.forEach(function(simcard, index) {
        simItemHTMLs.push(
          this.simItemTemplate.interpolate({
          'sim-index': index.toString()
        }));
      }.bind(this));

      this.simCardContainer.innerHTML = simItemHTMLs.join('');
    },
    updateSimSecurityUI: function() {
      var firstCardInfo = this.simcards[0].getInfo();
      var secondCardInfo = this.simcards[1].getInfo();

      // if we don't have any card available right now
      // or if we are in airplane mode
      if (firstCardInfo.absent && secondCardInfo.absent ||
        this.isAirplaneMode) {
          this.simManagerSecurityEntry.setAttribute('aria-disabled', true);
          localize(this.simManagerSecurityDesc, 'noSimCard');
      } else {
        this.simManagerSecurityEntry.setAttribute('aria-disabled', false);
        localize(this.simManagerSecurityDesc);
      }
    },
    updateSelectOptionsUI: function() {
      var firstCardInfo = this.simcards[0].getInfo();
      var secondCardInfo = this.simcards[1].getInfo();

      // two cards all are not absent, we have to update separately
      if (!firstCardInfo.absent && !secondCardInfo.absent) {
        SimSettingsHelper.getCardIndexFrom('outgoingCall',
          function(cardIndex) {
            this.updateSelectOptionUI('outgoingCall', cardIndex,
              this.simManagerOutgoingCallSelect);
        }.bind(this));

        SimSettingsHelper.getCardIndexFrom('outgoingMessages',
          function(cardIndex) {
            this.updateSelectOptionUI('outgoingMessages', cardIndex,
              this.simManagerOutgoingMessagesSelect);
        }.bind(this));

        SimSettingsHelper.getCardIndexFrom('outgoingData',
          function(cardIndex) {
            this.updateSelectOptionUI('outgoingData', cardIndex,
              this.simManagerOutgoingDataSelect);
        }.bind(this));
      } else {
        // there is one card absent while the other one is not

        var selectedCardIndex;

        // if two cards all are absent
        if (firstCardInfo.absent && secondCardInfo.absent) {
          // we will just set on the first card even
          // they are all with '--'
          selectedCardIndex = 0;
        } else {
          // if there is one card absent, the other one is not absent

          // we have to set defaultId to available card automatically
          // and disable select/option
          selectedCardIndex = firstCardInfo.absent ? 1 : 0;
        }

        // for these two situations, they all have to be disabled
        // and can not be selected by users
        this.simManagerOutgoingCallSelect.disabled = true;
        this.simManagerOutgoingMessagesSelect.disabled = true;
        this.simManagerOutgoingDataSelect.disabled = true;

        // then change related UI
        this.updateSelectOptionUI('outgoingCall', selectedCardIndex,
          this.simManagerOutgoingCallSelect);
        this.updateSelectOptionUI('outgoingMessages', selectedCardIndex,
          this.simManagerOutgoingMessagesSelect);
        this.updateSelectOptionUI('outgoingData', selectedCardIndex,
          this.simManagerOutgoingDataSelect);
      }
    },
    updateSelectOptionUI: function(storageKey, selectedCardIndex, selectDOM) {
      // We have to remove old options first
      while (selectDOM.firstChild) {
        selectDOM.removeChild(selectDOM.firstChild);
      }

      // then insert the new ones
      this.simcards.forEach(function(simcard, index) {
        var simcardInfo = simcard.getInfo();
        var option = document.createElement('option');
        option.value = index;
        option.text = simcardInfo.name;

        if (simcardInfo.absent) {
          option.value = SimSettingsHelper.EMPTY_OPTION_VALUE;
          option.text = SimSettingsHelper.EMPTY_OPTION_TEXT;
        }

        if (index == selectedCardIndex) {
          option.selected = true;
        }

        selectDOM.add(option);
      });

      // we will add `always ask` option these two select
      if (storageKey === 'outgoingCall' || storageKey === 'outgoingMessages') {
        var option = document.createElement('option');
        option.value = SimSettingsHelper.ALWAYS_ASK_OPTION_VALUE;
        localize(option, 'sim-manager-always-ask');

        if (SimSettingsHelper.ALWAYS_ASK_OPTION_VALUE == selectedCardIndex) {
          option.selected = true;
        }
        selectDOM.add(option);
      }
    },
    isSimCardLocked: function(cardState) {
      var lockedState = [
        'pinRequired',
        'pukRequired',
        'networkLocked',
        'serviceProviderLocked',
        'corporateLocked',
        'network1Locked',
        'network2Locked',
        'hrpdNetworkLocked',
        'ruimCorporateLocked',
        'ruimServiceProviderLocked'
      ];

      // make sure the card is in locked mode or not
      return lockedState.indexOf(cardState) !== -1;
    },
    isSimCardBlocked: function(cardState) {
      var uselessState = [
        'permanentBlocked'
      ];
      return uselessState.indexOf(cardState) !== -1;
    },
    addVoiceChangeEventOnConns: function() {
      var conns = window.navigator.mozMobileConnections;
      for (var i = 0; i < conns.length; i++) {
        var iccId = conns[i].iccId;
        conns[i].addEventListener('voicechange',
          this.updateCardStateWithUI.bind(this, i, iccId));
      }
    },
    addCardStateChangeEventOnIccs: function() {
      var conns = window.navigator.mozMobileConnections;
      var iccManager = window.navigator.mozIccManager;
      for (var i = 0; i < conns.length; i++) {
        var iccId = conns[i].iccId;
        var icc = iccManager.getIccById(iccId);
        if (icc) {
          this.addChangeEventOnIccByIccId(iccId);
        }
      }
    },
    addLocalizedChangeEventOnIccs: function() {
      var conns = window.navigator.mozMobileConnections;
      window.addEventListener('localized', function() {
        for (var i = 0; i < conns.length; i++) {
          var iccId = conns[i].iccId;
          this.updateCardStateWithUI(i, iccId);
        }
      }.bind(this));
    },
    addChangeEventOnIccByIccId: function(iccId) {
      var self = this;
      var icc = window.navigator.mozIccManager.getIccById(iccId);
      if (icc) {
        icc.addEventListener('cardstatechange', function() {
          var cardIndex = self.getCardIndexByIccId(iccId);
          self.updateCardStateWithUI(cardIndex, iccId);

          // If we make PUK locked for more than 10 times,
          // we sould get `permanentBlocked` state, in this way
          // we have to update select/options
          if (self.isSimCardBlocked(icc.cardState)) {
            self.updateSelectOptionsUI();
          }
        });
      }
    },
    addAirplaneModeChangeEvent: function() {
      var self = this;
      AirplaneModeHelper.addEventListener('statechange', function(state) {
        // we only want to handle these two states
        if (state === 'enabled' || state === 'disabled') {
          var enabled = (state === 'enabled') ? true : false;
          self.isAirplaneMode = enabled;
          self.updateCardsState();
          self.updateSimCardsUI();
          self.updateSimSecurityUI();
        }
      });
    },
    updateCardsState: function() {
      var conns = window.navigator.mozMobileConnections;
      for (var cardIndex = 0; cardIndex < conns.length; cardIndex++) {
        var iccId = conns[cardIndex].iccId;
        this.updateCardState(cardIndex, iccId);
      }
    },
    updateCardState: function(cardIndex, iccId) {
      var iccManager = window.navigator.mozIccManager;
      var conn = window.navigator.mozMobileConnections[cardIndex];
      var simcard = this.simcards[cardIndex];

      if (!iccId || this.isAirplaneMode) {
        simcard.setState('nosim');
      } else {
        // else if we can get mobileConnection,
        // we have to check locked / enabled state
        var icc = iccManager.getIccById(iccId);
        var iccInfo = icc.iccInfo;
        var cardState = icc.cardState;
        var operatorInfo = MobileOperator.userFacingInfo(conn);

        if (this.isSimCardLocked(cardState)) {
          simcard.setState('locked');
        } else if (this.isSimCardBlocked(cardState)) {
          simcard.setState('blocked');
        } else {
          // TODO:
          // we have to call Gecko API here to make sure the
          // simcard is enabled / disabled
          simcard.setState('normal', {
            number: iccInfo.msisdn || iccInfo.mdn || '',
            operator: operatorInfo.operator || _('no-operator')
          });
        }
      }
    },
    updateCardStateWithUI: function(cardIndex, iccId) {
      this.updateCardState(cardIndex, iccId);
      this.updateSimCardUI(cardIndex);
      this.updateSimSecurityUI();
    },
    getCardIndexByIccId: function(iccId) {
      var conns = window.navigator.mozMobileConnections;
      var cardIndex;
      for (var i = 0; i < conns.length; i++) {
        if (conns[i].iccId == iccId) {
          cardIndex = i;
        }
      }
      return cardIndex;
    }
  };

  exports.SimCardManager = SimCardManager;

})(window);

window.navigator.mozL10n.ready(SimCardManager.init.bind(SimCardManager));
