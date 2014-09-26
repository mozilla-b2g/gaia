/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * This library displays the security status in the main panel without
 * requiring the full `screen_lock.js' + `simcard_lock.js'
 */

// display security status on the main panel
var Security = {
  _airplaneMode: false,

  init: function init() {
    var settings = navigator.mozSettings;
    if (!settings)
      return;

    // update phone code status
    var screenlockDesc = document.querySelector('.screenLock-desc');
    var lock = settings.createLock();
    var reqLockscreenEnable = lock.get('lockscreen.enabled');
    reqLockscreenEnable.onsuccess = function onLockscreenEnableSuccess() {
      var enable = reqLockscreenEnable.result['lockscreen.enabled'];
      screenlockDesc.setAttribute('data-l10n-id',
                                  enable ? 'enabled' : 'disabled');
    };

    this.updateSimLockDesc();

    var self = this;
    SettingsListener.observe('ril.radio.disabled', false, function(value) {
      self._airplaneMode = value;
      self.updateSimLockDesc();
    });

    if (!IccHelper)
      return;

    IccHelper.addEventListener('cardstatechange',
                               self.updateSimLockDesc.bind(self));
  },

  updateSimLockDesc: function updateSimLockDesc() {
    var _ = navigator.mozL10n.get;
    var mobileConnection = window.navigator.mozMobileConnections &&
        window.navigator.mozMobileConnections[0];

    if (!mobileConnection)
      return;

    if (!IccHelper)
      return;

    var simSecurityDesc = document.getElementById('simCardLock-desc');
    simSecurityDesc.style.fontStyle = 'italic';

    if (this._airplaneMode) {
      simSecurityDesc.setAttribute('data-l10n-id', 'simCardNotReady');
      return;
    }

    switch (IccHelper.cardState) {
      case null:
        simSecurityDesc.setAttribute('data-l10n-id', 'noSimCard');
        return;
      case 'unknown':
        simSecurityDesc.setAttribute('data-l10n-id', 'unknownSimCardState');
        return;
    }

    simSecurityDesc.style.fontStyle = 'normal';
    // with SIM card, query its status
    var req = IccHelper.getCardLock('pin');
    req.onsuccess = function spl_checkSuccess() {
      var enabled = req.result.enabled;
      simSecurityDesc.setAttribute('data-l10n-id',
                                   enabled ? 'enabled' : 'disabled');
    };
  }
};

// starting when we get a chance
navigator.mozL10n.once(function loadWhenIdle() {
  var idleObserver = {
    time: 5,
    onidle: function() {
      Security.init();
      navigator.removeIdleObserver(idleObserver);
    }
  };
  navigator.addIdleObserver(idleObserver);
});
