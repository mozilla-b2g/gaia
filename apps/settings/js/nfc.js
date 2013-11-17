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

  function debug(str) {
    if (DEBUG) {
      dump(' -*- Nfc Settings: ' + str + '\n');
    }
  }

  // Check if NFC is available on platform, and update UI
  function updateNfcSettingUI() {
    if (getNfc() == null) {
      var nfcCheckBox = document.getElementById('nfc-input');
      nfcCheckBox.checked = false;
      document.getElementById('nfc-settings').hidden = true;
      return;
    } else {
      document.getElementById('nfc-settings').hidden = false;
    }
  }

  updateNfcSettingUI();
});

