/* global module, require */
'use strict';

var assert = require('assert');

var PlayerHelper = {

  // check the order of the rating stars.
  checkRatingStarsOrder: function(stars) {
    var expected = 1;
    stars.forEach(function(element) {
      // we always assume the stars are in DOM order. There is no reason
      // they wouldn't be.
      var value = element.getAttribute('data-rating');
      assert.equal(value, expected);
      expected++;
    });
  },

  checkEmptyRating: function(stars) {
    stars.forEach(function(elem) {
      assert.equal(elem.getAttribute('class').indexOf('star-on'), -1,
                   'Check empty rating. Star is on. Should be off');
    });
  }
};

module.exports = PlayerHelper;
