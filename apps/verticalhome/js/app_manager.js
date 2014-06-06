'use strict';

(function(exports) {

  function AppManager() {
    var self = this;
    navigator.mozApps.getSelf().onsuccess = function(evt) {
      self.app = evt.target.result;
      window.dispatchEvent(new CustomEvent('appmanager-ready'));
    };
  }

  AppManager.prototype = {
    get self() {
      return this.app;
    }
  };

  exports.appManager = new AppManager();

}(window));
