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

    var mobileConnection = navigator.mozMobileConnection;
    if (!mobileConnection)
      return;

    var simSecurityDesc = document.getElementById('simCardLock-desc');

    if (mobileConnection.cardState === 'absent') {
      simSecurityDesc.textContent = _('noSimCard');
      return;
    }
    // with SIM card, query its status
    var req = mobileConnection.getCardLock('pin');
    req.onsuccess = function spl_checkSuccess() {
      var enabled = req.result.enabled;
      simSecurityDesc.textContent = (enabled) ?
        _('enabled') : _('disabled');
    };
  }
};

// startup
navigator.mozL10n.ready(Security.init);

