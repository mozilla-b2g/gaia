/* global ConfirmDialogHelper */
/* global BookmarksDatabase */
/* global CollectionsDatabase */

'use strict';

(function(exports) {

  function AppManager() {
    var grid = document.querySelector('gaia-grid');
    var self = this;
    navigator.mozApps.getSelf().onsuccess = function(evt) {
      self.app = evt.target.result;
      window.dispatchEvent(new CustomEvent('appmanager-ready'));
    };

    window.addEventListener('gaiagrid-add-to-collection', this);
    grid.addEventListener('removeitem', this);
  }

  AppManager.prototype = {
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
        case 'collection':
          CollectionsDatabase.remove(item.identifier).catch(errorLogger);
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
      var _ = navigator.mozL10n.get;

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
            title: _('delete-title', nameObj),
            body: _('delete-body', nameObj),
            cancel: {
              title: _('cancel')
            },
            confirm: {
              title: _('delete'),
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

        case 'gaiagrid-add-to-collection':
          this.sendEventToCollectionApp('add-to-collection', e.detail);
          break;
      }
    },

    sendEventToCollectionApp: function(eventName, message) {
      var onAppReady = function(app) {
        app.connect(eventName).then(
          function onConnectionAccepted(ports) {
            ports.forEach(function(port) {
              port.postMessage(message);
            });
          }, function onConnectionRejected() {
            console.error('Cannot connect to collection app');
          }
        );
      };

      if (!this.app) {
        window.addEventListener('appmanager-ready', function onReady() {
          window.removeEventListener('appmanager-ready', onReady);
          onAppReady(this.app);
        }.bind(this));
      } else {
        onAppReady(this.app);
      }
    },
  };

  exports.appManager = new AppManager();

}(window));
