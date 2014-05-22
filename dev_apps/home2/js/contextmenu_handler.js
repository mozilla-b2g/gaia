'use strict';
/* global LazyLoader, contextMenuUI */

(function(exports) {

  function ContextMenuHandler() {
    window.addEventListener('contextmenu', this);
    window.addEventListener('hashchange', this);
  }

  ContextMenuHandler.prototype = {
    handleEvent: function(e) {
      switch(e.type) {
        case 'contextmenu':
          // Prevent the click when the finger is released
          e.preventDefault();

          var contextMenuEl = document.getElementById('contextmenu-dialog');
          var resources = ['style/css/contextmenu.css',
                           'shared/style/action_menu.css',
                            contextMenuEl,
                           'js/contextmenu_ui.js'];
          LazyLoader.load(resources, function loaded() {
            navigator.mozL10n.translate(contextMenuEl);
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
