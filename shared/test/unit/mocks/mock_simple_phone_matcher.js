'use strict';

var MockSimplePhoneMatcher;

function MockSimplePhoneMatcherObj() {
}

MockSimplePhoneMatcherObj.prototype =  {
  generateVariants: function(number) {
    return number;
  },
  sanitizedNumber: function spm_sanitizedNumber(number) {
    return number;
  },
  bestMatch: function (variants, matches) {
    var bestMatchIndex = 0;
    var bestLocalIndex = 0;
    var allMatches = [];
    var matchNum = 0;
    return {
      totalMatchNum: matchNum,
      allMatches: allMatches,
      bestMatchIndex: bestMatchIndex,
      localIndex: bestLocalIndex
    };
  }
};

MockSimplePhoneMatcher = new MockSimplePhoneMatcherObj();
