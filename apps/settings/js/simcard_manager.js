/* exported SimCardManager */
/* global Template, SimUIModel,
   SimSettingsHelper, MobileOperator, SimCardManager,
   SettingsListener */

'use strict';

(function(exports) {

  // track used constants here
  const EMPTY_OPTION_TEXT = '--';
  const EMPTY_OPTION_VALUE = '-1';
  const ICC_NAMES_SETTING_KEY = 'icc.names';

  var _ = window.navigator.mozL10n.get;

  /*
   * SimCardManager is responsible for
   *   1. handling simcard UI
   *   2. handling simcard virtual status (please refer SimUIModel class)
   *   3. handling related mozSettings (please refer SimSettingsHelper class)
   */
  var SimCardManager = {
    init: function() {
      var self = this;
      // we store all SimUIModel instances into this array
      this.simcards = [];
      this.isAirplaneMode = false;

      // init DOM related stuffs
      this.setAllElements();
      this.simItemTemplate = new Template(this.simCardTmpl);

      // handle all click events in the container
      this.simCardContainer.addEventListener('click',
        this.handleClickEvent.bind(this));

      // `handleEvent` is used to handle these sim related changes
      this.simManagerOutgoingCallSelect.addEventListener('change', this);
      this.simManagerOutgoingMessagesSelect.addEventListener('change', this);
      this.simManagerOutgoingDataSelect.addEventListener('change', this);

      // bind change event on them
      this.addChangeEventOnIccs();
      this.addChangeEventOnSimNames();

      // because in fugu, airplaneMode will not change cardState
      // but we still have to make UI consistent. In this way,
      // when airplaneMode is on in fugu, we have to mimic the nosim
      // situation in single sim.
      this.addAirplaneModeChangeEvent();

      // init UI
      var mozSettings = window.navigator.mozSettings;
      var req = mozSettings.createLock().get('ril.radio.disabled');
      req.onsuccess = function() {
        self.isAirplaneMode = req.result['ril.radio.disabled'];
        self.initSimCardsInfo();
        self.initSimCardManagerUI();
      };
      req.onerror = function() {
        console.log('Error, cant access ril.radio.disabled');
        console.log('Initialize simcardLock failed');
      };
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
    handleClickEvent: function(evt) {
      var target = evt.target;
      switch (target.type) {
        // click on rename button
        case 'button':
          var cardIndex = parseInt(target.dataset.index, 10);
          this.renameSimCard(cardIndex);
          break;
      }
    },
    handleEvent: function(evt) {

      var cardIndex = evt.target.value;

      // it means users is seleting '--' options
      // when simcards are all disabled
      if (cardIndex == EMPTY_OPTION_VALUE) {
        return;
      }

      switch (evt.target) {
        case this.simManagerOutgoingCallSelect:
          SimSettingsHelper.setServiceOnCard('outgoingCall', cardIndex);
          break;

        case this.simManagerOutgoingMessagesSelect:
          SimSettingsHelper.setServiceOnCard('outgoingMessages', cardIndex);
          break;

        case this.simManagerOutgoingDataSelect:

          // UX needs additional hint for users to make sure
          // they really want to change data connection
          var wantToChange = window.confirm(_('change-outgoing-data-confirm'));

          if (wantToChange) {
            SimSettingsHelper.setServiceOnCard('outgoingData', cardIndex);
          } else {
            var previousCardIndex = (cardIndex === 0) ? 1 : 0;
            this.simManagerOutgoingDataSelect.selectedIndex = previousCardIndex;
          }
          break;
      }
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
    getValuesFromMozSettings: function(key, callback) {
      var mozSettings = window.navigator.mozSettings;
      var req = mozSettings.createLock().get(key);
      req.onsuccess = function() {
        callback(req.result[key]);
      };
    },
    renameSimCard: function(cardIndex) {
      var mozSettings = window.navigator.mozSettings;
      var conns = window.navigator.mozMobileConnections;
      var self = this;

      var simcard = this.simcards[cardIndex];
      var iccId = conns[cardIndex].iccId;
      var oldName;
      var newName;

      this.getValuesFromMozSettings(ICC_NAMES_SETTING_KEY, function(names) {
        oldName = names[iccId] || simcard.getInfo().name;
        newName = window.prompt('Rename SIM' + (cardIndex + 1), oldName);

        // cancel by users
        if (newName === null) {
          return;
        } else if (newName !== '' && oldName !== newName) {
          self.didRenameSimCard(iccId, newName, names);
        }
      });
    },
    didRenameSimCard: function(iccId, newName, names) {
      names[iccId] = newName;

      var setObj = {};
      setObj[ICC_NAMES_SETTING_KEY] = names;

      var mozSettings = window.navigator.mozSettings;
      mozSettings.createLock().set(setObj);
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
        'sim-manager-outgoing-data-desc'
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
      this.initSelectOptionsUI();

      // we have to update cardNames first before update UI
      this.getValuesFromMozSettings(ICC_NAMES_SETTING_KEY, function(names) {
        this.updateCardNames(names);

        // we only inject basic DOM from templates before
        // , so we have to map UI to its info
        this.updateSimCardsUI();
        this.updateSimSecurityUI();
      }.bind(this));
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
    initSelectOptionsUI: function() {

      var firstCardInfo = this.simcards[0].getInfo();
      var secondCardInfo = this.simcards[1].getInfo();

      // two cards all are not absent, we have to update separately
      if (!firstCardInfo.absent && !secondCardInfo.absent) {
        SimSettingsHelper.getCardIndexFrom('outgoingCall',
          function(cardIndex) {
            this.initSelectOptionUI('outgoingCall', cardIndex,
              this.simManagerOutgoingCallSelect);
        }.bind(this));

        SimSettingsHelper.getCardIndexFrom('outgoingMessages',
          function(cardIndex) {
            this.initSelectOptionUI('outgoingMessages', cardIndex,
              this.simManagerOutgoingMessagesSelect);
        }.bind(this));

        SimSettingsHelper.getCardIndexFrom('outgoingData',
          function(cardIndex) {
            this.initSelectOptionUI('outgoingData', cardIndex,
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

          SimSettingsHelper.setServiceOnCard('outgoingCall',
            selectedCardIndex);

          SimSettingsHelper.setServiceOnCard('outgoingMessages',
            selectedCardIndex);

          SimSettingsHelper.setServiceOnCard('outgoingData',
            selectedCardIndex);
        }

        // for these two situations, they all have to be disabled
        // and can not be selected by users
        this.simManagerOutgoingCallSelect.disabled = true;
        this.simManagerOutgoingMessagesSelect.disabled = true;
        this.simManagerOutgoingDataSelect.disabled = true;

        // then change related UI
        this.initSelectOptionUI('outgoingCall', selectedCardIndex,
          this.simManagerOutgoingCallSelect);
        this.initSelectOptionUI('outgoingMessages', selectedCardIndex,
          this.simManagerOutgoingMessagesSelect);
        this.initSelectOptionUI('outgoingData', selectedCardIndex,
          this.simManagerOutgoingDataSelect);
      }
    },
    initSelectOptionUI: function(storageKey, selectedCardIndex, selectDOM) {
      this.simcards.forEach(function(simcard, index) {
        var simcardInfo = simcard.getInfo();
        var option = document.createElement('option');
        option.value = index;
        option.text = simcardInfo.name;

        if (simcardInfo.absent) {
          option.value = EMPTY_OPTION_VALUE;
          option.text = EMPTY_OPTION_TEXT;
        }

        if (index == selectedCardIndex) {
          option.selected = true;
        }

        selectDOM.add(option);
      });
    },
    isSimCardLocked: function(cardState) {

      var lockedState = [
        'pinRequired',
        'pukRequired',
        'networkLocked',
        'serviceProviderLocked',
        'corporateLocked'
      ];

      // make sure the card is in locked mode or not
      return lockedState.indexOf(cardState) !== -1;
    },
    addChangeEventOnIccs: function() {
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
    addChangeEventOnIccByIccId: function(iccId) {
      var self = this;
      var icc = window.navigator.mozIccManager.getIccById(iccId);
      if (icc) {
        icc.oncardstatechange = function() {
          var cardIndex = self.getCardIndexByIccId(iccId);
          self.updateCardState(cardIndex, iccId);
          self.updateSimCardUI(cardIndex);
          self.updateSimSecurityUI();
        };
      }
    },
    addChangeEventOnSimNames: function() {
      var mozSettings = window.navigator.mozSettings;
      var self = this;
      mozSettings.addObserver(ICC_NAMES_SETTING_KEY, function(evt) {
        var names = evt.settingValue;
        self.updateCardNames(names);
        self.updateSimCardsUI();
      });
    },
    addAirplaneModeChangeEvent: function() {
      var self = this;
      var mozSettings = window.navigator.mozSettings;
      mozSettings.addObserver('ril.radio.disabled', function(evt) {
        self.isAirplaneMode = evt.settingValue;
        self.updateCardsState();
        self.updateSimCardsUI();
        self.updateSimSecurityUI();
      });
    },
    updateCardNames: function(names) {
      var conns = window.navigator.mozMobileConnections;
      for (var cardIndex = 0; cardIndex < conns.length; cardIndex++) {
        var iccId = conns[cardIndex].iccId;
        var name = names[iccId];
        // we may have no name when users set cardName at the first time
        if (name) {
          this.updateCardName(cardIndex, name);
        }
      }
    },
    updateCardName: function(cardIndex, newName) {
      var simcard = this.simcards[cardIndex];
      simcard.setName(newName);
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
