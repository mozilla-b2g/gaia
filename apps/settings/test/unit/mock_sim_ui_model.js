define(function(require) {
  'use strict';

  function MockSimUIModel(cardIndex) {
    this._cardIndex = cardIndex;
    // state list
    this._enabled = true;
    this._absent = false;
    this._locked = false;
    this._name = {
      id: 'simWithIndex',
      args: {
        index: this._cardIndex + 1
      }
    };
    this._number = '0123456789';
    this._operator = {
      text: 'Taiwan telecom'
    };
  }

  MockSimUIModel.prototype = {
    getInfo: function() {
      return {
        enabled: this._enabled,
        absent: this._absent,
        locked: this._locked,
        name: this._name,
        number: this._number,
        operator: this._operator
      };
    },
    setState: function(key, options) {
      // we can use this to make sure we setState successfully
      this._state = key;
    }
  };

  return function ctor_mockSimUIModel(cardIndex) {
    return new MockSimUIModel(cardIndex);
  };
});
