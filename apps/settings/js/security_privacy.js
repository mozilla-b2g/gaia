/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * This library displays the security status in the main panel without
 * requiring the full `phone_lock.js' + `simcard_lock.js'
 */

// display scurity status on the main panel
var Security = {
  init: function init() {
    var _ = navigator.mozL10n.get;
    var settings = navigator.mozSettings;
    if (!settings)
      return;

    // update phone code status
    var phonelockDesc = document.getElementById('phoneLock-desc');
    var lock = settings.createLock();
    var reqLockscreenEnable = lock.get('lockscreen.enabled');
    reqLockscreenEnable.onsuccess = function onLockscreenEnableSuccess() {
      var enable = reqLockscreenEnable.result['lockscreen.enabled'];
      phonelockDesc.textContent = enable ? _('enabled') : _('disabled'); 
      phonelockDesc.dataset.l10nId = enable ? 'enabled' : 'disabled';
    };
  }
};

// startup
onLocalized(Security.init);

