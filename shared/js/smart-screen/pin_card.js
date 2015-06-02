/* global evt, CardManager */

'use strict';

(function(exports) {
  function PinCard(options) {
    options = options || {};
    this.pinnedChannels = {};
    this.origin = options.origin || '';
    this.manifestURL = options.manifestURL || '';
    this.cardManager = new CardManager();
    this.cardManager.init('readonly')
                    .then(this.updatePinnedChannels.bind(this));

    // Update pinnedChannels when card-list changed
    this.cardManager.on(
                'cardlist-changed', this.updatePinnedChannels.bind(this));
  }

  var proto = Object.create(new evt());

  /**
   * Retrieve latest TV card list from card manager and update pin button
   * information.
   */
  proto.updatePinnedChannels = function pc_updatePinnedChannels() {
    this.pinnedChannels = {};
    this.cardManager.getCardList().then(function(cardList) {
      cardList.forEach(function(card) {
        var url = card.launchURL;
        if (url && url.match(new RegExp(this.origin))) {
          var channelHash = url.substring(url.indexOf('#'));
          this.pinnedChannels[channelHash] = true;
          return true;
        }
        return false;
      }.bind(this));
      this.fire('update-pin-button');
    }.bind(this));
  };

  PinCard.prototype = proto;
  exports.PinCard = PinCard;
})(window);
