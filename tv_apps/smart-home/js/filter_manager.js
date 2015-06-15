/* global CardFilter */

(function(exports) {
  'use strict';

  var FilterManager = function() {};

  FilterManager.FILTERS = Object.freeze({
    'ALL': {
      name: 'all',
      iconName: 'filter'
    },
    'TV': {
      name: 'tv',
      iconName: 'tv'
    },
    'DASHBOARD': {
      name: 'dashboard',
      iconName: 'dashboard'
    },
    'DEVICE': {
      name: 'device',
      iconName: 'device'
    },
    'APPLICATION': {
      name: 'application',
      iconName: 'application'
    }
  });

  FilterManager.prototype = {
    init: function(options) {
      this._cardListElem = options.cardListElem;
      this._cardScrollable = options.cardScrollable;
      this._home = options.home;
      this._edit = this._home.edit;
      this._cardManager = options.cardManager;

      this._cardFilter = new CardFilter();
      this._cardFilter.start(document.getElementById('filter-tab-group'));
      this._cardFilter.filter = FilterManager.FILTERS.ALL.iconName;
      this._filterChangedHandler = this.onFilterChanged.bind(this);
      this._cardFilter.on('filterchanged', this._filterChangedHandler);
      this._cardFilter.on('opened', function() {
        this._home.cleanFolderScrollable(true);
      }.bind(this));

      this._hideFilter = this.hide.bind(this);
      this._showFilter = this.show.bind(this);
      this._edit.on('enter-edit-mode', this._hideFilter);
      this._edit.on('exit-edit-mode', this._showFilter);

      this._smartBubblesElem = document.getElementById('bubbles');

      this._animationEndHandler = this.onAnimationEnd.bind(this);
      this._smartBubblesElem.addEventListener('all-items-bubbled',
        this._animationEndHandler);
    },

    uninit: function() {
      this._cardFilter.off('filterchanged', this._filterChangedHandler);
      this._edit.off('enter-edit-mode', this._hideFilter);
      this._edit.off('exit-edit-mode', this._showFilter);
      this._smartBubblesElem.removeEventListener('all-items-bubbled',
        this._animationEndHandler);
    },

    _filteredCardList: undefined,

    _isFirstFrame: false,

    _isFilterChanging: false,

    _isBubbleSinking: function fm_isBubbleSinking() {
      return (
        this._cardListElem.getAttribute('smart-bubbles-direction') === 'down');
    },

    _performBubbleUp: function fm_performBubbleUp() {
      if (this._isFirstFrame) {
        this._isFirstFrame = false;
        this._cardListElem.style.transition = 'none';
        this._cardScrollable.resetScroll();
        window.requestAnimationFrame(this._performBubbleUp.bind(this));
      } else {
        this._cardListElem.style.opacity = 1;
        this._cardListElem.style.transition = undefined;
        this._cardListElem.removeAttribute('smart-bubbles-direction');
        this._smartBubblesElem.play(
          document.querySelectorAll('#card-list > .card > .app-button'));
      }
    },

    getFilterByIconName: function fm_getFilterByIconName(iconName) {
      var keys = Object.keys(FilterManager.FILTERS);
      var filter;
      keys.some(function(key) {
        var cursor = FilterManager.FILTERS[key];
        if (iconName === cursor.iconName) {
          filter = cursor;
          return true;
        }
      });
      return filter;
    },

    onAnimationEnd: function fm_onAnimationEnd() {
      if (!this._isFilterChanging) {
        return;
      }

      var that = this;
      var filter = this.getFilterByIconName(this._cardFilter.filter);
      var gotFilteredCardList = function(filteredList) {
        filteredList.forEach(function(card) {
          that._cardScrollable.addNode(that._home.createCardNode(card));
        });
        that._filteredCardList =
          (filter.name !== 'all') ? filteredList : undefined;
        that._cardListElem.style.opacity = 0;
        window.requestAnimationFrame(that._performBubbleUp.bind(that));
      };

      if (this._isBubbleSinking()) {
        this._cardScrollable.clean();
        this._cardManager.getFilteredCardList(filter.name).then(
          gotFilteredCardList);
      } else {
        this._isFilterChanging = false;
      }
    },

    onFilterChanged: function fm_onFilterChange(iconName) {
      this._isFirstFrame = true;

      if (this._isFilterChanging) {
        this._smartBubblesElem.stopImmediately();
      }
      this._isFilterChanging = true;
      this._cardListElem.setAttribute('smart-bubbles-direction', 'down');
      this._smartBubblesElem.play(
        document.querySelectorAll('#card-list > .card > .app-button'));
    },

    hide: function fm_hide() {
      this._cardFilter.hide();
    },

    show: function fm_show() {
      this._cardFilter.show();
    },

    resetFilter: function fm_resetFilter() {
      if (this._cardFilter.filter !== FilterManager.FILTERS.ALL.iconName) {
        this._cardFilter.filter = FilterManager.FILTERS.ALL.iconName;
      }
    }
  };

  exports.FilterManager = FilterManager;
}(window));
