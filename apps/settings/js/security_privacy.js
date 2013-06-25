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
    simSecurityDesc.style.fontStyle = 'italic';

    switch (mobileConnection.cardState) {
      case null:
        simSecurityDesc.textContent = _('simCardNotReady');
        simSecurityDesc.dataset.l10nId = 'simCardNotReady';
        return;
      case 'unknown':
        simSecurityDesc.textContent = _('unknownSimCardState');
        simSecurityDesc.dataset.l10nId = 'unknownSimCardState';
        return;
      case 'absent':
        simSecurityDesc.textContent = _('noSimCard');
        simSecurityDesc.dataset.l10nId = 'noSimCard';
        return;
    }

    simSecurityDesc.style.fontStyle = 'normal';
    // with SIM card, query its status
    var req = mobileConnection.getCardLock('pin');
    req.onsuccess = function spl_checkSuccess() {
      var enabled = req.result.enabled;
      simSecurityDesc.textContent = (enabled) ?
        _('enabled') : _('disabled');
      simSecurityDesc.dataset.l10nId = (enabled) ?
        'enabled' : 'disabled';
    };
  }
};

// starting when we get a chance
navigator.mozL10n.ready(function loadWhenIdle() {
  var idleObserver = {
    time: 5,
    onidle: function() {
      Security.init();
      navigator.removeIdleObserver(idleObserver);
    }
  };
  navigator.addIdleObserver(idleObserver);
});
