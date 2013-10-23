'use strict';

(function(exports) {

  var _ = window.navigator.mozL10n.get;

  /*
   * Main Entry
   */
  var SimCardManager = {
    init: function() {

      this.simcards = [];

      // init DOM related stuffs
      this.setAllElements();
      this.simItemTemplate = new Template(this.simCardTmpl);

      // `handleEvent` is used to handle these sim related changes
      this.simManagerOutgoingCallSelect.addEventListener('change', this);
      this.simManagerOutgoingMessagesSelect.addEventListener('change', this);
      this.simManagerOutgoingDataSelect.addEventListener('change', this);

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
            iccId: '11111',
            name: 'SIM 1',
            number: '0123456789',
            operator: 'Chunghwa Telecom'
          },
          {
            enabled: true,
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

          simcardInfo = {
            enabled: true,
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
          Settings.set('outgoingCall').on(cardIndex);
          break;

        case this.simManagerOutgoingMessagesSelect:
          Settings.set('outgoingMessages').on(cardIndex);
          break;

        case this.simManagerOutgoingDataSelect:

          // UX needs additional hint for users to make sure
          // they really want to change data connection
          var wantToChange = window.confirm(_('change-outgoing-data-confirm'));

          if (wantToChange) {
            Settings.set('outgoingData').on(cardIndex);
          }
          else {
            var previousCardIndex = (cardIndex == 0) ? 1 : 0;
            this.simManagerOutgoingDataSelect.selectedIndex = previousCardIndex;
          }
          break;
      }
    },
    getSimCardsCount: function() {
      return this.simcards.length;
    },
    getSimCardInfo: function(cardIndex) {
      return this.simcards[cardIndex];
    },
    updateSimCardInfo: function(cardIndex, newInfo) {
      for (var infoKey in newInfo) {
        this.simcards[cardIndex][infoKey] = newInfo[infoKey];
      }
    },
    updateSimCardUI: function(cardIndex) {
      var simcardInfo = this.getSimCardInfo(cardIndex);

      var cardSelector = '.sim-card-' + cardIndex;
      var selectors = [
        'name',
        'number',
        'operator'
      ];

      this.simCardContainer.querySelector(cardSelector)
        .classList.toggle('enabled', simcardInfo.enabled);

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
      this.updateSimCardsUI();
      this.updateSelectOptionsUI();
    },
    updateSimCardsUI: function() {
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
          // for initial checkbox attribute
          'sim-checked': (simcard.enabled) ? 'checked' : ''
        }));
      }.bind(this));

      this.simCardContainer.innerHTML = simItemHTMLs.join('');
    },
    updateSelectOptionsUI: function(selectedIndex) {

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

  /*
   *  This is a helper which supplies more semantics
   *  to set something on mozSettings
   */
  var Settings = {
    set: function(serviceName) {
      // cleanup old keys first
      this.settingKeys = [];

      switch (serviceName) {
      case 'outgoingCall':
        this.settingKeys.push('ril.telephony.defaultServiceId');
        this.settingKeys.push('ril.voicemail.defaultServiceId');
        break;

      case 'outgoingMessages':
        this.settingKeys.push('ril.sms.defaultServiceId');
        break;

      case 'outgoingData':
        this.settingKeys.push('ril.mms.defaultServiceId');
        this.settingKeys.push('ril.data.defaultServiceId');
        break;
      }

      return this;
    },
    on: function(cardIndex) {
      this.settingKeys.forEach(function(key) {
        this.setToSettingsDB(key, cardIndex);
      }.bind(this));
    },
    setToSettingsDB: function(key, newValue, callback) {
      var done = function done() {
        if (callback) {
          callback();
        }
      };

      var settings = window.navigator.mozSettings;
      var getLock = settings.createLock();
      var getReq = getLock.get(key);

      getReq.onsuccess = function() {
        var oldValue = getReq.result[key];
        if (oldValue !== newValue) {
          var setLock = settings.createLock();
          var setReq = setLock.set({
            key: newValue
          });

          setReq.onsuccess = done;
          setReq.onerror = done;
        }
        else {
          done();
        }
      };
      getReq.onerror = done;
    }
  };

  exports.SimCardManager = SimCardManager;

})(window);

window.navigator.mozL10n.ready(SimCardManager.init.bind(SimCardManager));
