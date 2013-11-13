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

          // we have to make sure our UI has been initialized
          // so that we can update its views when setting
          // values.
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

      // TODO
      // if we support hot plugging in the future,
      // we have to register `onicccardchange` event to handle its state here

      // init needed cardInfo
      this.initSimCardsInfo();

      // render basic UI
      this.initSimCardManagerUI();
    },
    initSimCardsInfo: function() {
      var conns = this.getMobileConnections();

      // NOTE: this is for desktop testing
      if (conns && conns.length == 1 && !conns[0].data) {
        this.simcards = [
            /*
          {
            enabled: true,
            absent: true,
            locked: false,
            name: 'SIM 1',
            number: '0123456789',
            operator: 'Chunghwa Telecom'
          },
          {
            enabled: true,
            absent: true,
            locked: true,
            name: 'SIM 2',
            number: '9876543210',
            operator: 'FarEastTone'
          }
          */
          {
            enabled: true,
            absent: true,
            locked: false,
            name: _('noSimCard'),
            number: '',
            operator: ''
          },
          {
            enabled: true,
            absent: true,
            locked: false,
            name: _('noSimCard'),
            number: '',
            operator: ''
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

          // you can refer related UI in DSDS spec
          simcardInfo = {
            enabled: true,
            absent: true,
            locked: false,
            name: _('noSimCard'),
            number: '',
            operator: ''
          };
        }
        // else if we can get mobileConnection,
        // we have to check locked / enabled state
        else {
          var icc = iccManager.getIccById(iccId);
          var iccInfo = icc.iccInfo;
          var operatorInfo = MobileOperator.userFacingInfo(conn);

          var locked = false;
          var lockedState = [
            'pinRequired',
            'pukRequired',
            'networkLocked',
            'serviceProviderLocked',
            'corporateLocked'
          ];

          // make sure the card is in locked mode or not
          if (icc.cardState.indexOf(lockedState)) {
            locked = true;
          }

          if (locked) {
            simcardInfo = {
              enabled: true,
              absent: false,
              locked: true,
              name: 'simcard' + cardIndex,
              number: '',
              operator: ''
            };
          }
          else {

            // TODO:
            // we have to call Gecko API here to make sure the
            // simcard is enabled / disabled
            simcardInfo = {
              enabled: true,
              absent: false,
              locked: locked,
              name: 'simcard' + cardIndex,
              number: iccInfo.spn || _('unknown-phoneNumber'),
              operator: operatorInfo.operator || _('no-operator')
            };
          }
        }
        this.simcards.push(simcardInfo);
      }
    },
    handleEvent: function(evt) {

      var cardIndex = evt.target.value;

      // it means users is seleting '--' options
      // when simcards are all disabled
      if (cardIndex == -1) {
        return;
      }

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

          // TODO
          // there is one more situation on UX spec p23,
          // maybe we have to handle that here.

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
      var selectors = ['name', 'number', 'operator'];

      var cardSelector = '.sim-card-' + cardIndex;
      var checkboxSelector = cardSelector + ' .simcard-checkbox';

      var cardDom =
        this.simCardContainer.querySelector(cardSelector);

      var checkboxDom =
        this.simCardContainer.querySelector(checkboxSelector);

      // reflect cardState on UI
      cardDom.classList.toggle('absent', simcardInfo.absent);
      cardDom.classList.toggle('locked', simcardInfo.locked);
      cardDom.classList.toggle('enabled', simcardInfo.enabled);

      // relflect wordings on UI
      selectors.forEach(function(selector) {

        // will generate ".sim-card-0 .sim-card-name" for example
        var targetSelector = cardSelector + ' .sim-card-' + selector;

        this.simCardContainer.querySelector(targetSelector)
          .textContent = simcardInfo[selector];
      }.bind(this));

      // reflect cardState on checkbox attributes
      checkboxDom.disabled = simcardInfo.absent || simcardInfo.locked;
      checkboxDom.checked = simcardInfo.enabled;
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

      // Because we use KVO pattern, we will update view when setting
      // values, but we have to initSimCardsInfo() before than
      // initSimCardManagerUI() to make sure the simcards count is
      // correct, in this way, we will manually call updateSimCardsUI
      // by ourselves here.
      this.isUIinitialized = true;
      this.updateSimCardsUI();
    },
    initSimCardsUI: function() {
      var simItemHTMLs = [];

      // cleanup old child nodes first
      while (this.simCardContainer.hasChildNodes()) {
        this.simCardContainer.removeChild(
          this.simCardContainer.lastChild);
      }

      // inject new childs
      this.simcards.forEach(function(simcard, index) {
        simItemHTMLs.push(
          this.simItemTemplate.interpolate({
          'sim-index': index.toString()
        }));
      }.bind(this));

      this.simCardContainer.innerHTML = simItemHTMLs.join('');
    },
    initSelectOptionsUI: function() {

      var selectedOptionIndex = 0;

      var outgoingCallSelect =
        this.simManagerOutgoingCallSelect;

      var outgoingMessagesSelect =
        this.simManagerOutgoingMessagesSelect;

      var outgoingDataSelect =
        this.simManagerOutgoingDataSelect;

      this.simcards.forEach(function(simcardInfo, index) {
        var options = [];

        for (var i = 0; i < 3; i++) {
          var option = document.createElement('option');
          option.value = index;
          option.text = simcardInfo.name;

          if (simcardInfo.absent) {
            option.value = -1;
            option.text = '--';
          }

          // select the first simcard by default
          if (index == selectedOptionIndex) {
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
