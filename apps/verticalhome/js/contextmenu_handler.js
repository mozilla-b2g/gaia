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
          if (this.canceled || app.grid._grid.dragdrop.inEditMode) {
            return;
          }

          // Prevent the click when the finger is released
          e.preventDefault();

          var resources = ['/shared/js/component_utils.js',
                           '/shared/elements/gaia_buttons/script.js',
                           '/shared/elements/gaia_menu/script.js',
                           'js/contextmenu_ui.js'];
          LazyLoader.load(resources, function loaded() {
            // pass the event through for processing
            setTimeout(() => { contextMenuUI.show(e); });
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
