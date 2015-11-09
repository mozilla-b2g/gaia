/* global ConfirmDialogHelper */

'use strict';

(function(exports) {

  function MoreAppsManager() {
    var grid = document.querySelector('gaia-grid-rs');
    var self = this;
    navigator.mozApps.getSelf().onsuccess = function(evt) {
      self.app = evt.target.result;
      window.dispatchEvent(new CustomEvent('moreapps-manager-ready'));
    };

    grid.addEventListener('removeitem', this);
  }

  MoreAppsManager.prototype = {
    get self() {
      return this.app;
    },

    /**
    Handles the asyncrhonous removal of items on the grid after the DOM element
    has been removed.
    */
    handleItemRemoval: function(item) {
      switch (item.detail.type) {
        default:
          console.error(
            'Cannot handle remove for item type ',
            item.detail.type
          );
      }
    },

    /**
     * General event handler.
     */
    handleEvent: function(e) {
      var nameObj = {
        name: e.detail && e.detail.name
      };

      switch(e.type) {
        case 'removeitem':
          if (e.detail.detail.type == 'app') {
            var request = navigator.mozApps.mgmt.uninstall(e.detail.app);
            request.onsuccess = () => {
              e.detail.removeFromGrid();
            };
            request.onerror = () => {
              console.error('Error while trying to remove',
                            e.detail.name, request.error);
            };
            break;
          }
          var dialog = new ConfirmDialogHelper({
            type: 'remove',
            title: {id: 'delete-title', args: nameObj},
            body: {id: 'delete-body', args: nameObj},
            cancel: {
              title: 'cancel'
            },
            confirm: {
              title: 'delete',
              type: 'danger',
              cb: () => {
                // immediately remove item from the grid!
                e.detail.removeFromGrid();

                // handle the real removal asynchronously
                this.handleItemRemoval(e.detail);
              }
            }
          });
          dialog.show(document.body);
          break;
      }
    }
  };

  exports.moreAppsManager = new MoreAppsManager();

}(window));
