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
    pinToCard: function cm_pinToCard() {
      var activity = new MozActivity({
        name: 'pin',
        data: {
          name: 'title',
          type: 'AppBookmark',
          manifestURL: 'app://communications.gaiamobile.org/manifest.webapp',
          launchURL: 'app://communications.gaiamobile.org/onring.html',
          thumbnail: 'This is my thumbnail'
        }
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
