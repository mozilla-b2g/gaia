'use strict';

/* global MozActivity, Applications */

(function(exports) {
  var ContextMenu = function() {
  };

  ContextMenu.prototype = {
    pinToHomeElem: document.getElementById('pin-to-home'),
    mainSection: document.getElementById('main-section'),

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
    },

    pinOrUnpin: function cm_pinOrUnpin() {
      if (this._app) {
        var app = this._app;
        var launchURL = this._app.manifestURL.replace('manifest.webapp', '') +
          this._app.entryPoint;

        if (app.pinned) {
          new MozActivity({
            name: 'unpin',
            data: {
              name: app.name,
              manifestURL: app.manifestURL,
              launchURL: launchURL
            }
          });
        } else {
          // XXX: preferredSize should be determined by
          // real offsetWidth of cardThumbnailElem in smart-home instead of
          // hard-coded value
          Applications.getIconBlob(app.manifestURL, app.entryPoint, 354,
            function(blob) {
              new MozActivity({
                name: 'pin',
                data: {
                  name: app.name,
                  type: 'Application',
                  manifestURL: app.manifestURL,
                  launchURL: launchURL,
                  // We use app's original icon instead of screenshot here because
                  // we are in app deck. For the case of getting screenshot,
                  // please refer to bug 1100238.
                  thumbnail: blob
                }
              });
            });
        }
      }
    },

    onFocusOnPinable: function cm_onFocusOnPinable(detail) {
      this._app = detail;
      // XXX: According to http://goo.gl/Spol9H, we should avoid using
      // mozL10n.get() as much as possible. But since system app use 'label'
      // to render menuitem, we are still using mozL10n.get here until we have
      // better way to resolve this
      var l10nId =
        (detail && detail.pinned) ? 'unpin-from-home' : 'pin-to-home';
      this.pinToHomeElem.label = navigator.mozL10n.get(l10nId);
      this.pinToHomeElem.setAttribute('data-l10n-id', l10nId);
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
