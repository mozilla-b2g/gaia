'use strict';

/* global MozActivity, Applications */

(function(exports) {
  var ContextMenu = function() {
  };

  ContextMenu.prototype = {
    pinToHomeElem: document.getElementById('pin-to-home'),
    mainSection: document.getElementById('main-section'),

    _appDeck: undefined,
    _appToPin: undefined,

    init: function cm_init(appDeck) {
      this._appDeck = appDeck;
      this._appDeck.on('focus-on-pinable', this.onFocusOnPinable.bind(this));
      this._appDeck.on('focus-on-nonpinable', this.onFocusOnNonpinable.bind(this));
      this.pinToHomeElem.addEventListener('click', this.pinToHome.bind(this));
    },

    uninit: function cm_uninit() {
      this.mainSection.removeEventListener('contextmenu', this);
    },

    pinToHome: function cm_pinToHome() {
      if (this._appToPin) {
        var app = this._appToPin;
        // XXX: preferredSize should be determined by
        // real offsetWidth of cardThumbnailElem in smart-home instead of
        // hard-coded value
        Applications.getIconBlob(app.manifestURL, app.entryPoint, 200,
          function(blob) {
            new MozActivity({
              name: 'pin',
              data: {
                name: app.name,
                type: 'Application',
                manifestURL: app.manifestURL,
                launchURL: app.manifestURL + app.entryPoint,
                // We use app's original icon instead of screenshot here because
                // we are in app deck. For the case of getting screenshot,
                // please refer to bug 1100238.
                thumbnail: blob
              }
            });
          });
      }
    },

    onFocusOnPinable: function cm_onFocusOnPinable(detail) {
      this._appToPin = detail;
    },

    onFocusOnNonpinable: function cm_onFocusOnNonpinable() {
      this._appToPin = undefined;
    }
  };

  exports.ContextMenu = ContextMenu;
})(window);
