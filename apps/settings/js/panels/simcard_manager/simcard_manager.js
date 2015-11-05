/**
 * SimCardManager is responsible for
 *   1. handling simcard UI
 *   2. handling simcard virtual status (please refer SimUIModel class)
 *   3. handling related mozSettings (please refer SimSettingsHelper class)
 *
 * @module SimCardManager
 */
define(function(require) {
  'use strict';

  var l10n = window.navigator.mozL10n;
  var Sanitizer = require('shared/sanitizer');
  var SimSettingsHelper = require('shared/sim_settings_helper');
  var AirplaneModeHelper = require('shared/airplane_mode_helper');
  var MobileOperator = require('shared/mobile_operator');
  var SimUIModel = require('panels/simcard_manager/sim_ui_model');

  var SimCardManager = function(elements) {
    // we store all SimUIModel instances into this array
    this._elements = elements;
    this._simcards = [];
    this._isAirplaneMode = false;
  };

  SimCardManager.prototype = {
    /**
     * Initiazlization
     *
     * @memberOf SimCardManager
     * @access public
     */
    init: function scm_init() {
      // `handleEvent` is used to handle these sim related changes
      this._elements.outgoingCallSelect.addEventListener('change', this);
      this._elements.outgoingMessagesSelect.addEventListener('change', this);

      // XXX because we handle `onchange` event differently in value selector,
      // in order to show confirm dialog after users changing value, the better
      // way right now is to check values when `onblur` event triggered.
      this._addOutgoingDataSelectEvent();
      this._addVoiceChangeEventOnConns();
      this._addCardStateChangeEventOnIccs();
      this._addLocalizedChangeEventOnIccs();

      // SMS app will directly change this value if users are going to
      // donwload specific sms from differnt simcard, so we have to
      // make sure our UI will reflect the right value at the moment.
      SimSettingsHelper.observe('outgoingData',
        this._outgoingDataChangeEvent.bind(this));

      // because in fugu, airplaneMode will not change cardState
      // but we still have to make UI consistent. In this way,
      // when airplaneMode is on in fugu, we have to mimic the nosim
      // situation in single sim.
      this._addAirplaneModeChangeEvent();

      this._isAirplaneMode =
        AirplaneModeHelper.getStatus() === 'enabled' ? true : false;

      // init UI
      this._initSimCardsInfo();
      this._initSimCardManagerUI();
    },

    simItemView: function({simIndex}) {
      return Sanitizer.escapeHTML `<li class="sim-card sim-card-${simIndex}">
        <div class="sim-card-icon"></div>
        <div class="information-container">
          <p class="sim-card-name"></p>
          <p class="sim-card-operator"></p>
          <bdi class="sim-card-number"></bdi>
        </div>
      </li>`;
    },

    /**
     * We will initialize SimUIModel and store them into our internal
     * variables.
     *
     * @memberOf SimCardManager
     * @access public
     */
    _initSimCardsInfo: function scm__initSimCardsInfo() {
      var conns = window.navigator.mozMobileConnections;
      for (var cardIndex = 0; cardIndex < conns.length; cardIndex++) {
        var conn = conns[cardIndex];
        var iccId = conn.iccId;
        var simcard = SimUIModel(cardIndex);
        this._simcards.push(simcard);
        this._updateCardState(cardIndex, iccId);
      }
    },

    /**
     * Handle incoming events
     *
     * @memberOf SimCardManager
     * @access private
     * @param {Event} evt
     */
    handleEvent: function scm_handlEvent(evt) {
      var cardIndex = evt.target.value;

      // it means users is seleting '--' options
      // when _simcards are all disabled
      if (cardIndex === SimSettingsHelper.EMPTY_OPTION_VALUE) {
        return;
      }

      switch (evt.target) {
        case this._elements.outgoingCallSelect:
          SimSettingsHelper.setServiceOnCard('outgoingCall', cardIndex);
          break;

        case this._elements.outgoingMessagesSelect:
          SimSettingsHelper.setServiceOnCard('outgoingMessages', cardIndex);
          break;
      }
    },

    /**
     * Handle mozSettings change event for `outgoing data` key
     *
     * @memberOf SimCardManager
     * @access private
     * @param {Number} cardIndex
     */
    _outgoingDataChangeEvent: function scm__outgoingDataChangeEvent(cardIndex) {
      this._elements.outgoingDataSelect.value = cardIndex;
    },

    /**
     * Handle change event for `outgoing data` select
     *
     * @memberOf SimCardManager
     * @access private
     */
    _addOutgoingDataSelectEvent: function scm__addOutgoingDataSelectEvent() {
      var prevCardIndex;
      var newCardIndex;

      // initialize these two variables when focus
      this._elements.outgoingDataSelect.addEventListener('focus', function() {
        prevCardIndex = this.selectedIndex;
        newCardIndex = this.selectedIndex;
      });

      this._elements.outgoingDataSelect.addEventListener('blur', function() {
        newCardIndex = this.selectedIndex;
        if (prevCardIndex !== newCardIndex) {
          // UX needs additional hint for users to make sure
          // they really want to change data connection
          l10n.formatValue('change-outgoing-data-confirm').then(msg => {
            var wantToChange = window.confirm(msg);

            if (wantToChange) {
              SimSettingsHelper.setServiceOnCard('outgoingData',
                newCardIndex);
            } else {
              this.selectedIndex = prevCardIndex;
            }
          });
        }
      });
    },

    /**
     * Get count of current simcards
     *
     * @memberOf SimCardManager
     * @access private
     * @return {Number} count of simcards
     */
    _getSimCardsCount: function scm__getSimCardsCount() {
      return this._simcards.length;
    },

    /**
     * Get information of simcard
     *
     * @memberOf SimCardManager
     * @access private
     * @param {Number} cardIndex
     * @return {Object} information stored in SimUIModel
     */
    _getSimCardInfo: function scm__getSimCardInfo(cardIndex) {
      return this._simcards[cardIndex].getInfo();
    },

    /**
     * Get simcard
     *
     * @memberOf SimCardManager
     * @access private
     * @param {Number} cardIndex
     * @return {SimUIModel}
     */
    _getSimCard: function scm__getSimCard(cardIndex) {
      return this._simcards[cardIndex];
    },

    /**
     * Iterate stored instances of SimUIModel and update each Sim UI
     *
     * @memberOf SimCardManager
     * @access private
     */
    _updateSimCardsUI: function scm__updateSimCardsUI() {
      this._simcards.forEach(function(simcard, cardIndex) {
        this._updateSimCardUI(cardIndex);
      }.bind(this));
    },

    /**
     * We would use specified instance of SimUIModel based on passing cardIndex
     * to render related UI on SimCardManager.
     *
     * @memberOf SimCardManager
     * @access private
     * @param {Number} cardIndex
     */
    _updateSimCardUI: function scm__updateSimCardUI(cardIndex) {
      var simcardInfo = this._getSimCardInfo(cardIndex);
      var selectors = ['name', 'number', 'operator'];

      var cardSelector = '.sim-card-' + cardIndex;

      var cardDom =
        this._elements.simCardContainer.querySelector(cardSelector);

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
        var element =
          this._elements.simCardContainer.querySelector(targetSelector);
        if (selector === 'number') {
          element.textContent = simcardInfo[selector];
        } else {
          var l10nObj = simcardInfo[selector];
          if (l10nObj.id) {
            l10n.setAttributes(element, l10nObj.id, l10nObj.args);
          } else {
            element.removeAttribute('data-l10n-id');
            element.textContent = l10nObj.text;
          }
        }
      }.bind(this));
    },

    /**
     * Initialize SimCardManager UIs which includes
     * SimCardsUI, selectOptionsUI, simSecurityUI
     *
     * @memberOf SimCardManager
     * @access private
     */
    _initSimCardManagerUI: function scm__initSimCardManagerUI() {
      this._initSimCardsUI();
      this._updateSelectOptionsUI();

      // we only inject basic DOM from templates before
      // , so we have to map UI to its info
      this._updateSimCardsUI();
      this._updateSimSettingsUI();
    },

    /**
     * Initialize SimCardsUI
     *
     * @memberOf SimCardManager
     * @access private
     */
    _initSimCardsUI: function scm__initSimCardsUI() {
      var simItemHTMLs = [];

      // inject new childs
      this._simcards.forEach(function(simcard, index) {
        simItemHTMLs.push(
          this.simItemView({
            simIndex: index.toString()
          })
        );
      }.bind(this));

      this._elements.simCardContainer.innerHTML = simItemHTMLs.join('');
    },

    /**
     * Update the UI of the sim settings section
     *
     * @memberOf SimCardManager
     * @access private
     */
    _updateSimSettingsUI: function scm__updateSimSettingsUI() {
      var firstCardInfo = this._simcards[0].getInfo();
      var secondCardInfo = this._simcards[1].getInfo();
      var hidden = firstCardInfo.absent && secondCardInfo.absent ||
        this._isAirplaneMode;

      // if we don't have any card available right now
      // or if we are in airplane mode
      this._elements.simSettingsHeader.hidden = hidden;
      this._elements.simSettingsList.hidden = hidden;
    },

    /**
     * Update SelectOptions UI
     *
     * @memberOf SimCardManager
     * @access private
     */
    _updateSelectOptionsUI: function scm__updateSelectOptionsUI() {
      var firstCardInfo = this._simcards[0].getInfo();
      var secondCardInfo = this._simcards[1].getInfo();

      // two cards all are not absent, we have to update separately
      if (!firstCardInfo.absent && !secondCardInfo.absent) {
        SimSettingsHelper.getCardIndexFrom('outgoingCall',
          function(cardIndex) {
            this._updateSelectOptionUI('outgoingCall', cardIndex,
              this._elements.outgoingCallSelect);
        }.bind(this));

        SimSettingsHelper.getCardIndexFrom('outgoingMessages',
          function(cardIndex) {
            this._updateSelectOptionUI('outgoingMessages', cardIndex,
              this._elements.outgoingMessagesSelect);
        }.bind(this));

        SimSettingsHelper.getCardIndexFrom('outgoingData',
          function(cardIndex) {
            this._updateSelectOptionUI('outgoingData', cardIndex,
              this._elements.outgoingDataSelect);
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
        this._elements.outgoingCallSelect.disabled = true;
        this._elements.outgoingMessagesSelect.disabled = true;
        this._elements.outgoingDataSelect.disabled = true;

        // then change related UI
        this._updateSelectOptionUI('outgoingCall', selectedCardIndex,
          this._elements.outgoingCallSelect);
        this._updateSelectOptionUI('outgoingMessages', selectedCardIndex,
          this._elements.outgoingMessagesSelect);
        this._updateSelectOptionUI('outgoingData', selectedCardIndex,
          this._elements.outgoingDataSelect);
      }
    },

    /**
     * Update SelectOption UI
     *
     * @memberOf SimCardManager
     * @access private
     * @param {String} storageKey
     * @param {Number} selectedCardIndex
     * @param {HTMLElement} selectedDOM
     */
    _updateSelectOptionUI: function scm__updateSelectOptionUI(
      storageKey, selectedCardIndex, selectDOM) {
        // We have to remove old options first
        while (selectDOM.firstChild) {
          selectDOM.removeChild(selectDOM.firstChild);
        }

        // then insert the new ones
        this._simcards.forEach(function(simcard, index) {
          var simcardInfo = simcard.getInfo();
          var option = document.createElement('option');
          option.value = index;

          if (simcardInfo.absent) {
            option.value = SimSettingsHelper.EMPTY_OPTION_VALUE;
            option.text = SimSettingsHelper.EMPTY_OPTION_TEXT;
          } else {
            if (simcardInfo.name.id) {
              l10n.setAttributes(option,
                simcardInfo.name.id, simcardInfo.name.args);
            } else {
              option.text = simcardInfo.name.text;
            }
          }

          if (index == selectedCardIndex) {
            option.selected = true;
          }

          selectDOM.add(option);
        });

        // we will add `always ask` option these two select
        if (storageKey === 'outgoingCall' ||
          storageKey === 'outgoingMessages') {
            var option = document.createElement('option');
            option.value = SimSettingsHelper.ALWAYS_ASK_OPTION_VALUE;
            option.setAttribute('data-l10n-id', 'sim-manager-always-ask');

            if (SimSettingsHelper.ALWAYS_ASK_OPTION_VALUE ===
              selectedCardIndex) {
                option.selected = true;
            }
            selectDOM.add(option);
        }
    },

    /**
     * Check whether current cardState is locked or not.
     *
     * @memberOf SimCardManager
     * @access private
     * @param {String} cardState
     * @return {Boolean}
     */
    _isSimCardLocked: function scm__isSimCardLocked(cardState) {
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

    /**
     * Check whether current cardState is blocked or not.
     *
     * @memberOf SimCardManager
     * @access private
     * @param {String} cardState
     * @return {Boolean}
     */
    _isSimCardBlocked: function scm__isSimCardBlocked(cardState) {
      var uselessState = [
        'permanentBlocked'
      ];
      return uselessState.indexOf(cardState) !== -1;
    },

    /**
     * If voidechange happened on any conn, we would upate its cardState and
     * reflect the change on UI.
     *
     * @memberOf SimCardManager
     * @access private
     */
    _addVoiceChangeEventOnConns: function scm__addVoiceChangeEventOnConns() {
      var conns = window.navigator.mozMobileConnections;
      for (var i = 0; i < conns.length; i++) {
        var iccId = conns[i].iccId;
        conns[i].addEventListener('voicechange',
          this._updateCardStateWithUI.bind(this, i, iccId));
      }
    },

    /**
     * Iterate conns to add changeEvent
     *
     * @memberOf SimCardManager
     * @access private
     */
    _addCardStateChangeEventOnIccs:
      function scm__addCardStateChangeEventOnIccs() {
        var conns = window.navigator.mozMobileConnections;
        var iccManager = window.navigator.mozIccManager;
        for (var i = 0; i < conns.length; i++) {
          var iccId = conns[i].iccId;
          var icc = iccManager.getIccById(iccId);
          if (icc) {
            this._addChangeEventOnIccByIccId(iccId);
          }
        }
    },

    /**
     * When localized event happened, we would update each cardState and its
     * UI.
     *
     * @memberOf SimCardManager
     * @access private
     */
    _addLocalizedChangeEventOnIccs:
      function scm__addLocalizedChangeEventOnIccs() {
        var conns = window.navigator.mozMobileConnections;
        window.addEventListener('localized', function() {
          for (var i = 0; i < conns.length; i++) {
            var iccId = conns[i].iccId;
            this._updateCardStateWithUI(i, iccId);
          }
        }.bind(this));
    },

    /**
     * Add change event on each icc and would update UI if possible.
     *
     * @memberOf SimCardManager
     * @access private
     * @param {String} iccId
     */
    _addChangeEventOnIccByIccId:
      function scm__addChangeEventOnIccByIccId(iccId) {
        var self = this;
        var icc = window.navigator.mozIccManager.getIccById(iccId);
        if (icc) {
          icc.addEventListener('cardstatechange', function() {
            var cardIndex = self._getCardIndexByIccId(iccId);
            self._updateCardStateWithUI(cardIndex, iccId);

            // If we make PUK locked for more than 10 times,
            // we sould get `permanentBlocked` state, in this way
            // we have to update select/options
            if (self._isSimCardBlocked(icc.cardState)) {
              self._updateSelectOptionsUI();
            }
          });
        }
    },

    /**
     * If the state of APM is changed, we will update states and update all
     * related UIs.
     *
     * @memberOf SimCardManager
     * @access private
     */
    _addAirplaneModeChangeEvent: function scm__addAirplaneModeChangeEvent() {
      var self = this;
      AirplaneModeHelper.addEventListener('statechange', function(state) {
        // we only want to handle these two states
        if (state === 'enabled' || state === 'disabled') {
          var enabled = (state === 'enabled') ? true : false;
          self._isAirplaneMode = enabled;
          self._updateCardsState();
          self._updateSimCardsUI();
          self._updateSimSettingsUI();
        }
      });
    },

    /**
     * Iterate conns to call updateCardState on each conn.
     *
     * @memberOf SimCardManager
     * @access private
     */
    _updateCardsState: function scm__updateCardsState() {
      var conns = window.navigator.mozMobileConnections;
      for (var cardIndex = 0; cardIndex < conns.length; cardIndex++) {
        var iccId = conns[cardIndex].iccId;
        this._updateCardState(cardIndex, iccId);
      }
    },

    /**
     * we will use specified conn to update its state on our internal simcards
     *
     * @memberOf SimCardManager
     * @access private
     * @param {Number} cardIndex
     * @param {String} iccId
     */
    _updateCardState: function scm__updateCardState(cardIndex, iccId) {
      var iccManager = window.navigator.mozIccManager;
      var conn = window.navigator.mozMobileConnections[cardIndex];
      var simcard = this._simcards[cardIndex];

      if (!iccId || this._isAirplaneMode) {
        simcard.setState('nosim');
      } else {
        // else if we can get mobileConnection,
        // we have to check locked / enabled state
        var icc = iccManager.getIccById(iccId);
        var iccInfo = icc.iccInfo;
        var cardState = icc.cardState;
        var operatorInfo = MobileOperator.userFacingInfo(conn);

        if (this._isSimCardLocked(cardState)) {
          simcard.setState('locked');
        } else if (this._isSimCardBlocked(cardState)) {
          simcard.setState('blocked');
        } else {
          // TODO:
          // we have to call Gecko API here to make sure the
          // simcard is enabled / disabled
          simcard.setState('normal', {
            number: iccInfo.msisdn || iccInfo.mdn || '',
            operator: operatorInfo.operator
          });
        }
      }
    },

    /**
     * Sometimes, we have to update state and UI at the same time, so this is
     * a handy function to use.
     *
     * @memberOf SimCardManager
     * @access private
     * @param {Number} cardIndex
     * @return {String} iccId
     */
    _updateCardStateWithUI:
      function scm__updateCardStateWithUI(cardIndex, iccId) {
        this._updateCardState(cardIndex, iccId);
        this._updateSimCardUI(cardIndex);
        this._updateSimSettingsUI();
    },

    /**
     * This method would help us find out the index of passed in iccId.
     *
     * @memberOf SimCardManager
     * @access private
     * @param {String} iccId
     * @return {Number} cardIndex
     */
    _getCardIndexByIccId: function scm__getCardIndexByIccId(iccId) {
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

  return SimCardManager;
});
