/*exported MockBlackList */

'use strict';

var MockBlackList = {
  mBlacklistedNumbers: [],

  has: function(number) {
    return (this.mBlacklistedNumbers.indexOf(number) >= 0);
  },

  mTeardown: function() {
    this.mBlacklistedNumbers = [];
  }
};
