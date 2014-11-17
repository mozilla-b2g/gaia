'use strict';

/* global MozActivity, home */
(function(exports) {

  // XXX: This is a test object for pin to card feature.
  // Move it into AppDeck once it's landed.
  var ContextMenu = {
    menuTarget: null,
    pinToCardElem: document.getElementById('pin-to-card'),
    removeCardElem: document.getElementById('remove-card'),
    mainSection: document.getElementById('main-section'),

    init: function cm_init() {
      this.pinToCardElem.addEventListener('click', this.pinToCard.bind(this));
      this.removeCardElem.addEventListener('click', this.removeCard.bind(this));
    },

    uninit: function cm_uninit() {
      this.mainSection.removeEventListener('contextmenu', this);
    },

    // XXX: We should move this function to AppDeck with appropriate parameters
    // once it's finished.
    pinToCard: function cm_pinToCard() {
      new Promise(function(resolve, reject) {
        navigator.mozApps.getSelf().onsuccess = function(evt) {
          resolve(evt.target.result);
        };
      }).then(function(app) {
        return app.connect('screenshot');
      }).then(function(ports) {
        return new Promise(function(resolve, reject) {
          var port = ports[0];
          port.postMessage({
            name: 'screenshot',
            data: {
              url: window.location.href,
              maxWidth: 300,
              maxHeight: 300
            }
          });
          port.onmessage = function(message) {
            resolve(message.data);
            this.close();
          };
        });
      }).then(function(background) {
        new MozActivity({
          name: 'pin',
          data: {
            name: 'title',
            type: 'AppBookmark',
            manifestURL: 'app://communications.gaiamobile.org/manifest.webapp',
            launchURL: 'app://communications.gaiamobile.org/onring.html',
            thumbnail: background
          }
        });
      });
    },
    removeCard: function cm_removeCard() {
      var scrollable = home.focusScrollable;
      if (scrollable) {
        var target = home.focusScrollable.currentItem;
        home.cardManager.removeCard(home.cardManager.findCardFromCardList(
                                              {cardId: target.dataset.cardId}));
      }
    }
  };
  ContextMenu.init();
  exports.ContextMenu = ContextMenu;
})(window);
