define(function(require, exports) {
  'use strict';

  // ---------------------------------------------------------
  // Constants

  exports.DAYS = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
    'saturday', 'sunday'
  ];

  exports.RDAYS = exports.DAYS.map(function(_, n) {
    return n;
  });

  exports.WEEKDAYS = [0, 1, 2, 3, 4].map(function(x) {
    return exports.DAYS[x];
  });

  exports.WEEKENDS = [5, 6].map(function(x) {
    return exports.DAYS[x];
  });

});
