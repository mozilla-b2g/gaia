define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var DsdsSettings = require('dsds_settings');
  var Call = require('panels/call/call');

  return function ctor_call_panel() {
    var elements = {};
    return SettingsPanel({
      onInit: function(panel) {
        elements.panel = panel;
        elements.fdnMenuItem = panel.querySelector('#menuItem-callFdn');
        elements.callForwardingMenuItem =
          panel.querySelector('#menuItem-callForwarding');
        elements.callBarringMenuItem =
          panel.querySelector('#menuItem-callBarring');
        elements.callWaitingMenuItem =
          panel.querySelector('#menuItem-callWaiting');
        elements.callerIdMenuItem =
          panel.querySelector('#menuItem-callerId');
        elements.voicemailMenuItem =
          panel.querySelector('.menuItem-voicemail');
        elements.clirSelect =
          panel.querySelector('#ril-callerId');
        elements.alertLabel =
          panel.querySelector('#menuItem-callWaiting .alert-label');
        elements.voicePrivacyMenuItem =
          panel.querySelector('#menuItem-voicePrivacyMode');

        // Set the navigation correctly when on a multi ICC card device.
        if (DsdsSettings.getNumberOfIccSlots() > 1) {
          var header = panel.querySelector('gaia-header');
          header.setAttribute('data-href', '#call-iccs');
        }

        Call._elements = elements;
      },
      onBeforeShow: function(panel, options) {
        var cardIndex = options.cardIndex || 0;
        Call.init(cardIndex);
      }
    });
  };
});
