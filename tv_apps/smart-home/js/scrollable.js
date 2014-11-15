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

    // The DOM hirarechy used in XScrollable looks like:
    // <frame>
    //   <list>
    //     <node>
    //       <item> (choosed by selector)
    //       <other elements>
    // The corresponding name of frame, list, node, and item is used accordingly
    // around function and variable names inside XScrollable.
    getNodeFromItem: function(itemElem) {
      var nodeElem = itemElem;
      while (nodeElem.parentElement != this.listElem) {
        nodeElem = nodeElem.parentElement;
      }
      return nodeElem;
    },

    getNextItem: function(itemElem) {
      var nodeElem = this.getNodeFromItem(itemElem);

      return nodeElem.nextElementSibling ?
        nodeElem.nextElementSibling.getElementsByClassName(
                                                        this.itemClassName)[0] :
        null;
    },

    getPrevItem: function(itemElem) {
      var nodeElem = this.getNodeFromItem(itemElem);
      return nodeElem.previousElementSibling ?
        nodeElem.previousElementSibling.getElementsByClassName(
                                                        this.itemClassName)[0] :
        null;
    },

    handleSelection: function(itemElem) {
      this.scrollTo(itemElem);
      this.fire('focus', this, itemElem);
    },

    addNode: function(nodeElem) {
      var itemElems = nodeElem.getElementsByClassName(this.itemClassName);
      return (this.items.length == 1) &&
             this.spatialNavigator.add(itemElems[0]) &&
             !!this.listElem.appendChild(nodeElem);
    },

    /* Override if needed */
    getItemView: function() {
      var card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = '<div class="' + this.itemClassName + '"></div>' +
                       '<div class="card-description">This is a card</div>';
      return card;
    },

    removeNode: function(node) {
      if (typeof node === 'number') {
        node = this.listElem.children[node];
      }

      var itemElems = node.getElementsByClassName(this.itemClassName);
      if (itemElems.length != 1) {
        return false;
      }
      var selection = itemElems[0];

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
      this.spatialNavigator.add(
                newNode.getElementsByClassName(this.itemClassName)[0]);

      // We need to trigger focus again to confirm relocating selection border.
      this.spatialNavigator.focus(this.spatialNavigator.getFocusedElement());
    },

    get currentItem() {
      return this.spatialNavigator.getFocusedElement();
    }
  });
  exports.XScrollable = XScrollable;
})(window);
