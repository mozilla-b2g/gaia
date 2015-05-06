define(function(require) {
  'use strict';

  var SIMSlotManager = require('shared/simslot_manager');
  var MobileOperator = require('shared/mobile_operator');
  var Messaging = require('modules/messaging');
  var SettingsPanel = require('modules/settings_panel');
  var SettingsService = require('modules/settings_service');

  var settings = window.navigator.mozSettings;

  return function ctor_messaing_panel() {
    var elements = {};

    return SettingsPanel({
      onInit: function(panel) {
        elements.optionsContainer = panel.querySelector('.options-container');
        elements.simcardsContainer = panel.querySelector('.simcards-container');
        elements.sim1 = panel.querySelector('.sim1');
        elements.sim2 = panel.querySelector('.sim2');

        if (!SIMSlotManager.isMultiSIM()) {
          return Promise.resolve()
          .then(Messaging.injectCBSTemplate(elements.optionsContainer))
          .then(Messaging.initCBS.bind(Messaging, panel, 0))
          .then(Messaging.disableItems.bind(Messaging, panel))
          .then(function() {
            // smsc is lazy-loaded
            if (!elements.smsc) {
              elements.smsc = panel.querySelector('.smsc .explanation');
            }
          })
          .then(this._updateSmsc.bind(null, 0))
          .then(this._initDeliveryReportSettings);
        }
      },
      onBeforeShow: function(panel) {
        if (SIMSlotManager.isMultiSIM()) {
          return Promise.resolve()
          .then(Messaging.disableItems.bind(Messaging, panel))
          .then(this._showDsds)
          .then(this._initDeliveryReportSettings)
          .then(this._initCarrierNames.bind(this))
          .then(this._bindSimcardsClickEvent.bind(this));
        }
      },
      _navigate: function(cardIndex) {
        SettingsService.navigate('messaging-details', {
          cardIndex: cardIndex
        });
      },
      _bindSimcardsClickEvent: function() {
        var max = SIMSlotManager.getSlots().length;
        for (var cardIndex = 0; cardIndex < max; cardIndex++) {
          var simNode = elements['sim' + (cardIndex + 1)];
          if (!simNode.hasAttribute('aria-disabled')) {
            simNode.onclick = this._navigate.bind(this, cardIndex);
          }
        }
      },
      _initDeliveryReportSettings: function() {
        var requestStatusReportKeyForSms =
          'ril.sms.requestStatusReport.enabled';
        var requestStatusReportKeyForMms =
          'ril.mms.requestStatusReport.enabled';

        function setDeliveryReportSetting(key, value) {
          var lock = settings.createLock();
          var setting = {};
          setting[key] = value;
          lock.set(setting);
        }

        // Since delivery report for sms/mms should be the same, sync the value
        // while initializing.
        var request = settings.createLock().get(requestStatusReportKeyForSms);
        request.onsuccess = function onSuccessCb() {
          setDeliveryReportSetting(requestStatusReportKeyForMms,
            request.result[requestStatusReportKeyForSms]);
        };
        // Keep both setting synced.
        settings.addObserver(
          requestStatusReportKeyForSms, function addObserverCb(event) {
            setDeliveryReportSetting(requestStatusReportKeyForMms,
              event.settingValue);
        });
      },
      _initCarrierNames: function() {
        var max = SIMSlotManager.getSlots().length;

        for (var cardIndex = 0; cardIndex < max; cardIndex++) {
          var simNode = elements['sim' + (cardIndex + 1)];
          var holderNode = simNode.querySelector('small');
          var conn = SIMSlotManager.getMobileConnection(cardIndex);
          var operatorInfo = MobileOperator.userFacingInfo(conn);
          holderNode.textContent = operatorInfo.operator || '';
        }
      },
      _showDsds: function() {
        var max = SIMSlotManager.getSlots().length;

        for (var cardIndex = 0; cardIndex < max; cardIndex++) {
          var simNode = elements['sim' + (cardIndex + 1)];
          if (SIMSlotManager.isSIMCardAbsent(cardIndex)) {
            simNode.setAttribute('aria-disabled', true);
          } else {
            simNode.removeAttribute('aria-disabled');
          }
        }
        elements.simcardsContainer.hidden = false;
      },
      _updateSmsc: function(cardIndex) {
        // cleanup first
        elements.smsc.innerHTML = '';

        SIMSlotManager.get(cardIndex).getSmsc(function(result) {
          if (result) {
            var bdi = document.createElement('bdi');
            bdi.textContent = result;
            elements.smsc.appendChild(bdi);
          } else {
            elements.smsc.setAttribute('data-l10n-id', 'unknown-SMSC');
          }
        });
      }
    });
  };
});
