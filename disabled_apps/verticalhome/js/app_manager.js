/* global ConfirmDialogHelper */
/* global BookmarksDatabase */

'use strict';

(function(exports) {

  function AppManager() {
    var grid = document.querySelector('gaia-grid');
    var self = this;
    navigator.mozApps.getSelf().onsuccess = function(evt) {
      self.app = evt.target.result;
      window.dispatchEvent(new CustomEvent('appmanager-ready'));
    };

    grid.addEventListener('removeitem', this);
  }

  AppManager.prototype = {
    dialogVisible: false,

    get self() {
      return this.app;
    },

    /**
    Handles the asyncrhonous removal of items on the grid after the DOM element
    has been removed.
    */
    handleItemRemoval: function(item) {
      function errorLogger(err) {
        console.error('Error while trying to remove', item.name, err);
      }

      switch (item.detail.type) {
        case 'bookmark':
          BookmarksDatabase.remove(item.identifier).catch(errorLogger);
          break;
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
          if (this.dialogVisible) {
            return;
          }

          this.dialogVisible = true;
          if (e.detail.detail.type == 'app') {
            var request = navigator.mozApps.mgmt.uninstall(e.detail.app);
            request.onsuccess = () => {
              e.detail.removeFromGrid();
              this.dialogVisible = false;
            };
            request.onerror = () => {
              console.error('Error while trying to remove',
                            e.detail.name, request.error);
              this.dialogVisible = false;
            };
            break;
          }
          var dialog = new ConfirmDialogHelper({
            type: 'remove',
            title: {id: 'delete-title', args: nameObj},
            body: {id: 'delete-body', args: nameObj},
            cancel: {
              title: 'cancel',
              cb: () => {
                this.dialogVisible = false;
              }
            },
            confirm: {
              title: 'delete',
              type: 'danger',
              cb: () => {
                // immediately remove item from the grid!
                e.detail.removeFromGrid();

                // handle the real removal asynchronously
                this.handleItemRemoval(e.detail);

                this.dialogVisible = false;
              }
            }
          });
          dialog.show(document.body);
          break;
      }
    }
  };

  exports.appManager = new AppManager();

}(window));
