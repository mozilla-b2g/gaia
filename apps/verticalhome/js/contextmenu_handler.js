'use strict';
/* global LazyLoader, contextMenuUI */

(function(exports) {

  function ContextMenuHandler() {
    this.container = document.getElementById('icons').parentNode;
    this.container.addEventListener('contextmenu', this);
    this.container.addEventListener('touchstart', this);
    window.addEventListener('hashchange', this);
  }

  ContextMenuHandler.prototype = {
    handleEvent: function(e) {
      switch(e.type) {
        case 'touchstart':
          this.canceled = e.touches.length > 1;
          break;

        case 'contextmenu':
          if (this.canceled) {
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
