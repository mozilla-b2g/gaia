/* global evt, SpatialNavigator */

(function(exports) {
  'use strict';

  /**
   *The DOM hierarchy used in XScrollable looks like:
   * <frame>
   *   <list>
   *     <node>
   *       <item> (choosed by selector)
   *       <other elements>
   * Users need to specify <frame>, <list>, <node> elements through initialize
   * parameters.
   *
   * User can also omit <item> element, and specify <node>s as focus target.
   * In this case, <node> and <item> refer to the same dom structure.
   * To use scrollable.js, the minimal required css style is:
   * #frame {
   *   width: (any width you would like to set);
   *   height: (any height you would like to set);
   *   overflow: hidden;
   * }
   *
   * #list {
   *   width: 100%
   *   transition: transform 0.2s ease;
   *   transform-origin: 0 50%;
   *   position: relative;
   * }
   *
   * .node {
   *   margin-left: 0;
   *   margin-left: 0;
   *   margin-top: (any margin you would like to set);
   *   margin-bottom: (any margin you would like to set);
   *   left: 0;
   *   position: absolute;
   * }
   * The main reason for this is that scrollable.js uses transformX internally
   * to locate position of nodes (to achieve edit/arrange feature).
   *
   * The left and right margin should be set through scrollable.margin
   * (which is default to 2, and can be assigned through initialize params)
   */
  var DEFAULT_MARGIN = 2;
  function XScrollable(param) {
    this.translateX = 0;

    this.frameElem = (typeof param.frameElem === 'string') ?
                    document.getElementById(param.frameElem) : param.frameElem;
    this.listElem = (typeof param.listElem === 'string') ?
                    document.getElementById(param.listElem) : param.listElem;
    this.nodes = Array.prototype.slice.call(this.listElem.children);

    this.margin = param.margin ? param.margin : DEFAULT_MARGIN;

    this.itemClassName = param.itemClassName;
    var items = Array.prototype.slice.call(
                    document.getElementsByClassName(param.itemClassName));

    this.scale = 1;
    this._setNodesPosition();

    var defaultItem = this.listElem.dataset.defaultItem;
    this.spatialNavigator = new SpatialNavigator(items);
    this.spatialNavigator.focus(
              items.length > defaultItem ? items[defaultItem] : null);
    this.spatialNavigator.on('focus', this.handleSelection.bind(this));
    this.spatialNavigator.on('unfocus', this.handleUnfocus.bind(this));

    this.setScale();

  }

  XScrollable.prototype = evt({
    CLASS_NAME: 'XScrollable',
    getItemRect: function(elem) {
      var frameRect = this.frameElem.getBoundingClientRect();
      var node = this.getNodeFromItem(elem);
      var result = { left: (frameRect.left + this.margin * 10 +
          (node.offsetWidth + this.margin * 10) *
          parseInt(node.dataset.idx, 10)) *
          this.scale + this.translateX,
        top: (frameRect.top + elem.offsetTop) * this.scale,
        width: (elem.offsetWidth) * this.scale,
        height: (elem.offsetHeight) * this.scale
      };
      return result;
    },

    getBoundingClientRect: function() {
      return this.frameElem.getBoundingClientRect();
    },

    scrollTo: function(itemElem) {
      this.translateX = this._getScrollOffset(itemElem);
      this.listElem.style.transform = 'translateX(' + this.translateX + 'px) ' +
                                      'scale(' + this.scale + ')';
    },

    setScale: function(scale) {
      scale = scale ? scale : 1;
      this.scale = scale;
      this.translateX = 0;
      this.scrollTo(this.currentItem);
    },

    _getScrollOffset: function(itemElem) {
      var sibling;
      var node = this.getNodeFromItem(itemElem);
      var idx = parseInt(node.dataset.idx, 10);
      var unitLength = (node.offsetWidth + this.margin * 10) * this.scale;
      var right = unitLength * (idx + 1);
      var left = unitLength * idx;
      var previousLeft = unitLength * (idx - 1);
      var frameWidth = this.frameElem.offsetWidth;
      if (left + this.translateX < 0) {
        sibling = this.getPrevItem(itemElem);
        if (sibling) {
          return -(previousLeft + 0.5 * unitLength);
        } else {
          return 0;
        }
      } else if (right > (frameWidth - this.translateX)) {
        return frameWidth - (right + 0.5 * unitLength);
      } else {
        return this.translateX;
      }
    },

    getNodeFromItem: function(itemElem) {
      if (!itemElem) {
        return null;
      }
      var nodeElem = itemElem;
      while (nodeElem.parentElement !== this.listElem) {
        nodeElem = nodeElem.parentElement;
      }
      return nodeElem;
    },

    getItemFromNode: function(nodeElem) {
      if (!nodeElem) {
        return null;
      }
      if (nodeElem.classList.contains(this.itemClassName)) {
        return nodeElem;
      } else {
        return nodeElem.getElementsByClassName(this.itemClassName)[0];
      }
    },

    getNextItem: function(itemElem) {
      return this.getItemFromNode(this._getNextNode(itemElem));
    },

    getPrevItem: function(itemElem) {
      return this.getItemFromNode(this._getPrevNode(itemElem));
    },

    _getNextNode: function(itemElem) {
      var nodeElem = this.getNodeFromItem(itemElem);
      var idx = parseInt(nodeElem.dataset.idx, 10) + 1;
      if (idx < 0 || idx >= this.nodes.length) {
        return null;
      }
      return this.nodes[idx];
    },

    _getPrevNode: function(itemElem) {
      var nodeElem = this.getNodeFromItem(itemElem);
      var idx = parseInt(nodeElem.dataset.idx, 10) - 1;
      if (idx < 0 || idx >= this.nodes.length) {
        return null;
      }
      return this.nodes[idx];
    },

    handleSelection: function(itemElem) {
      this.scrollTo(itemElem);
      this.fire('focus', this, itemElem, this.getNodeFromItem(itemElem));
    },

    handleUnfocus: function(itemElem) {
      this.fire('unfocus', this, itemElem, this.getNodeFromItem(itemElem));
    },

    addNode: function(nodeElem) {
      var itemElem = this.getItemFromNode(nodeElem);
      if (!itemElem) {
        return false;
      }
      this.nodes.push(nodeElem);
      this._setNodePosition(this.nodes.length - 1);
      return this.spatialNavigator.add(itemElem) &&
             !!this.listElem.appendChild(nodeElem);
    },

    getNode: function(index) {
      return this.listElem.children[index];
    },

    removeNode: function(node) {
      if (typeof node === 'number') {
        node = this.nodes[node];
      }

      var itemElem = this.getItemFromNode(node);

      if(!itemElem) {
        return false;
      }

      var focus = this.spatialNavigator.getFocusedElement();

      // When the selected item is being removed, we set focus to next item.
      // If next item doesn't exist, we set focus to previous item.
      var newfocus = (focus == itemElem) ?
          this.getNextItem(focus) || this.getPrevItem(focus) :
          focus;
      this.spatialNavigator.remove(itemElem);
      this.listElem.removeChild(node);

      this.nodes.splice(parseInt(node.dataset.idx, 10), 1);
      this._setNodesPosition();

      this.spatialNavigator.focus(newfocus);
      return true;
    },

    insertNodeBefore: function(newNode, startNode) {
      if (typeof startNode === 'number') {
        startNode = this.nodes[startNode];
      }

      var itemElem = this.getItemFromNode(newNode);
      if (!itemElem) {
        return false;
      }

      var newIdx = parseInt(startNode.dataset.idx, 10);
      this.nodes.splice(newIdx, 0, newNode);
      this.listElem.appendChild(newNode);
      this._setNodesPosition();

      this.spatialNavigator.add(itemElem);

      // We need to trigger focus again to confirm relocating selection border.
      this.spatialNavigator.focus(this.spatialNavigator.getFocusedElement());
      return true;
    },

    get currentItem() {
      return this.spatialNavigator.getFocusedElement();
    },

    _setNodesPosition: function() {
      for(var idx in this.nodes) {
        this._setNodePosition(idx);
      }
    },

    _setNodePosition: function(idx) {
      this.nodes[idx].dataset.idx = idx;
      this.getNodeFromItem(this.nodes[idx]).style.transform =
          'translateX(calc((100% + ' + this.margin + 'rem) * ' + idx + ' + ' +
                                                         this.margin + 'rem))';

    },

    swap: function(node1, node2) {
      if (typeof node1 === 'number') {
        node1 = this.nodes[node1];
      }
      if (typeof node2 === 'number') {
        node2 = this.nodes[node2];
      }
      if (!node1 || !node2) {
        return false;
      }

      var idx1 = parseInt(node1.dataset.idx, 10);
      var idx2 = parseInt(node2.dataset.idx, 10);
      this.nodes[idx1] = node2;
      this.nodes[idx2] = node1;
      this._setNodePosition(idx1);
      this._setNodePosition(idx2);
      this.catchFocus();

      // TODO: handle cases that one of the swapped nodes is focused.
      // ... should we really need to handle this case?
      return true;
    },

    getTargetItem: function(direction) {
      if (direction === 'left') {
        return this.getPrevItem(this.currentItem);
      } else if (direction === 'right') {
        return this.getNextItem(this.currentItem);
      }
    },

    catchFocus: function() {
      this.spatialNavigator.focus(this.currentItem);
    },

    move: function(direction) {
      return this.spatialNavigator.move(direction);
    }

  });
  exports.XScrollable = XScrollable;
})(window);
