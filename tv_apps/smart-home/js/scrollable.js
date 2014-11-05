/* global evt, SpatialNavigator */

(function(exports) {
  'use strict';

  function XScrollable(param) {
    this.translateX = 0;
    this.scrollEdgeOffset = 20;
    this.frameElem = (typeof param.frameElem === 'string') ?
                    document.getElementById(param.frameElem) : param.frameElem;
    this.listElem = (typeof param.listElem === 'string') ?
                    document.getElementById(param.listElem) : param.listElem;
    this.items = Array.prototype.slice.call(
                    (typeof param.items === 'string') ?
                    document.getElementsByClassName(param.items) : param.items);

    var defaultItem = this.listElem.dataset.defaultItem;
    this.spatialNavigator = new SpatialNavigator(this.items);
    this.spatialNavigator.focus(
              this.items.length > defaultItem ? this.items[defaultItem] : null);
    this.spatialNavigator.on('focus', this.handleSelection.bind(this));
  }

  XScrollable.prototype = evt({
    CLASS_NAME: 'XScrollable',
    getItemRect: function(elem) {
      var frameRect = this.frameElem.getBoundingClientRect();
      return {
        left: frameRect.left + elem.offsetLeft + this.translateX,
        top: frameRect.top + elem.offsetTop,
        width: elem.offsetWidth,
        height: elem.offsetHeight
      };
    },

    getBoundingClientRect: function() {
      return this.frameElem.getBoundingClientRect();
    },

    scrollTo: function(elem) {
      this.translateX = this._getScrollOffset(elem);
      this.listElem.style.transform =
                          'translateX(' + this.translateX + 'px)';
    },

    _getScrollOffset: function(elem) {
      var sibling;
      var offsetRight = elem.offsetLeft + elem.offsetWidth;
      var frameWidth = this.frameElem.offsetWidth;
      if (elem.offsetLeft + this.translateX <= 0) {
        sibling = this.getPrevItem(elem);
        if (sibling) {
          return -(sibling.offsetLeft + 0.5 * sibling.offsetWidth);
        } else {
          return -(elem.offsetLeft - this.scrollEdgeOffset);
        }
      } else if (offsetRight > (frameWidth - this.translateX)) {
        sibling = this.getNextItem(elem);
        if (sibling) {
          return frameWidth - (sibling.offsetLeft + 0.5 * sibling.offsetWidth);
        } else {
          return frameWidth - (offsetRight + this.scrollEdgeOffset);
        }
      } else {
        return this.translateX;
      }
    },

  getNextItem: function(elem) {
      var iter = elem;
      while (iter.parentElement != this.listElem) {
        iter = iter.parentElement;
      }
      return iter.nextElementSibling ?
        iter.nextElementSibling.getElementsByClassName(elem.className)[0] :
        null;
    },

    getPrevItem: function(elem) {
      var iter = elem;
      while (iter.parentElement != this.listElem) {
        iter = iter.parentElement;
      }
      return iter.previousElementSibling ?
        iter.previousElementSibling.getElementsByClassName(elem.className)[0] :
        null;
    },

    handleSelection: function(elem) {
      this.scrollTo(elem);
      this.fire('focus', this, elem);
    }
  });
  exports.XScrollable = XScrollable;
})(window);
