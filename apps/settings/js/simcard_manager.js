'use strict';

(function(exports) {

  var _ = window.navigator.mozL10n.get;

  /*
   * Main Entry
   */
  var SimCardManager = {
    isUIinitialized: false,
    init: function() {

      // we encapsulate simcards to do related UI changes
      // when setting it (Key-Value Observing)
      var simcards = [];

      Object.defineProperty(this, 'simcards', {
        get: function() {
          return simcards;
        },
        set: function(newSimcardsInfo) {
          simcards = newSimcardsInfo;

          // We have to make sure we have initialized
          // UI so that we can update
          if (this.isUIinitialized) {
            this.updateSimCardsUI();
          }
        }
      });

      // init DOM related stuffs
      this.setAllElements();
      this.simItemTemplate = new Template(this.simCardTmpl);

      // `handleEvent` is used to handle these sim related changes
      this.simManagerOutgoingCallSelect.addEventListener('change', this);
      this.simManagerOutgoingMessagesSelect.addEventListener('change', this);
      this.simManagerOutgoingDataSelect.addEventListener('change', this);

      this.simCardContainer.addEventListener('click',
        this.handleDelegateEvents.bind(this));

      // init needed cardInfo
      this.initSimCardsInfo();

      // render UI
      this.initSimCardManagerUI();
    },
    initSimCardsInfo: function() {
      var conns = this.getMobileConnections();

      // NOTE: this is for desktop testing
      if (conns && conns.length == 1 && !conns[0].data) {
        this.simcards = [
          {
            enabled: true,
            locked: false,
            iccId: '11111',
            name: 'SIM 1',
            number: '0123456789',
            operator: 'Chunghwa Telecom'
          },
          {
            enabled: true,
            locked: true,
            iccId: '11111',
            name: 'SIM 2',
            number: '9876543210',
            operator: 'FarEastTone'
          }
        ];

        return;
      }

      var iccManager = window.navigator.mozIccManager;

      for (var i = 0; i < conns.length; i++) {
        var conn = conns[i];
        var cardIndex = i + 1;
        var iccId = conn.iccId;
        var simcardInfo;

        // if this mobileConnection has no simcard on it
        if (!iccId) {
          simcardInfo = {
            enabled: false,
            locked: false,
            iccId: '-1',
            name: 'simcard' + cardIndex,
            number: _('unknown-phoneNumber'),
            operator: _('no-operator')
          };
        }
        else {
          var icc = iccManager.getIccById(iccId);
          var iccInfo = icc.iccInfo;
          var operatorInfo = MobileOperator.userFacingInfo(conn);
          var lockedState = [
            'pinRequired',
            'pukRequired',
            'networkLocked',
            'serviceProviderLocked',
            'corporateLocked'
          ];

          var locked = false;

          // make sure the card is in locked mode or not
          if (icc.cardState.indexOf(lockedState)) {
            locked = true;
          }

          simcardInfo = {
            enabled: true,
            locked: locked,
            iccId: iccId,
            name: 'simcard' + cardIndex,
            number: iccInfo.spn || _('unknown-phoneNumber'),
            operator: operatorInfo.operator || _('no-operator')
          };
        }

        this.simcards.push(simcardInfo);
      }
    },
    handleEvent: function(evt) {

      var cardIndex = evt.target.value;

      switch (evt.target) {
        case this.simManagerOutgoingCallSelect:
          SettingsHelper.set('outgoingCall').on(cardIndex);
          break;

        case this.simManagerOutgoingMessagesSelect:
          SettingsHelper.set('outgoingMessages').on(cardIndex);
          break;

        case this.simManagerOutgoingDataSelect:

          // UX needs additional hint for users to make sure
          // they really want to change data connection
          var wantToChange = window.confirm(_('change-outgoing-data-confirm'));

          if (wantToChange) {
            SettingsHelper.set('outgoingData').on(cardIndex);
          }
          else {
            var previousCardIndex = (cardIndex == 0) ? 1 : 0;
            this.simManagerOutgoingDataSelect.selectedIndex = previousCardIndex;
          }
          break;
      }
    },
    handleDelegateEvents: function(evt) {
      var target = evt.target;

      if (target.classList.contains('simcard-checkbox')) {
        var cardIndex = parseInt(target.dataset.cardIndex, 10);
        this.toggleSimCard(cardIndex, evt);
      }
    },
    toggleSimCard: function(cardIndex, evt) {
      var simcardsCount = this.getSimCardsCount();
      var simcardInfo = this.getSimCardInfo(cardIndex);

      // If we are in one-sim infrastructure
      if (simcardsCount === 1) {

        // and current card is enabled, it means we want to disable it
        if (simcardInfo.enabled) {
          evt.preventDefault();
          // sorry, this is not allowed because we have only one card
          window.alert(_('cant-disable-simcard-alert'));
        }
        // and current card is disabled, it means we want to enable it
        else if (!simcardInfo.enabled) {
          // I have no idea why this will happen, just throw errors
          throw new Error(
            'In one-sim infrastructure, but current simcard is disabled');
        }
      }
      // Else if we are in DSDS infrastructure
      else if (simcardsCount === 2) {

        var anotherCardIndex = (cardIndex == 0) ? 1 : 0;
        var anotherCardInfo = this.getSimCardInfo(anotherCardIndex);

        // and current card is enabled, it means we want to disable it
        if (simcardInfo.enabled) {

          // but sadly, another card is disabled now, so we can't disable
          // current card. In this way, we have to alert users.
          if (!anotherCardInfo.enabled) {
            evt.preventDefault();
            window.alert(_('cant-disable-simcard-alert'));
          }
          // ok, because the other card is enabled, we can disable current
          // card. We just have to confirm with users.
          else {

            // Because we start from 0, we have to change it to start from 1
            var disableCardIndex = (cardIndex + 1) + '';
            var enableCardIndex = (anotherCardIndex + 1) + '';

            var wantToDisable =
              window.confirm(_('disable-simcard-confirm', {
                disableCardIndex: disableCardIndex,
                enableCardIndex: enableCardIndex
              }));

            if (!wantToDisable) {
              evt.preventDefault();
            }
            else {
              this.disableSimCard(cardIndex);
            }
          }
        }
        // and current card is disabled, it means we want to enable it
        else if (!simcardInfo.enabled) {
          // TODO, add sth here
          // ok, you can just enable it !
          var wantToEnable =
            window.confirm('Are you sure you want to enable this card ?');

          if (!wantToEnable) {
            evt.preventDefault();
          }
          else {
            this.enableSimCard(cardIndex);
          }
        }
      }
    },
    enableSimCard: function(cardIndex) {
      this.updateSimCardInfo(cardIndex, { enabled: true });

      // TODO:
      // call new Gecko API to enable this simcard
    },
    disableSimCard: function(cardIndex) {
      this.updateSimCardInfo(cardIndex, { enabled: false });

      // TODO:
      // call new Gecko API to disable this simcard
    },
    getSimCardsCount: function() {
      return this.simcards.length;
    },
    getSimCardInfo: function(cardIndex) {
      return this.simcards[cardIndex];
    },
    updateSimCardInfo: function(cardIndex, newInfo) {
      var newSimcardsInfo = this.simcards;

      for (var infoKey in newInfo) {
        newSimcardsInfo[cardIndex][infoKey] = newInfo[infoKey];
      }

      // This will force updating UI
      this.simcards = newSimcardsInfo;
    },
    updateSimCardsUI: function() {
      this.simcards.forEach(function(cardInfo, cardIndex) {
        this.updateSimCardUI(cardIndex);
      }.bind(this));
    },
    updateSimCardUI: function(cardIndex) {
      var simcardInfo = this.getSimCardInfo(cardIndex);
      var selectors = [
        'name',
        'number',
        'operator'
      ];

      var cardSelector = '.sim-card-' + cardIndex;
      var cardDom = this.simCardContainer.querySelector(cardSelector);

      // locked state
      cardDom.classList.toggle('locked', simcardInfo.locked);

      // enabled state
      cardDom.classList.toggle('enabled', simcardInfo.enabled);

      selectors.forEach(function(selector) {
        // will generate ".sim-card-0 .sim-card-name" for example
        var targetSelector = cardSelector + ' .sim-card-' + selector;

        this.simCardContainer.querySelector(targetSelector)
          .textContent = simcardInfo[selector];
      }.bind(this));
    },
    getMobileConnections: function() {
      var conns;

      // backward compatibility check
      if (window.navigator.mozMobileConnection) {
        conns = [window.navigator.mozMobileConnection];
      }
      else if (window.navigator.mozMobileConnections) {
        conns = window.navigator.mozMobileConnections;
      }

      return conns;
    },
    setAllElements: function() {
      var elementsId = [
        'sim-card-container',
        'sim-card-tmpl',
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

      this.isUIinitialized = true;
    },
    initSimCardsUI: function() {
      var simItemHTMLs = [];

      // cleanup old child nodes first
      while (this.simCardContainer.hasChildNodes()) {
        this.simCardContainer.removeChild(
          this.simCardContainer.lastChild);
      }

      // inject new childs later
      this.simcards.forEach(function(simcard, index) {
        simItemHTMLs.push(
          this.simItemTemplate.interpolate({
          'sim-index': index.toString(),
          'sim-name': simcard.name,
          'sim-number': simcard.number,
          'sim-operator': simcard.operator,
          // for simcard UI
          'sim-enabled': (simcard.enabled) ? 'enabled' : '',
          // for simcard UI
          'sim-locked': (simcard.locked) ? 'locked' : '',
          // for initial checkbox attribute
          'sim-checkbox-checked': (simcard.enabled) ? 'checked' : '',
          // for initial checkbox attribute
          'sim-checkbox-locked': (simcard.locked) ? 'disabled' : ''
        }));
      }.bind(this));

      this.simCardContainer.innerHTML = simItemHTMLs.join('');
    },
    initSelectOptionsUI: function(selectedIndex) {

      // make sure we select the first one by default
      selectedIndex = selectedIndex || 0;

      var outgoingCallSelect =
        this.simManagerOutgoingCallSelect;

      var outgoingMessagesSelect =
        this.simManagerOutgoingMessagesSelect;

      var outgoingDataSelect =
        this.simManagerOutgoingDataSelect;

      // remove all options in outgoing call
      while (outgoingCallSelect.hasChildNodes()) {
        outgoingCallSelect.removeChild(
          outgoingCallSelect.lastChild);
      }

      // remove all options in outgoing messages
      while (outgoingMessagesSelect.hasChildNodes()) {
        outgoingMessagesSelect.removeChild(
          outgoingMessagesSelect.lastChild);
      }

      // remove all options in outgoing data
      while (outgoingDataSelect.hasChildNodes()) {
        outgoingDataSelect.removeChild(
          outgoingDataSelect.lastChild);
      }

      this.simcards.forEach(function(simcard, index) {
        var options = [];

        for (var i = 0; i < 3; i++) {
          var option = document.createElement('option');
          option.value = index;
          option.text = simcard.name;

          // select the first simcard by default
          if (index == selectedIndex) {
            option.selected = true;
          }
          options.push(option);
        }

        outgoingCallSelect.add(options[0]);
        outgoingMessagesSelect.add(options[1]);
        outgoingDataSelect.add(options[2]);

      }.bind(this));
    }
  };

  exports.SimCardManager = SimCardManager;

})(window);

window.navigator.mozL10n.ready(SimCardManager.init.bind(SimCardManager));
