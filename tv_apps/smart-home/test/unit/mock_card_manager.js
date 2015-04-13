/* global Promise */
(function(exports) {
  'use strict';

  var MockCardManager = function() {};

  MockCardManager.prototype = {
    mPrepareFilteredCardList: function(filteredCardList) {
      this.mFilteredCardList = filteredCardList;
    },
    getFilteredCardList: function(name) {
      var that = this;
      return new Promise(function(resolve, reject) {
        resolve(that.mFilteredCardList);
      });
    }
  };

  exports.MockCardManager = MockCardManager;
}(window));
