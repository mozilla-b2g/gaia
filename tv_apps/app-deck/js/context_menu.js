'use strict';

/* global MozActivity, Applications, SharedUtils */
/* jshint nonew: false */

(function(exports) {
  var ContextMenu = function() {
  };

  ContextMenu.prototype = {
    pinToHomeElem: document.getElementById('pin-to-home'),
    mainSection: document.getElementById('main-section'),
    removeElem: document.getElementById('remove-card'),
    contextMenuElem: document.getElementById('context-menu'),

    _appDeck: undefined,
    _app: undefined,

    init: function cm_init(appDeck) {
      this.mainSection.addEventListener('contextmenu',
        this.onContextMenu.bind(this));

      this._appDeck = appDeck;
      this._appDeck.on('focus-on-pinable', this.onFocusOnPinable.bind(this));
      this._appDeck.on('focus-on-nonpinable',
        this.onFocusOnNonpinable.bind(this));

      this.pinToHomeElem.addEventListener('click', this.pinOrUnpin.bind(this));
      this.removeElem.addEventListener('click', this.uninstall.bind(this));
    },

    _selfApp: undefined,

    _connectAndSend: function cm_sendMessage(message) {
      this._selfApp.connect('appdeck-channel').then(function (ports) {
        ports.forEach(function(port) {
          port.postMessage(message);
        });
      });
    },

    sendMessage: function cm_sendMessage(type, data) {
      var that = this;
      var message = {
        type: type,
        data: data
      };

      if (this._selfApp) {
        this._connectAndSend(message);
      } else {
        navigator.mozApps.getSelf().onsuccess = function(evt) {
          that._selfApp = evt.target.result;
          that._connectAndSend(message);
        };
      }
    },

    _composeLaunchURL: function cm_composeLaunchURL(app) {
      return app.manifestURL.replace('manifest.webapp', '') + app.entryPoint;
    },

    _sendUnpinMessage: function cm_sendUnpinActivity(app) {
      // Notice that here we didn't specify launchURL because we assume all
      // 'Application' in app-deck are launched by calling app.launch().
      // However, in the case of other deck-like app, if we are going to pin
      // application which is launched by different launchURL, we must specify
      // 'launchURL' here.
      this.sendMessage('unpin', {
        manifestURL: app.manifestURL
      });
    },

    pinOrUnpin: function cm_pinOrUnpin() {
      if (this._app) {
        var app = this._app;
        if (app.pinned) {
          this._sendUnpinMessage(app);
        } else {
          // XXX: preferredSize should be determined by
          // real offsetWidth of cardThumbnailElem in smart-home instead of
          // hard-coded value
          Applications.getIconBlob(app.manifestURL, app.entryPoint, 354,
            function(blob) {
              // Notice that here we didn't specify launchURL because we assume
              // all 'Application' in app-deck are launched by calling
              // app.launch().
              // However, in the case of other deck-like app, if we are going to
              // pin application which is launched by different launchURL, we
              // must specify 'launchURL' here.
              new MozActivity({
                name: 'pin',
                data: {
                  type: 'Application',
                  group: 'app',
                  manifestURL: app.manifestURL,
                  // We use app's original icon instead of screenshot here
                  // because we are in app deck. For the case of getting
                  // screenshot, please refer to bug 1100238.
                  thumbnail: blob
                }
              });

            });
        }
      }
    },

    uninstall: function cm_uninstall() {
      if (this._app && this._app.removable) {
        var app = this._app;
        // unpin app before uninstall it
        if (app.pinned) {
          this._sendUnpinMessage(app);
        }
        var appInstance = Applications.installedApps[app.manifestURL];
        if (appInstance) {
          navigator.mozApps.mgmt.uninstall(appInstance);
        }
      }
    },

    onFocusOnPinable: function cm_onFocusOnPinable(detail) {
      this._app = detail;
      var l10nPayload =
        (detail && detail.pinned) ? 'unpin-from-home' : 'pin-to-home';
      SharedUtils.localizeElement(this.pinToHomeElem, l10nPayload);
      if (detail.removable === false) {
        this.contextMenuElem.removeChild(this.removeElem);
      } else {
        this.contextMenuElem.insertBefore(this.removeElem,
          this.pinToHomeElem.nextElementSibling);
      }
    },

    onFocusOnNonpinable: function cm_onFocusOnNonpinable() {
      this._app = undefined;
    },

    onContextMenu: function cm_onContextMenu(evt) {
      // stop showing context menu if we are not focus on pinable element
      if (!this._app) {
        evt.preventDefault();
      }
    }
  };

  exports.ContextMenu = ContextMenu;
})(window);
