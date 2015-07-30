define(function(require) {
  'use strict';

  var SIMSlotManager = require('shared/simslot_manager');
  var Messaging = require('modules/messaging');
  var SettingsPanel = require('modules/settings_panel');
  var l10n = navigator.mozL10n;

  return function ctor_messaging_details_panel() {
    var elements = {};
    var isInitialized = false;

    return SettingsPanel({
      onInit: function(panel) {
        elements.optionsContainer = panel.querySelector('.options-container');
        elements.header = panel.querySelector('gaia-header > h1');
      },
      onBeforeShow: function(panel, options) {
        var self = this;
        var injectPromise;
        var cardIndex = options.cardIndex;

        if (!isInitialized) {
          isInitialized = true;
          injectPromise =
            Messaging.injectCBSTemplate(elements.optionsContainer);
        }

        return Promise.resolve(injectPromise)
        .then(function updateElementReference() {
          // smsc is lazy-loaded
          if (!elements.smsc) {
            elements.smsc = panel.querySelector('.smsc .explanation');
          }
        })
        .then(function updateUI() {
          Messaging.initCBS(panel, cardIndex);
          Messaging.disableItems(panel);
          self._updateHeader(cardIndex);
          self._updateSmsc(cardIndex);
        })
        .catch(function(error) {
          console.error('Error : ', error);
        });
      },
      _updateHeader: function(cardIndex) {
        l10n.setAttributes(elements.header, 'messaging-sim-settings', {
          index: cardIndex + 1
        });
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
