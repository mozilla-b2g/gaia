'use strict';

/* global InputMethods */

InputMethods.india = {
  _glue: null,

  init: function(glue) {
    this._glue = glue;
  },

  click: function(keyCode) {
    this._glue.setUpperCase(false);
    return this._glue.sendKey(keyCode);
  },

  displaysCandidates: function() {
    return false;
  }
};
