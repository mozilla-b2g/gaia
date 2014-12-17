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

    this.itemClassName = param.itemClassName;
    this.items = Array.prototype.slice.call(
                    document.getElementsByClassName(param.itemClassName));

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

    scrollTo: function(itemElem) {
      this.translateX = this._getScrollOffset(itemElem);
      this.listElem.style.transform =
                          'translateX(' + this.translateX + 'px)';
    },

    _getScrollOffset: function(itemElem) {
      var sibling;
      var offsetRight = itemElem.offsetLeft + itemElem.offsetWidth;
      var frameWidth = this.frameElem.offsetWidth;
      if (itemElem.offsetLeft + this.translateX <= 0) {
        sibling = this.getPrevItem(itemElem);
        if (sibling) {
          return -(sibling.offsetLeft + 0.5 * sibling.offsetWidth);
        } else {
          return -(itemElem.offsetLeft - this.scrollEdgeOffset);
        }
      } else if (offsetRight > (frameWidth - this.translateX)) {
        sibling = this.getNextItem(itemElem);
        if (sibling) {
          return frameWidth - (sibling.offsetLeft + 0.5 * sibling.offsetWidth);
        } else {
          return frameWidth - (offsetRight + this.scrollEdgeOffset);
        }
      } else {
        return this.translateX;
      }
    },

    // The DOM hierarchy used in XScrollable looks like:
    // <frame>
    //   <list>
    //     <node>
    //       <item> (choosed by selector)
    //       <other elements>
    // User can also omit <item> element, and specify <node>s as focus target.
    // In this case, <node> and <item> refer to the same dom structure.
    getNodeFromItem: function(itemElem) {
      var nodeElem = itemElem;
      while (nodeElem.parentElement !== this.listElem) {
        nodeElem = nodeElem.parentElement;
      }
      return nodeElem;
    },

    getNextItem: function(itemElem) {
      var next = this.getNodeFromItem(itemElem).nextElementSibling;
      if (!next) {
        return null;
      } else if (next.classList.contains(this.itemClassName)) {
        return next;
      } else {
        return next.getElementsByClassName(this.itemClassName)[0];
      }
    },

    getPrevItem: function(itemElem) {
      var prev = this.getNodeFromItem(itemElem).previousElementSibling;
      if (!prev) {
        return null;
      } else if (prev.classList.contains(this.itemClassName)) {
        return prev;
      } else {
        return prev.getElementsByClassName(this.itemClassName)[0];
      }
    },

    handleSelection: function(itemElem) {
      this.scrollTo(itemElem);
      this.fire('focus', this, itemElem);
    },

    addNode: function(nodeElem) {
      if (nodeElem.classList.contains(this.itemClassName)) {
        return this.spatialNavigator.add(nodeElem) &&
               !!this.listElem.appendChild(nodeElem);
      } else {
        var itemElems = nodeElem.getElementsByClassName(this.itemClassName);
        return (this.items.length === 1) &&
               this.spatialNavigator.add(itemElems[0]) &&
               !!this.listElem.appendChild(nodeElem);
      }
    },

    getNode: function(index) {
      return this.listElem.children[index];
    },

    removeNode: function(node) {
      if (typeof node === 'number') {
        node = this.listElem.children[node];
      }

      var selection;
      if (node.classList.contains(this.itemClassName)) {
        selection = node;
      } else {
        var itemElems = node.getElementsByClassName(this.itemClassName);
        if (itemElems.length != 1) {
          return false;
        }
        selection = itemElems[0];
      }

      var focus = this.spatialNavigator.getFocusedElement();

      // When the selected item is being removed, we set focus to next item.
      // If next item doesn't exist, we set focus to previous item.
      var newfocus = (focus == selection) ?
          this.getNextItem(focus) || this.getPrevItem(focus) :
          focus;
      var success = this.spatialNavigator.remove(selection) &&
          !!this.listElem.removeChild(node);
      this.spatialNavigator.focus(newfocus);
        return success;
    },

    insertNodeBefore: function(newNode, startNode) {
      if (typeof startNode === 'number') {
        startNode = this.listElem.children[startNode];
      }

      this.listElem.insertBefore(newNode, startNode);
      if (newNode.classList.contains(this.itemClassName)) {
        this.spatialNavigator.add(newNode);
      } else {
        var item = newNode.getElementsByClassName(this.itemClassName)[0];
        // If we have focusable class, make it focusable in our spatial nav.
        if (item) {
          this.spatialNavigator.add(item);
        }
      }

      // We need to trigger focus again to confirm relocating selection border.
      this.spatialNavigator.focus(this.spatialNavigator.getFocusedElement());
    },

    get currentItem() {
      return this.spatialNavigator.getFocusedElement();
    }
  });
  exports.XScrollable = XScrollable;
})(window);
