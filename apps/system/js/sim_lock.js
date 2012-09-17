/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SimLock = {
  init: function sl_init() {
    switch (window.navigator.mozMobileConnection.cardState) {
      case 'pukRequired':
      case 'pinRequired':
        var activity = new MozActivity({
          name: 'configure',
          data: {
            target: 'simpin-unlock'
          }
        });
        activity.onsuccess = function sl_unlockSuccess() {
          if (!this.result.unlock) {
            ModalDialog.alert('SIM Locked');
          }
          WindowManager.setDisplayedApp(null);
        };
        break;
      case 'ready':
      default:
        break;
    }
  }
};
