/* global ConfirmDialogHelper */
'use strict';

(function(exports) {

  function AppManager() {
    var self = this;
    navigator.mozApps.getSelf().onsuccess = function(evt) {
      self.app = evt.target.result;
      window.dispatchEvent(new CustomEvent('appmanager-ready'));
    };
    window.addEventListener('gaiagrid-uninstall-mozapp', this);
    window.addEventListener('gaiagrid-add-to-collection', this);
  }

  AppManager.prototype = {
    get self() {
      return this.app;
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
        case 'gaiagrid-uninstall-mozapp':
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
              cb: function() {
                navigator.mozApps.mgmt.uninstall(e.detail.app);
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
