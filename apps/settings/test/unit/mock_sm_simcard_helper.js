'use strict';

function MockSimCard(cardIndex) {
  this.cardIndex = cardIndex;

  // state list
  this.enabled = false;
  this.absent = false;
  this.locked = false;
  this.name = '';
  this.number = '';
  this.operator = '';
}

MockSimCard.prototype = {
  getInfo: function() {
    return {};
  },
  setState: function(key, options) {
    // do nothing
  }
};
