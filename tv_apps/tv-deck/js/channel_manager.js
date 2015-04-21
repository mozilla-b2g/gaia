/* global CardManager, MozActivity */

'use strict';

(function(exports) {

  /**
   * ChannelManager implements pin/unpin card to/from home funcitons and
   * update pin button information in both button-group-panel and contextmenu.
   */
  function ChannelManager(tvDeck) {

    this._tvDeck = tvDeck;
    // Maintain a list of pinned channels.
    this.pinnedChannels = {};
    this.cardManager = new CardManager();
    this.cardManager.init('readonly')
                    .then(this.updatePinnedChannels.bind(this));

    // Determine whether a card should be pinned or unpinned.
    document.addEventListener('contextmenu', this.updatePinButton.bind(this));

    // Update pinnedChannels when card-list changed
    this.cardManager.on(
                'cardlist-changed', this.updatePinnedChannels.bind(this));
  }

  var proto = {};

  /**
   * Retrieve latest TV card list from card manager and update pin button
   * information.
   */
  proto.updatePinnedChannels = function cm_updatePinnedChannels() {
    this.pinnedChannels = {};
    this.cardManager.getCardList().then(function(cardList) {
      cardList.forEach(function(card) {
        var url = card.launchURL;
        if (url && url.match(new RegExp(this._tvDeck.origin))) {
          var channelHash = url.substring(url.indexOf('#') + 1);
          this.pinnedChannels[channelHash] = true;
          return true;
        }
        return false;
      }.bind(this));
      this.updatePinButton();
    }.bind(this));
  };

  /**
   * Update pin button in button-group-panel and contextmenu.
   */
  proto.updatePinButton = function cm_updatePinButton() {
    if (this.pinnedChannels[this._tvDeck.currentHash]) {
      // Show unpin button if current channel is pinned.
      this._tvDeck.pinButtonContextmenu.setAttribute(
                                           'data-l10n-id', 'unpin-from-home');
      this._tvDeck.pinButtonContextmenu.onclick =
                                           this.unpinFromHome.bind(this);
      this._tvDeck.pinButton.onclick = this.unpinFromHome.bind(this);
    } else {
      // Show pin button if current channel is not pinned yet.
      this._tvDeck.pinButtonContextmenu.setAttribute(
                                           'data-l10n-id', 'pin-to-home');
      this._tvDeck.pinButtonContextmenu.onclick = this.pinToHome.bind(this);
      this._tvDeck.pinButton.onclick = this.pinToHome.bind(this);
    }
  };

  proto.pinToHome = function cm_pinToHome() {
    if (!this._tvDeck.playingTunerId) {
      return;
    }

    var number = window.location.hash.split(',')[2];

    /* jshint nonew:false */
    new MozActivity({
      name: 'pin',
      data: {
        type: 'Application',
        group: 'tv',
        name: {raw: 'CH ' + number},
        manifestURL: this._tvDeck.manifestURL,
        launchURL: window.location.href
      }
    });
  };

  proto.unpinFromHome = function cm_unpinFromHome() {

    var message = {
      type: 'unpin',
      data: {
        manifestURL: this._tvDeck.manifestURL,
        launchURL: window.location.href
      }
    };

    navigator.mozApps.getSelf().onsuccess = function(evt) {
      var selfApp = evt.target.result;
      selfApp.connect('appdeck-channel').then(function (ports) {
        ports.forEach(function(port) {
          port.postMessage(message);
        });
      });
    }.bind(this);
  };

  ChannelManager.prototype = proto;
  exports.ChannelManager = ChannelManager;
})(window);
