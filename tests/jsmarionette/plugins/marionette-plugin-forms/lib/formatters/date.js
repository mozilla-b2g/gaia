'use strict';
var padZeros = require('../utils/padzeros');

// As per [the "date" input element's
// specification](http://dev.w3.org/html5/markup/input.date.html), this value
// is formatted according to [RFC
// 3339](http://tools.ietf.org/html/rfc3339#section-5.6).
module.exports = function(dateObj) {
  return [dateObj.getFullYear(), dateObj.getMonth() + 1, dateObj.getDate()]
    .map(padZeros)
    .join('-');
};
