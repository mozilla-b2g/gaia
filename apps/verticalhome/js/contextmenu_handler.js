'use strict';
/* global LazyLoader, contextMenuUI */

(function(exports) {

  function ContextMenuHandler() {
    this.container = document.getElementById('icons').parentNode;
    this.container.addEventListener('contextmenu', this);
    window.addEventListener('hashchange', this);
    this.enable();
    window.addEventListener('gaiagrid-zoom-begin', this.disable.bind(this));
    window.addEventListener('gaiagrid-zoom-finish', this.enable.bind(this));
  }

  ContextMenuHandler.prototype = {
    /**
     * This enables the context menu operation.
     */
    enable: function() {
      this.enabled = true;
    },

    /**
     * This will effectively disable context menu.
     */
    disable: function() {
      this.enabled = false;
    },

    handleEvent: function(e) {
      switch(e.type) {
        case 'contextmenu':
          if (!this.enabled) {
            return;
          }

          // Prevent the click when the finger is released
          e.preventDefault();

          var resources = ['js/contextmenu_ui.js'];
          LazyLoader.load(resources, function loaded() {
            contextMenuUI.show();
          });

          break;

        case 'hashchange':
          window.contextMenuUI && contextMenuUI.hide();

          break;
      }
    }
  };

  exports.contextMenuHandler = new ContextMenuHandler();

}(window));
