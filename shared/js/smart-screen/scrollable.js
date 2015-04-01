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
   * Left margin should be set through scrollable.leftMargin.
   * (which is default to 2, and can be assigned through initialize params)
   */
  var DEFAULT_SPACING = 2;
  var DEFAULT_LEFT_MARGIN = 2;
  var REVERSE_LIST_BOUNDARY = 0.5;
  function XScrollable(param) {
    this.translateX = 0;
    this._colspanOnFocus = 0;

    this.frameElem = (typeof param.frameElem === 'string') ?
                    document.getElementById(param.frameElem) : param.frameElem;
    this.listElem = (typeof param.listElem === 'string') ?
                    document.getElementById(param.listElem) : param.listElem;
    this.nodes = Array.prototype.slice.call(this.listElem.children);

    this.spacing = param.spacing || DEFAULT_SPACING;
    this.leftMargin = param.leftMargin || DEFAULT_LEFT_MARGIN;

    this.itemClassName = param.itemClassName;
    var items = Array.prototype.slice.call(
                    this.listElem.getElementsByClassName(param.itemClassName));

    this.listElem.addEventListener('transitionend', this);

    var defaultItem = this.listElem.dataset.defaultItem;
    this.spatialNavigator = new SpatialNavigator(items);
    this.spatialNavigator.focus(
              items.length > defaultItem ? items[defaultItem] : null);
    this.spatialNavigator.on('focus', this.handleSelection.bind(this));
    this.spatialNavigator.on('unfocus', this.handleUnfocus.bind(this));

    this._setNodesPosition();

    this.setScale(param.scale || 1);

    this.isSliding = false;
    this.isHovering = false;
    this.hoveringItem = null;
    this.hoveredItem = null;
    this._isRevesed = false;

    if (param.referenceElement) {
      this.setReferenceElement(param.referenceElement);
    }
  }

  XScrollable.prototype = evt({
    CLASS_NAME: 'XScrollable',

    uninit: function(elem) {
      this.listElem.removeEventListener('transitionend', this);
    },

    getItemRect: function(elem) {
      var frameRect = this.frameElem.getBoundingClientRect();
      var node = this.getNodeFromItem(elem);
      var idx = parseInt(node.dataset.idx, 10);
      var tabstop = this._getTabstop(idx);
      var result = { left: (frameRect.left +
          (node.offsetWidth + this.spacing * 10) * tabstop) * this.scale +
          this.translateX,
        top: (frameRect.top + elem.offsetTop) * this.scale,
        width: (elem.offsetWidth) * this.scale,
        height: (elem.offsetHeight) * this.scale
      };
      return result;
    },

    getBoundingClientRect: function() {
      return this.frameElem.getBoundingClientRect();
    },

    endSlide: function() {
      // remove transition we added
      this.listElem.classList.add('no-transition');
      // if an user close home app when card-list is sliding, we have to force
      // close the sliding transition (transition-delay = 0 is not working)
      this.forceReflow(this.listElem);
      this.listElem.classList.remove('no-transition');
      this.listElem.style.transitionDuration = null;

      // set positions of other nodes to create moving effect
      if (!this.isHovering) {
        // If a card is hovering over a folder, the positions and focus will not
        // be set here.
        this._setOtherNodesPosition(this.newCardIndex);
        this.focus(this.newCardIndex);
      }
      this.fire('slideEnd');
      this.isSliding = false;
    },

    _slide: function(newItem, idx) {
      this.isSliding = true;
      this.newCardIndex = idx;

      // Start sliding animation of card list.
      // Also consider the case when the card-list does not need to scroll
      // or the document is not visibile.
      var prevTransform = this.listElem.style.transform;
      var distance = Math.abs(this._getScrollOffset(newItem) -
                              this.translateX);
      var duration = (distance < 960) ? 0.3 : distance / 2000;

      this.listElem.style.transitionDuration = duration + 's';
      this.scrollTo(newItem);
      if (!prevTransform ||
          prevTransform === this.listElem.style.transform ||
          this.refElem ||
          document.visibilityState !== 'visible') {
        this.endSlide();
      }
    },

    scrollTo: function(itemElem) {
      if (!itemElem) {
        return this.translateX;
      }
      this.translateX = this._getScrollOffset(itemElem);
      this._setScrollStyle();
    },

    resetScroll: function() {
      this.translateX = 0;
      this.scrollTo(this.getItem(0));
    },

    _setScrollStyle: function() {
      this.listElem.style.transform = 'translateX(' + this.translateX + 'px) ' +
                                      'scale(' + this.scale + ')';
    },

    setScale: function(scale) {
      scale = scale ? scale : 1;
      this.scale = scale;
      // We need to reset translateX and let getScrollOffset detect the
      // scroll amont again against new scale to focused element.
      this.translateX = 0;
      this.scrollTo(this.currentItem);
    },

    setReferenceElement: function(elem) {
      this.refElem = elem;
      if (!this.length || !this.refElem) {
        return false;
      }

      var refRect;
      if (this.refElem.CLASS_NAME === 'XScrollable') {
        refRect = this.refElem.getItemRect(this.refElem.currentItem);
      } else {
        refRect = this.refElem.getBoundingClientRect();
      }

      // If the reference element locates at right of the screen without enough
      // space, we need to show the list reversedly toward left of the screen.
      this._isReversed = refRect.left >
                       this.frameElem.offsetWidth * REVERSE_LIST_BOUNDARY;
      this.listElem.classList.toggle('reversed', this._isReversed);
      // Determine initial focus (depends on reversed or not)
      var initNode = this.getItemFromNode(
                     this.getNode(this._isReversed ? this.length - 1 : 0));
      this.spatialNavigator.focusSilently(initNode);

      // Calculate initial position with respect to reference element. The
      // initNode should get its center aligned with reference element
      // on x-axis.
      // this.refPoint saves the x-coordinate that makes initNode aligned.
      var unitLength = (initNode.offsetWidth + this.spacing * 10) * this.scale;

      this.refPoint =
        refRect.left + (refRect.width - initNode.offsetWidth * this.scale) / 2;
      if (this._isReversed) {
        this.translateX = this.refPoint - unitLength * (this.length - 1);
      } else {
        this.translateX = this.refPoint;
      }
      this._setScrollStyle();
      return true;
    },

    // Tabstop: real position of an index in multiple of item width.
    _getTabstop: function(idx) {
      if (this.isHovering) {
        var item = this.getItemFromNode(this.nodes[idx]);
        if (item === this.hoveringItem || item === this.hoveredItem) {
          var node1 = this.getNodeFromItem(this.hoveringItem);
          var node2 = this.getNodeFromItem(this.hoveredItem);
          return  (parseInt(node1.dataset.idx, 10) +
                   parseInt(node2.dataset.idx, 10)) / 2;
        }
      }
      if (idx < this.currentIndex) {
        return idx;
      } else if (idx === this.currentIndex) {
        return idx + (this._colspanOnFocus / 2);
      } else {
        return idx + this._colspanOnFocus;
      }
    },

    _getScrollOffset: function(itemElem) {
      if (this.refElem) {
        return this._getScrollOffsetByReferenceElement(itemElem);
      }

      var node = this.getNodeFromItem(itemElem);
      var idx = parseInt(node.dataset.idx, 10);
      var tabstop = this._getTabstop(idx);
      var tabcount = this.length + this._colspanOnFocus;
      var unitLength = (node.offsetWidth + this.spacing * 10) * this.scale;
      var frameWidth = this.frameElem.offsetWidth;

      // If elements don't overflow, align them in center.
      if (unitLength * tabcount + this.leftMargin * 10 < frameWidth) {
        return -(unitLength * tabcount - this.spacing * 10 - frameWidth) / 2;
      }

      if (unitLength * tabstop < this.leftMargin * 10 - this.translateX) {
        if (tabstop !== 0) {
          return -unitLength * (tabstop - 0.5);
        } else {
          return this.leftMargin * 10;
        }
      } else if (unitLength * (tabstop + 1) > frameWidth - this.translateX) {
        return frameWidth - unitLength * (tabstop + 1.5);
      } else {
        return this.translateX;
      }
    },

    // There's always a node center-aligned with the reference element.
    // (if exist)
    // TODO: Evaluate whether we can merge this function with _getScrollOffset.
    _getScrollOffsetByReferenceElement: function(itemElem) {
      var node = this.getNodeFromItem(itemElem);
      var idx = parseInt(node.dataset.idx, 10);
      var tabstop = this._getTabstop(idx);
      var unitLength = (node.offsetWidth + this.spacing * 10) * this.scale;
      var frameWidth = this.frameElem.offsetWidth;

      // Count maximum nodes that can be shown from the aligned node
      // to left/right viewport (aligned node itself is counted to right)
      var maxLeftNodes = Math.floor(this.refPoint / unitLength);
      var maxRightNodes = Math.floor((frameWidth - this.refPoint) / unitLength);

      // Calculate translate amount with respect to reference point.
      if (unitLength * tabstop < this.leftMargin * 10 - this.translateX) {
        return this.refPoint - (maxLeftNodes + tabstop) * unitLength;
      } else if (unitLength * (tabstop + 1) > (frameWidth - this.translateX)) {
        return this.refPoint - (tabstop - maxRightNodes + 1) * unitLength;
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

    getItem: function(index) {
      var node;
      if (index < this.nodes.length) {
        node = this.nodes[index];
      }
      return node;
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
      if (this.spatialNavigator.add(itemElem) &&
          !!this.listElem.appendChild(nodeElem)) {
        this._setNodePosition(this.nodes.length - 1);
        return true;
      }
      return false;
    },

    getNode: function(index) {
      return this.nodes[index];
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

    removeNodes: function(indices) {
      // Find nearest nodes that is not removed as new focus.
      var focusIdx = this.nodes.indexOf(this.getNodeFromItem(this.currentItem));
      var newFocusIdx;
      var minDistance = Number.MAX_VALUE;

      var newNodes = this.nodes.filter(function(node, oldindex) {
        if(indices.indexOf(oldindex) !== -1) {
          var itemElem = this.getItemFromNode(node);
          this.spatialNavigator.remove(itemElem);
          this.listElem.removeChild(node);
          return false;
        }

        var distance = Math.abs(focusIdx - oldindex);
        if(distance < minDistance) {
          minDistance = distance;
          newFocusIdx = oldindex;
        }
        return true;
      }, this);

      var newFocus = this.getItemFromNode(this.nodes[newFocusIdx]);
      var isRemovingHoveringItem = this.isHovering &&
          indices.length === 1 &&
          this.hoveringItem === this.getItemFromNode(this.nodes[indices[0]]);
      this.nodes = newNodes;
      // XXX newFocus check is a workaround to check if there's no node
      //     in the scrollable, after discussion we leave it here temporarily.
      if (!this.isHovering && newFocus) {
        // When currently no node is hovering over a folder and the scrollable
        // is not empty after removing nodes,
        // reset node positions and the next focus item.
        this._setNodesPosition();
        this.spatialNavigator.focus(newFocus);
      } else if (isRemovingHoveringItem) {
        // In case of hovering, we only remove the hovering item.
        // When the removed node was hovering over a folder, after it's removed,
        // reset the idx of the remaining nodes, set the focus to the hovered
        // folder, fire the event to notify the remaining move to folder actions
        // and unhover silently without firing an event.
        var hoveringItem = this.hoveringItem;
        var hoveredItem = this.hoveredItem;
        this._colspanOnFocus = 1;
        this.spatialNavigator.focusSilently(this.hoveredItem);
        this.unhoverSilently();
        this._setNodesPosition();
        this.fire('hovering-node-removed', hoveringItem, hoveredItem);
      }
    },

    insertNodeBefore: function(newNode, startNode) {
      if (typeof startNode === 'number') {
        startNode = this.nodes[startNode];
      }

      var itemElem = this.getItemFromNode(newNode);
      if (!itemElem) {
        return false;
      }

      var newIdx = startNode ?
                      parseInt(startNode.dataset.idx, 10) : this.nodes.length;
      this.nodes.splice(newIdx, 0, newNode);
      this.listElem.appendChild(newNode);
      this._setNodePosition(newIdx);

      this.spatialNavigator.add(itemElem);
      if (this.refElem) {
        this.realignToReferenceElement();
        this._shiftNodesPosition(1, newIdx);
      }
      this._slide(this.getItemFromNode(newNode), newIdx);

      return true;
    },

    insertNodeOver: function(newNode, startNode) {
      if (typeof startNode === 'number') {
        startNode = this.nodes[startNode];
      }

      var itemElem = this.getItemFromNode(newNode);
      if (!itemElem) {
        return false;
      }

      this._colspanOnFocus = 0;
      var newIdx =  parseInt(startNode.dataset.idx, 10);

      this.nodes.splice(newIdx, 0, newNode);
      this.listElem.appendChild(newNode);
      this._setNodesPosition();

      this.spatialNavigator.add(itemElem);
      this.hover(itemElem, this.getItemFromNode(startNode));
      this.focus(newIdx);
      this._slide(this.getItemFromNode(startNode), newIdx + 1);
      this.fire('node-inserted-over-folder');

      return true;
    },

    get currentItem() {
      return this.spatialNavigator.getFocusedElement();
    },

    get currentIndex() {
      return this.nodes.indexOf(
        this.getNodeFromItem(this.spatialNavigator.getFocusedElement()));
    },

    get length() {
      return this.nodes.length;
    },

    get isReversed() {
      return this._isReversed;
    },

    get allItems() {
      var that = this;
      var items = [];
      this.nodes.forEach(function(node) {
        var item = that.getItemFromNode(node);
        if (item) {
          items.push(item);
        }
      });
      return items;
    },

    _setOtherNodesPosition: function(skipIdx) {
      this.nodes.forEach(function(node, idx) {
        if (idx != skipIdx) {
          this._setNodePosition(idx);
        }
      }, this);
    },

    _setNodesIdx: function() {
      this.nodes.forEach(function(node, idx) {
        this.nodes[idx].dataset.idx = idx;
      }, this);
    },

    _setNodesPosition: function() {
      this.nodes.forEach(function(node, idx) {
        this._setNodePosition(idx);
      }, this);
    },

    _setNodePosition: function(idx) {
      this.nodes[idx].dataset.idx = idx;
      var tabstop = this._getTabstop(idx);
      this.getNodeFromItem(this.nodes[idx]).style.transform =
        'translateX(calc((100% + ' + this.spacing + 'rem) * ' + tabstop + '))';
    },

    /**
     * Shift node positions without animations.
     * @param  {[type]} offset  The unit offset. Use positive integer to shift
     *                          right and negative integer to shift left.
     * @param  {[type]} skipIdx The index of the node that needs not be shifted.
     */
    _shiftNodesPosition: function(offset, skipIdx) {
      this.nodes.forEach(function(node, idx) {
        if (idx !== skipIdx) {
          node.style.transitionProperty = 'none';
          var tabstop = this._getTabstop(idx) + offset;
          this.getNodeFromItem(node).style.transform =
            'translateX(calc((100% + ' +
            this.spacing + 'rem) * ' + tabstop + '))';
        }
      }.bind(this));

      this.forceReflow(this.nodes[0]);

      this.nodes.forEach(function(node) {
        node.style.transitionProperty = '';
      });
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
      this.focus();

      // TODO: handle cases that one of the swapped nodes is focused.
      // ... should we really need to handle this case?
      return true;
    },

    hover: function(item1, item2) {
      var node1 = this.getNodeFromItem(item1);
      var node2 = this.getNodeFromItem(item2);

      if (!node1 || !node2) {
        return false;
      }

      var idx1 = parseInt(node1.dataset.idx, 10);
      var idx2 = parseInt(node2.dataset.idx, 10);
      this.isHovering = true;
      this.hoveringItem = item1;
      this.hoveredItem = item2;
      item1.classList.add('hover');
      item2.classList.add('hovered');
      node1.classList.add('hover');
      node2.classList.add('hovered');
      this._setNodePosition(idx1);
      this._setNodePosition(idx2);
      this.fire('hover', this);
      return true;
    },

    unhover: function(shouldResetCardPositions) {
      var node1 = this.getNodeFromItem(this.hoveringItem);
      var node2 = this.getNodeFromItem(this.hoveredItem);

      this.fire('unhover', this);
      this.isHovering = false;

      if (shouldResetCardPositions) {
        this._setNodesPosition();
      }

      this.hoveringItem.classList.remove('hover');
      this.hoveredItem.classList.remove('hovered');
      node1.classList.remove('hover');
      node2.classList.remove('hovered');
      this.hoveringItem = null;
      this.hoveredItem = null;
    },

    unhoverSilently: function() {
      var node = this.getNodeFromItem(this.hoveredItem);

      this.isHovering = false;
      this.hoveredItem.classList.remove('hovered');
      node.classList.remove('hovered');
      this.hoveringItem = null;
      this.hoveredItem = null;
    },

    getTargetItem: function(direction) {
      if (direction === 'left') {
        return this.getPrevItem(this.currentItem);
      } else if (direction === 'right') {
        return this.getNextItem(this.currentItem);
      }
    },

    focus: function(item) {
      if (typeof item === 'number') {
        item = this.getItemFromNode(this.nodes[item]);
      } else if (typeof item === 'undefined') {
        item = this.currentItem || 0;
      }
      this.spatialNavigator.focus(item);
    },

    move: function(direction) {
      return this.spatialNavigator.move(direction);
    },

    clean: function() {
      this.spatialNavigator.setCollection();
      this.spatialNavigator.unfocus();
      this.listElem.innerHTML = '';
      this.nodes.length = 0;
    },

    isEmpty: function() {
      return !this.nodes.length;
    },

    handleEvent: function (evt) {
      if (evt.type === 'transitionend') {
        if (evt.target === this.listElem && evt.propertyName === 'transform') {
          if (this.isSliding) {
            this.endSlide();
          }
          this.fire('listTransformEnd', this.listElem);
        } else if (evt.target.classList.contains('card') &&
            evt.propertyName === 'transform') {
          this.fire('nodeTransformEnd', evt.target);
        }
      }
    },

    setColspanOnFocus: function(colspanOnFocus) {
      this._colspanOnFocus = colspanOnFocus;
      this._setNodesPosition();
      this.scrollTo(this.currentItem);
    },

    realignToReferenceElement: function() {
      if (this.refElem) {
        this.setReferenceElement(this.refElem);
      }
    },

    forceReflow: function(element) {
      getComputedStyle(element).width;
    }

  });
  exports.XScrollable = XScrollable;
})(window);
