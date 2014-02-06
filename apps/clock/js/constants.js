define(function(require, exports) {

  'use strict';

  // ---------------------------------------------------------
  // Constants

  var DAYS = exports.DAYS = [
   'sunday', 'monday', 'tuesday', 'wednesday', 'thursday',
   'friday', 'saturday'
   ];

  var RDAYS = exports.RDAYS = DAYS.map(function(_, n) {
    return n;
  });

  var WEEKDAYS = exports.WEEKDAYS = [1, 2, 3, 4, 5].map(function(x) {
    return DAYS[x];
  });

  var WEEKENDS = exports.WEEKENDS = [0, 6].map(function(x) {
    return DAYS[x];
  });

});
