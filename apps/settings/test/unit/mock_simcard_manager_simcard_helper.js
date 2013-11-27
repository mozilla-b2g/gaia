'use strict';

function MockSimUIModel(cardIndex) {
  this.cardIndex = cardIndex;

  // state list
  this.enabled = true;
  this.absent = false;
  this.locked = false;
  this.name = 'card';
  this.number = '0123456789';
  this.operator = 'Taiwan telecom';
}

MockSimUIModel.prototype = {
  getInfo: function() {
    return {
      enabled: this.enabled,
      absent: this.absent,
      locked: this.locked,
      name: this.name,
      number: this.number,
      operator: this.operator
    };
  },
  setState: function(key, options) {
    // do nothing
  }
};
