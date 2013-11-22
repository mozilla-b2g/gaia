/* Copyright © 2013, Deutsche Telekom, Inc. */

'use strict';

// handle Nfc settings
navigator.mozL10n.ready(function nfcSettings() {
  // Check if NFC is available on platform, and update UI
  document.getElementById('nfc-settings').hidden = !getNfc();
});

