/* global MockCardFilter, FilterManager, MockScrollable, MockCardManager */

'use strict';

requireApp('smart-home/test/unit/mock_card_filter.js');
requireApp('smart-home/test/unit/mock_scrollable.js');
requireApp('smart-home/test/unit/mock_card_manager.js');
requireApp('smart-home/js/filter_manager.js');

suite('smart-gome/FilterManager', function() {

  var setupDOM = function() {
    var filterTabGroup = document.createElement('menu');
    filterTabGroup.id = 'filter-tab-group';
    filterTabGroup.dataset.iconType = 'filter';
    filterTabGroup.classList.add('filter-tab-group');

    var bubbles = document.createElement('div');
    bubbles.id = 'bubbles';

    var cardListElem = document.createElement('div');
    cardListElem.id = 'card-list';
    cardListElem.setAttribute('smart-bubbles', 'true');
    cardListElem.dataset.defaultItem = '0';

    document.body.appendChild(filterTabGroup);
    document.body.appendChild(bubbles);
    document.body.appendChild(cardListElem);
  };

  var teardownDOM = function() {
    document.body.removeChild(document.getElementById('filter-tab-group'));
    document.body.removeChild(document.getElementById('bubbles'));
    document.body.removeChild(document.getElementById('card-list'));
  };

  suite('> filterchanged event', function() {
    var realCardFilter;
    var filterManager;

    setup(function() {
      realCardFilter = window.CardFilter;
      window.CardFilter = MockCardFilter;
      setupDOM();

      filterManager = new FilterManager();
      filterManager.init({
        cardListElem: document.getElementById('card-list'),
        cardScrollable: new MockScrollable(),
        createCardNode: function() {},
        cardManager: new MockCardManager()
      });

      filterManager._smartBubblesElem.play = function() {};
      filterManager._smartBubblesElem.stopImmediately = function() {};
      sinon.spy(filterManager._smartBubblesElem, 'play');
      sinon.spy(filterManager._smartBubblesElem, 'stopImmediately');
    });

    teardown(function() {
      window.cardFilter = realCardFilter;
      filterManager._smartBubblesElem.play.restore();
      filterManager._smartBubblesElem.stopImmediately.restore();
      filterManager = undefined;
      teardownDOM();
    });

    test('start playing animation when filterchanged is fired', function() {
      var cardListElem = document.getElementById('card-list');
      filterManager._cardFilter.mFireEvent('filterchanged', 'tv');

      assert.equal(
        cardListElem.getAttribute('smart-bubbles-direction'), 'down');
      assert.isTrue(filterManager._smartBubblesElem.play.calledOnce);
    });

    test('stop playing animation when filterchanged is fired before previous ' +
      ' animation ends', function() {

      filterManager._isFilterChanging = true;
      filterManager._cardFilter.mFireEvent('filterchanged', 'tv');

      assert.isTrue(filterManager._smartBubblesElem.stopImmediately.calledOnce);
    });

  });

  suite('> all-items-bubbled event', function() {
    var realCardFilter;
    var filterManager;
    var mockScrollable;
    var mockCardManager;
    var cardListElem;

    setup(function() {
      realCardFilter = window.CardFilter;
      window.CardFilter = MockCardFilter;
      setupDOM();

      cardListElem = document.getElementById('card-list');
      mockScrollable = new MockScrollable();
      mockCardManager = new MockCardManager();
      filterManager = new FilterManager();
      filterManager.init({
        cardListElem: cardListElem,
        cardScrollable: mockScrollable,
        createCardNode: function() {},
        cardManager: mockCardManager
      });

      filterManager._smartBubblesElem.play = function() {};
      filterManager._smartBubblesElem.stopImmediately = function() {};
      sinon.spy(filterManager, 'getFilterByIconName');
      sinon.spy(mockScrollable, 'clean');
      sinon.spy(mockCardManager, 'getFilteredCardList');
    });

    teardown(function() {
      window.cardFilter = realCardFilter;
      filterManager.getFilterByIconName.restore();
      filterManager = undefined;
      mockScrollable.clean.restore();
      mockScrollable = undefined;
      mockCardManager.getFilteredCardList.restore();
      mockCardManager = undefined;
      teardownDOM();
    });

    test('clean scrollable and get filtered cards when bubbling down ' +
      'animation ends', function() {
        // pretend that we already went through 'onFilterChanged'
        filterManager._isFilterChanging = true;
        cardListElem.setAttribute('smart-bubbles-direction', 'down');
        filterManager._smartBubblesElem.dispatchEvent(
          new CustomEvent('all-items-bubbled'));

        assert.isTrue(mockScrollable.clean.calledOnce);
        assert.isTrue(mockCardManager.getFilteredCardList.calledOnce);
      });

    test('reset _isFilterChanging to false when bubbling up animation ends',
      function() {
        // pretend that we already went through 'onFilterChanged'
        filterManager._isFilterChanging = true;
        cardListElem.removeAttribute('smart-bubbles-direction');
        filterManager._smartBubblesElem.dispatchEvent(
          new CustomEvent('all-items-bubbled'));

        assert.isFalse(mockScrollable.clean.calledOnce);
        assert.isFalse(mockCardManager.getFilteredCardList.calledOnce);
      });
  });
});
