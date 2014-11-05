/* global Customizer */

'use strict';

var NfcCustomizer = (function() {
  Customizer.call(this, 'nfc', 'json');

  this.set = function(nfcParams) {
    if (!this.simPresentOnFirstBoot) {
      console.log('NfcCustomizer. No first RUN with configured SIM.');
      return;
    }

    const NFC_SETTING = 'nfc.enabled';

    var settings = navigator.mozSettings;
    if (!settings) {
      console.error('NfcCustomizer. Settings is not available');
      return;
    }

    var nfcLock = settings.createLock();
    var nfc = nfcLock.get(NFC_SETTING);

    // We only change the nfc value if the user does not changed it previously
    // The user has changed the value if the actual value of nfc is
    // different from default value.
    nfc.onsuccess = function nc_onsuccess() {
      var value = nfc.result[NFC_SETTING];
      if (value === undefined || value === nfcParams.default) {
        nfcLock.set({ 'nfc.enabled': nfcParams.isEnabled });
      }
    };
    nfc.onerror = function wc_onerror() {
      console.error('Error retrieving ' + NFC_SETTING + '. ' +
                    nfc.error.name);
    };

  };
});

var nfcCustomizer = new NfcCustomizer();
nfcCustomizer.init();
