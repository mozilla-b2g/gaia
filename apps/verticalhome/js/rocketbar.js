'use strict';

/**
 * Contains logic for handling rocketbar control.
 */
(function(exports) {

  function Rocketbar() {
    window.addEventListener('context-menu-open', this);
    window.addEventListener('context-menu-close', this);
    window.addEventListener('gaia-confirm-open', this);
    window.addEventListener('gaia-confirm-close', this);
  }

  Rocketbar.prototype = {

    /**
     * Gets the urlbar control meta tag.
     */
    get urlbarControlMeta() {
      return document.head.querySelector('meta[name="urlbar-control"]');
    },

    /**
     * General event handler.
     * @param {Event}
     */
    handleEvent: function(e) {
      switch(e.type) {
        case 'gaia-confirm-open':
        case 'context-menu-open':
          this.urlbarControlMeta.setAttribute('content', 'minimized');
          break;
        case 'gaia-confirm-close':
        case 'context-menu-close':
          this.urlbarControlMeta.setAttribute('content', 'default');
          break;
      }
    }
  };

  exports.rocketbar = new Rocketbar();

}(window));
