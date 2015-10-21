/* global CardFilter */

(function(exports) {
  'use strict';

  /**
   * FilterManager is the controller class of filter. It relies on
   * {@link CardFilter} to do UI works of filter itself. However it also needs
   * to co-operate with {@link http://bit.ly/1JcrKZO|SmartBubbles},
   * {@link Edit}, and {@link Home} classes to do the actual *filtering* task
   * in smart-home.
   *
   * The working flow when user change filter is like:
   *
   * 1. FilterManager receives `filterchanged` from {@link CardFilter}
   * 2. Play bubbling down animation, see
   *    {@link FilterManager#onFilterChanged|onFilterChanged()}.
   * 3. When animation ends, change card icon in smart-home, with help from
   *    {@link Home} and XScrollable. See
   *    {@link FilterManager#onAnimationEnd|onAnimationEnd()}.
   * 4. Play bubbling up animation, see
   *    {@link FilterManager#_performBubbleUp|_performBubbleUp()}.
   *
   * @class FilterManager
   * @requires {@link Home}
   * @requires XScrollable
   * @requires {@link Edit}
   * @requires {@link CardFilter}
   * @requires {@link http://bit.ly/1JcrKZO|SmartBubbles}
   */
  var FilterManager = function() {};

  /**
   * @namespace FilterManager.FILTERS
   */
  FilterManager.FILTERS = Object.freeze({
    /**
     * @readonly
     * @memberof FilterManager.FILTERS
     * @property {String} name - value is `all`
     * @property {String} iconName - value is `filter`
     */
    'ALL': {
      name: 'all',
      iconName: 'filter'
    },
    /**
     * @readonly
     * @memberof FilterManager.FILTERS
     * @property {String} name - value is `tv`
     * @property {String} iconName - value is `tv`
     */
    'TV': {
      name: 'tv',
      iconName: 'tv'
    },
    /**
     * @readonly
     * @memberof FilterManager.FILTERS
     * @property {String} name - value is `dashboard`
     * @property {String} iconName - value is `dashboard`
     */
    'DASHBOARD': {
      name: 'dashboard',
      iconName: 'dashboard'
    },
    /**
     * @readonly
     * @memberof FilterManager.FILTERS
     * @property {String} name - value is `device`
     * @property {String} iconName - value is `device`
     */
    'DEVICE': {
      name: 'device',
      iconName: 'device'
    },
    /**
     * @readonly
     * @memberof FilterManager.FILTERS
     * @property {String} name - value is `application`
     * @property {String} iconName - value is `application`
     */
    'APPLICATION': {
      name: 'application',
      iconName: 'application'
    }
  });

  FilterManager.prototype = {
    /**
     * Initialize FilterManager
     *
     * @public
     * @method  FilterManager#init
     * @param  {Object} options
     * @param  {Object} options.cardListElem - `HTMLElement` of `card-list`
     * @param  {Object} options.cardScrollable - instance of XScrollable
     * @param  {Object} options.home - instance of {@link Home}
     * @param  {Object} options.cardManager - instance of CardManager
     */
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

    /**
     * Do the opposite of initalization
     *
     * @public
     * @method  FilterManager#uninit
     */
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

    /**
     * Perform bubbling up animation. We must hide the first frame of animation
     * because there are sliding animation on XScrollable. We don't want user to
     * see this according to UX spec.
     *
     * @private
     * @method  FilterManager#_performBubbleUp
     */
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

    /**
     * Get constant object of {@link FilterManager.FILTERS} of the `iconName`
     *
     * @public
     * @method  FilterManager#getFilterByIconName
     * @param  {String} iconName -
     */
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

    /**
     * EventHandler of `all-items-bubbled` event.
     * [SmartBubbles](http://bit.ly/1JcrKZO) fires `all-items-bubbled` when it
     * is done with bubbling down animation. We start to alter the card content
     * of XScrollable only after bubbling down animation ends. And after we are
     * done with altering content, we'll have to perform bubbling up animation
     * by calling {@link FilterManager#_performBubbleUp}.
     *
     * @public
     * @method FilterManager#onAnimationEnd
     */
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

    /**
     * EventHandler of `filterchanged` event. {@link CardFilter} fires
     * `filterchanged` event whenever user select a different filter. This is
     * becasue we need to play bubbling down animation whenever filter is
     * changed.
     *
     * @public
     * @method  FilterManager#onFilterChanged
     */
    onFilterChanged: function fm_onFilterChange(iconName) {
      this._isFirstFrame = true;

      if (this._isFilterChanging) {
        this._smartBubblesElem.stopImmediately();
      }
      this._isFilterChanging = true;
      this._cardListElem.setAttribute('smart-bubbles-direction', 'down');

      // Notice that methods like document.querySelectorAll or
      // document.getElementsByClassName returns elements based on the
      // sequence of time that element added to DOM structure. But we should
      // play animation in the left-to-right order. Card scrollable keeps the
      // order of all items, we just use them directly to play animation.
      // See http://bugzil.la/1169538
      this._smartBubblesElem.play(this._cardScrollable.allItems);
    },

    /**
     * Hide filter. This should be called when we are in edit mode.
     *
     * @public
     * @method  FilterManager#hide
     */
    hide: function fm_hide() {
      this._cardFilter.hide();
    },

    /**
     * Hide filter. This should be called when we are exit from edit mode.
     *
     * @public
     * @method  FilterManager#show
     */
    show: function fm_show() {
      this._cardFilter.show();
    },

    /**
     * Reset filter to {@link FilterManager.FILTERS.ALL}. We should always reset
     * filter when smart-home is back to foreground.
     *
     * @public
     * @method  FilterManager#resetFilter
     */
    resetFilter: function fm_resetFilter() {
      if (this._cardFilter.filter !== FilterManager.FILTERS.ALL.iconName) {
        this._cardFilter.filter = FilterManager.FILTERS.ALL.iconName;
      }
    }
  };

  exports.FilterManager = FilterManager;
}(window));
