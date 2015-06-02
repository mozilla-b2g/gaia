'use strict';

/* exported CardSwipeMixin */
/* globals Swipeable */

(function(exports) {
  /**
   * Needs to be used with ObserverSubjectMixin
   */
  var CardSwipeMixin = {
    _swipeHandler: null,

    initCardSwipe: function initCardSwipe(selector, tapCb, swipeCb, options) {
      options = options || {
        'element-width': 260,
        'auto-scroll-trigger': 0.25,
        'min-speed': 0.75
      };

      if(this._swipeHandler) {
        this._swipeHandler.disable();
        this._swipeHandler.onswipe = null;
        this._swipeHandler.ontap = null;
        this._swipeHandler.onvertswipe = null;
        this._swipeHandler = null;
      }

      this._swipeHandler = new Swipeable(this._el, selector, options);
      if(tapCb) {
        this._swipeHandler.ontap = tapCb;
      }

      if(swipeCb) {
        this._swipeHandler.onswipe = swipeCb;
      }

      this._swipeHandler.onvertswipe = (direction, id) => {
        var itemEl = this._el.querySelector('#' + id);
        var action = '';
        if(direction === 'up' && !itemEl.classList.contains('selected')) {
          action = 'card-selection';
          this._changeItemSelection(itemEl, true);
        }

        if(direction === 'down' && itemEl.classList.contains('selected')) {
          action = 'card-deselection';
          this._changeItemSelection(itemEl, false);
        }

        if(action) {
          this._notify({ id: id, action: action});
        }
      };

      this._swipeHandler.enable();
    },

    updateSelection: function updateSelection(items) {
      items.forEach((item, idx) => {
        var itemEl = this._el.querySelector('#'+item.id);

        if(item.selected && !itemEl.classList.contains('selected')) {
          this._changeItemSelection(itemEl, true);
        }

        if(!item.selected && itemEl.classList.contains('selected')) {
          this._changeItemSelection(itemEl, false);
        }
      });
    },

    enableCardSelection: function enablCardSelection() {
      this._swipeHandler.unpauseSwipe();
    },

    disableCardSelection: function disableCardSelection() {
      this._swipeHandler.pauseSwipe();
    },

    _changeItemSelection: function changeItemSelection(itemEl, select) {
      var elIdx = this._swipeHandler._elts.indexOf(itemEl);
      if(elIdx === -1) {
        return;
      }

      if(select) {
        itemEl.classList.remove('deselected');
        itemEl.classList.add('selected');
        this._swipeHandler.progressSelect(elIdx, true);
      } else {
        itemEl.classList.remove('selected');
        itemEl.classList.add('deselected');
        this._swipeHandler.progressSelect(elIdx, false);
      }
    },
  };

  exports.CardSwipeMixin = CardSwipeMixin;
}((typeof exports === 'undefined') ? window : exports));
