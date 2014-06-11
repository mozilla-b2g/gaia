'use strict';
/* global LazyLoader, contextMenuUI */

(function(exports) {

  function ContextMenuHandler() {
    this.container = document.getElementById('icons').parentNode;
    this.container.addEventListener('contextmenu', this);
    this.container.addEventListener('click', this);
    window.addEventListener('hashchange', this);
  }

  ContextMenuHandler.prototype = {
    handleEvent: function(e) {
      switch(e.type) {
        case 'tap':
          break;
        case 'contextmenu':
          // Prevent the click when the finger is released
          console.log(e);
          e.preventDefault();
          var resources = ['js/contextmenu_ui.js'];
          LazyLoader.load(resources, function loaded() {
            contextMenuUI.show(e);
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
