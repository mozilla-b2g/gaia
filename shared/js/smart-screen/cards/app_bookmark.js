/* global Card */

(function(exports) {
  'use strict';

  function AppBookmark(options) {
    this.url = options.url;
    this.name = options.name;
    this.group = options.group;
    this.thumbnail = options.thumbnail;
    Card.prototype.constructor.call(this, options);
  }

  AppBookmark.deserialize = function ab_deserialize(cardEntry) {
    var cardInstance;
    if (cardEntry && cardEntry.type === 'AppBookmark') {
      cardInstance = new AppBookmark({
        id: cardEntry.id,
        name: cardEntry.name,
        url: cardEntry.url,
        group: cardEntry.group,
        thumbnail: cardEntry.thumbnail
      });
    }
    return cardInstance;
  };

  AppBookmark.prototype = Object.create(Card.prototype);

  AppBookmark.prototype.constructor = AppBookmark;

  AppBookmark.prototype.launch = function ab_launch(args) {
    window.open(this.url, '_blank', 'remote=true,applike=true');
  };

  AppBookmark.prototype.serialize = function ab_serialize() {
    return {
      id: this.cardId,
      type: 'AppBookmark',
      name: this.name,
      url: this.url,
      group: this.group,
      thumbnail: this.thumbnail
    };
  };

  exports.AppBookmark = AppBookmark;
}(window));
