/* Copyright © 2013, Deutsche Telekom, Inc. */

'use strict';

// handle Nfc settings
navigator.mozL10n.ready(function nfcSettings() {
  var DEBUG = false;

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

  // Read NFC enabled setting, and update UI
  function updateNfcSettingUI() {
    var req = settings.createLock().get('nfc.enabled');
    req.onsuccess = function nfc_getSettingsSuccess() {
      var enabled = req.result['nfc.enabled'];
      if (getNfc() == null) {
        gNfcCheckBox.checked = false;
        document.querySelector('#nfc-settings').hidden = true;
      } else {
        document.querySelector('#nfc-settings').hidden = false;
        gNfcCheckBox.checked = enabled;
      }
    };
  }

  updateNfcSettingUI();
});

