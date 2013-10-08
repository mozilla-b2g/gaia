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

  if (!settings) {
    return;
  }

  debug('Query Nfc CheckBox Setting.');
  var gNfcCheckBox = document.querySelector('input[name="nfc.enabled"]');
  debug('CheckBox setting: ' + gNfcCheckBox);

  function debug(str) {
    if (DEBUG) {
      dump(' -*- Nfc Settings: ' + str + '\n');
    }
  }

  // activate main button
  gNfcCheckBox.onchange = function changeNfc() {
    debug('onChange setting: ' + gNfcCheckBox.checked);
    var enabled = true;
    if (!this.checked) {
      enabled = false;
    }

    var req = settings.createLock().set({'nfc.enabled': enabled});
    req.onerror = function() {
      debug('onChange failed to set settings...');
    };
    req.onsuccess = function() {
      // Change confirmation will re-enable UI.
      debug('onchange setting change success.');
      this.disabled = true;
    };
  };

  // Read NFC enabled setting, and update UI
  function updateNfcSettingUI() {
    var req = settings.createLock().get('nfc.enabled');
    req.onsuccess = function nfc_getSettingsSuccess() {
      var enabled = req.result['nfc.enabled'];
      if (getNfc() == null) {
        gNfcCheckBox.checked = false;
        gNfcCheckBox.disabled = true;
      } else if (enabled) {
        gNfcCheckBox.checked = true;
      } else {
        gNfcCheckBox.checked = false;
      }
    };
  }

  // enable NFC if the related settings says so
  // register an observer to monitor nfc.enabled changes
  settings.addObserver('nfc.enabled', function(event) {
    debug('NFC enabled change detected: ' + event.settingValue);
    updateNfcSettingUI();
  });

  // Watch for powerlevel settting update response
  navigator.mozSetMessageHandler('nfc-powerlevel-change',
                                 function(message) {
    debug('Re-activate NFC checkbox interaction');
    gNfcCheckBox.disabled = false;
  });

  updateNfcSettingUI();
});

