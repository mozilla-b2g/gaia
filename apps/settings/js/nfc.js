/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Copyright © 2013, Deutsche Telekom, Inc. */

'use strict';

// handle Nfc settings
navigator.mozL10n.ready(function nfcSettings() {
  var DEBUG = true;

  var _ = navigator.mozL10n.get;
  var settings = Settings.mozSettings;

  // NFC Power states
  const NFC_POWER_LEVEL_DISABLED = 0;
  const NFC_POWER_LEVEL_LOW = 1;
  const NFC_POWER_LEVEL_ENABLED = 2;

  var lastMozSettingValue = NFC_POWER_LEVEL_DISABLED;

  if (!settings) {
    return;
  }

  debug('Query Nfc CheckBox Setting.');
  var gNfcCheckBox = document.querySelector('input[name="nfc.powerlevel"]');
  debug('CheckBox setting: ' + gNfcCheckBox);

  function debug(str) {
    if (DEBUG) {
      dump(' -*- Nfc Settings: ' + str + '\n');
    }
  }

  function handleNfcPowerMessage(message) {
    debug('Re-enable NFC checkbox');
    gNfcCheckBox.disabled = false;
  }

  // activate main button
  gNfcCheckBox.onchange = function changeNfc() {
    debug('onChange setting: ' + gNfcCheckBox.checked);
    var powerlevel = NFC_POWER_LEVEL_ENABLED;
    if (!this.checked) {
      powerlevel = NFC_POWER_LEVEL_DISABLED;
    }

    var req = settings.createLock().set({'nfc.powerlevel': powerlevel});
    req.onerror = function() {
      debug('onChange failed to set settings...');
    };
    req.onsuccess = function() {
      // Change confirmation will re-enable UI.
      debug('onchange setting change success.');
      this.disabled = true;
    };
  };

  // Read NFC powerlevel setting, and update UI
  function updateNfcSettingUI() {
    var req = settings.createLock().get('nfc.powerlevel');
    req.onsuccess = function nfc_getSettingsSuccess() {
      lastMozSettingValue = req.result['nfc.powerlevel'];
    };
    if (getNfc() == null) {
      gNfcCheckBox.checked = false;
      gNfcCheckBox.disabled = true;
    } else if (lastMozSettingValue != NFC_POWER_LEVEL_DISABLED) {
      gNfcCheckBox.checked = true;
    } else {
      gNfcCheckBox.checked = false;
    }
  }

  // enable NFC if the related settings says so
  // register an observer to monitor nfc.powerlevel hanges
  settings.addObserver('nfc.powerlevel', function(event) {
    if (lastMozSettingValue == event.settingValue) {
      debug('Doing nothing, lastMozSettingValue: ' + lastMozSettingValue);
      return;
    }
    lastMozSettingValue = event.settingValue;
    updateNfcSettingUI();
  });
  // Watch for settting apply update response
  navigator.mozSetMessageHandler('nfc-powerlevel-change',
                                 handleNfcPowerMessage);

  updateNfcSettingUI();
});

