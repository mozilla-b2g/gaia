/*global define*/

define(function(require) {
  'use strict';

  var Format = {
    padNumber: function(number, length) {
      number = '' + number;
      if (number.length >= length) {
        return number;
      }

      return new Array(length - number.length + 1).join('0') + number;
    }
  };

  return Format;
});
