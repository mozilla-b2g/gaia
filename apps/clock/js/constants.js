define(function(require, exports) {

  'use strict';

  // ---------------------------------------------------------
  // Constants

  var DAYS = exports.DAYS = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
    'saturday', 'sunday'
  ];

  var RDAYS = exports.RDAYS = DAYS.map(function(_, n) {
    return n;
  });

  var WEEKDAYS = exports.WEEKDAYS = [0, 1, 2, 3, 4].map(function(x) {
    return DAYS[x];
  });

  var WEEKENDS = exports.WEEKENDS = [5, 6].map(function(x) {
    return DAYS[x];
  });

});
