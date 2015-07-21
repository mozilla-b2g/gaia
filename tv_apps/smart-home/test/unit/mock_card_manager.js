/* global Promise */
(function(exports) {
  'use strict';

  var MockCardManager = function() {};

  MockCardManager.prototype = {
    _cardList: [],
    m_card: {},

    init: function() {
      return null;
    },

    mPrepareFilteredCardList: function(filteredCardList) {
      this.mFilteredCardList = filteredCardList;
    },

    getFilteredCardList: function(name) {
      var that = this;
      return new Promise(function(resolve, reject) {
        resolve(that.mFilteredCardList);
      });
    },

    getCardList: function getCardList() {
      return Promise.resolve(this._cardList);
    },

    findCardFromCardList: function(param) {
      return this.m_card[param.cardId];
    },

    resolveCardName: function() {
      return 'cardname';
    }
  };

  exports.MockCardManager = MockCardManager;
}(window));
