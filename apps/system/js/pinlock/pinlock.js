/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var PinLock = {
  init: function pl_init() {
    switch (window.navigator.mozMobileConnection.cardState) {
      case 'pukRequired':
      case 'pinRequired':
        dump("==== in ready status");
        var activity = new MozActivity({
          name: 'configure',
          data: { 
            target: 'simpin-unlock' 
          }
        });
        activity.onsuccess = function sp_unlockSuccess() {
          dump("==== unlock result"+ this.result.unlock);
          if (!this.result.unlock) {
            window.alert('SIM Locked');
          }
        };
        activity.onerror = function sp_unlockError() {
          dump("==== unlock error");
        };
        break;
      case 'ready':
      default:
        break;
    }
  }
};
