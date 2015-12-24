/* global ActivityPicker */

define(function(require, exports, module) {
  'use strict';
  /*
   Centralized event handling for various
   data-actions url, email, phone in a message
  */

  module.exports.onClick = function lah_onClick(event) {
    event.preventDefault();
    event.stopPropagation();

    var dataset = event.target.dataset;
    var action = dataset.action;

    if (!action) {
      return;
    }

    var type = action.replace('-link', '');

    ActivityPicker[type](
      dataset[type], this.reset, this.reset
    );

  };

});
