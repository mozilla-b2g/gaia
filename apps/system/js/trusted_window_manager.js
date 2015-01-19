/* global Service */

'use strict';
(function(exports) {

  function TrustedWindowManager() {
    this.pool = {};
  }

  TrustedWindowManager.prototype = {
    name: 'TrustedWindowManager',
    DEBUG: false,
    CLASS_NAME: 'TrustedWindowManager',

    debug: function tw_debug() {
      if (this.DEBUG) {
        console.log('[' + this.CLASS_NAME + ']' +
          '[' + Service.currentTime() + ']' +
          Array.slice(arguments).concat());
      }
    },

    start: function tw_start() {
      window.addEventListener('trustedopened', this);
      window.addEventListener('killtrusted', this);
    },

    stop: function tw_stop() {
      window.removeEventListener('trustedopened', this);
      window.removeEventListener('killtrusted', this);
    },

    handleEvent: function tw_handleEvent(evt) {
      var requestId;
      switch(evt.type) {
        case 'trustedopened':
          requestId = evt.detail.config.requestId;
          this.pool[requestId] = evt.detail;
          this.publish('-activated');
          break;
        case 'killtrusted':
          requestId = evt.detail.requestId;
          if (this.pool[requestId]) {
            this.pool[requestId].kill();
            delete this.pool[requestId];
            this.publish('-deactivated');
          }
          break;
      }
    },
    publish: function(evtName) {
      window.dispatchEvent(new CustomEvent(this.EVENT_PREFIX + evtName, {
        detail: this
      }));
    }
  };

  exports.TrustedWindowManager = TrustedWindowManager;
}(window));
