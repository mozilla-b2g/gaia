'use strict';

define(function(require, exports, module) {

  var evt = require('evt'),
      slice = Array.prototype.slice,
      nodeCacheIdCounter = 0;

  /**
   * Indirection for setting the top of a node. Used to allow
   * experimenting with either a transform or using top
   */
  function setTop(node, value, useTransform) {
    if (useTransform) {
      node.style.transform = 'translateY(' + value + 'px)';
    } else {
      node.style.top = value + 'px';
    }
  }

  // NodeCache ------------------------------------------------------
  /**
   * Holds a set of nodes. VScroll holds a list of NodeCache
   * instances which in turn holds a list of nodes that actually show
   * items in the VScroll instance. The purpose of using this
   * NodeCache collection is to hopefully avoid the number of node
   * repositioning of direct VScroll children, and to match more
   * closely the way data is returned from the email backend, in
   * slice chunks, and so a few item nodes would be updated when the
   * chunk is received by the email front end.
   *
   * @param {Boolean} useTransform whether to use transforms instead
   * of style positioning.
   */
  function NodeCache(useTransform) {
    this.container = new NodeCache.Node();
    this.id = nodeCacheIdCounter++;
    this.container.dataset.cacheid = this.id;
    this.nodes = [];
    this.useTransform = useTransform;

    this.dataIndex = -1;

    // Used by VScroll to track position so DOM
    // does not have to be queried for it.
    this.topPx = 0;
  }

  /**
   * Encapsulates the actual DOM used inside the NodeCache
   * as the container for the item nodes.
   */
  NodeCache.Node = function () {
    var node = document.createElement('div');
    node.classList.add(NodeCache.Node.className);
    return node;
  };

  NodeCache.Node.className = 'vscroll-cachelist';

  NodeCache.prototype = {
    setTop: function(top) {
      setTop(this.container, top, this.useTransform);
      this.topPx = top;
    }
  };

  // VScroll --------------------------------------------------------
  /**
   * Creates a new VScroll instance. Needs .setData() called on it
   * to actually show content, the constructor just wires up nodes
   * and sets starting state.
   *
   * @param {Node} container the DOM node that will show the items.
   *
   * @param {Node} scrollingContainer the scrolling DOM node, which
   * contains the `container` node. Note that in email, there are
   * other nodes in the scrollingContainer besides just container.
   *
   * @param {Node} template a DOM node that is cloned to provide
   * the DOM node to use for an item that is shown on the screen.
   * The clones of this node are cached and reused for multiple
   * data items.
   *
   * @param {Object} defaultData a placeholder data object to use
   * if list(index) does not return an object. Usually shows up when
   * the scroll gets to a place in the list that does not have data
   * loaded yet from the back end.
   */
  function VScroll(container, scrollingContainer, template, defaultData) {
    evt.Emitter.call(this);

    this.container = container;
    this.scrollingContainer = scrollingContainer;
    this.template = template;
    this.defaultData = defaultData;

    this.currentIndex = 0;

    this._limited = false;

    // Stores the list of DOM nodes to reuse.
    this.nodeCacheList = [];
    this.nodeCacheId = 0;

    this.scrollTop = 0;
    this.visibleOffset = 0;

    this.oldListSize = 0;

    this._lastEventTime = 0;

    // Bind to this to make reuse in functional APIs easier.
    this.onEvent = this.onEvent.bind(this);
    this.onChange = this.onChange.bind(this);
    this._scrollTimeoutPoll = this._scrollTimeoutPoll.bind(this);
  }

  /**
   * Given a node that is handled by VScroll, trim it down for use
   * in a string cache, like email's cookie cache. Modifies the
   * node in place.
   * @param  {Node} node the containerNode that is bound to
   * a VScroll instance.
   * @param  {Number} itemLimit number of items to cache. If greater
   * than the length of items in a NodeCache, the NodeCache item
   * length will be used.
   */
  VScroll.trimMessagesForCache = function(container, itemLimit) {
    // Find the NodeCache that is at the top
    var keptNode,
        nodeCaches = container.querySelectorAll('.' + NodeCache.Node.className);

    slice.call(nodeCaches).forEach(function (nodeCache) {
      if (!keptNode && parseInt(nodeCache.style.top, 10) === 0) {
        keptNode = nodeCache;
      } else {
        nodeCache.parentNode.removeChild(nodeCache);
      }
    });

    if (keptNode) {
      // Then trim out items that are larger than the limit.
      for (var childIndex = keptNode.children.length - 1;
                            childIndex > itemLimit - 1;
                            childIndex--) {
        keptNode.removeChild(keptNode.children[childIndex]);
      }
    }
  };

  VScroll.prototype = {
    // rate limit for event handler, in milliseconds, so that
    // it does not do work for every event received. If set to
    // zero, it means always do the work for every scroll event.
    // If this code continues to use 0, then the onEvent/onChange
    // duality could be removed, and just use onChange directly.
    // A non-zero value, like 50 subjectively seems to result in
    // more checkerboarding of half the screen every so often.
    eventRateLimit: 0,

    // How much to multiply the visible node range by to allow for
    // smoother scrolling transitions without white gaps.
    rangeMultipler: 2,

    // What fraction of the height to use to trigger the render of
    // the next node cache. If scroll position goes past this point,
    // the next node cache work is triggered.
    heightFractionTrigger: 8 / 10,

    // Detach cache dom when doing item updates and reattach when done.
    // If this value stays at false for a while, it can be removed later.
    detachForUpdates: false,

    // number of NodeCache objects to use
    nodeCacheListSize: 3,

    // The class to find items that have their default data set,
    // in the case where a scroll into a cache has skipped updates
    // because a previous fast scroll skipped the updates since they
    // were not visible at the time of that fast scroll.
    itemDefaultDataClass: 'default-data',

    // Use transformY instead of top to position node caches. If this
    // value stays as false, this code and its use can be removed.
    useTransform: false,

    /**
     * Hook that is implemented by the creator of a VScroll instance.
     * Called when the VScroll thinks it will need the next set of
     * data, but before the VScroll actually shows that section of
     * data. Passed the index and a count of items from that index
     * that should be fetched for use later.
     */
    prepareData: function(index, count) {},

    /**
     * Hook that is implemented by the creator of a VScroll instance.
     * Called when the VScroll wants to bind a model object to a
     * display node.
     */
    bindData: function(model, node) {},

    /**
     * Sets the list data source, and then triggers a recalculate
     * since the data changed.
     * @param {Function} list the list data source.
     */
    setData: function(list) {
      this.list = list;
      if (this._inited) {
        if (!this.waitingForRecalculate) {
          this._recalculate(0);
        }
        this.emit('dataChanged');
      } else {
        this._render(0);
      }
    },

    /**
     * Called by code that created the VScroll instance, when that
     * code has data fetched and wants to let the VScroll know
     * about it. This is useful from removing the display of
     * defaultData and showing the finally fetched data.
     * @param  {Number} index the list item index for which the
     * data update is available
     * @param  {Array} dataList the list of data items that are
     * now available. The first item in that list corresponds to
     * the data list index given in the first argument.
     * @param  {number} removedCount the count of any items removed.
     * Used mostly to know if a recalculation needs to be done.
     */
    updateDataBind: function(index, dataList, removedCount) {
      if (!this._inited) {
        return;
      }

      var cache;

      // If the list contents are different, wait until scrolling
      // stops then recalculate.
      if (this.oldListSize !== this.list.size() || removedCount) {
        if (!this.waitingForRecalculate) {
          this.waitingForRecalculate = true;
          this.once('scrollStopped', function() {
            this._recalculate(index);
          }.bind(this));
        }
        return;
      }

      for (var i = 0; i < dataList.length; i++) {
        var data = dataList[i],
            absoluteIndex = index + i;

        if (!cache ||
            absoluteIndex > cache.dataIndex + cache.nodes.length - 1) {
          cache = this._getCacheForIndex(absoluteIndex);
          // The index is outside the range that is currently needed.
          if (!cache) {
            return;
          }
        }

       var node = cache.nodes[absoluteIndex - cache.dataIndex];
        if (node) {
          this.bindData(data, node);
        }
      }
    },

    /**
     * Handles events fired, and allows rate limiting the work if
     * this.eventRateLimit has been set. Otherwise just calls
     * directly to onChange.
     */
    onEvent: function() {
      this._lastEventTime = Date.now();

      if (!this.eventRateLimit) {
        return this.onChange();
      }

      if (this._limited) {
        return;
      }
      this._limited = true;
      setTimeout(this.onChange, this.eventRateLimit);
    },

    /**
     * Handles changes in the scroll or resize of scrollContainer.
     */
    onChange: function() {
      // Rate limit is now expired since doing actual work.
      this._limited = false;

      var startDataIndex,
          cache = this.currentNodeCache,
          scrollTop = this.scrollingContainer.scrollTop,
          topDistance = scrollTop - cache.topPx,
          bottomDistance = (cache.topPx + this.cacheContainerHeight) -
                            scrollTop,
          scrollDown = scrollTop >= this.scrollTop;

      this.scrollTop = scrollTop;

      // If topDistance is past the triggerHeight, send out an event
      // about needing more data, in the appropriate direction.

      if (scrollDown && (topDistance > 0 &&
          topDistance > this.cacheTriggerHeight)) {
        startDataIndex = cache.dataIndex + this.nodeRange;

        // Render next cache segment but only if not already at the end.
        if (startDataIndex < this.list.size()) {
          // Do not ask for data past the size of the data list.
          var totalCount = this.list.size();
          var count = this.nodeRange;
          if (startDataIndex + count > totalCount) {
            count = totalCount - startDataIndex;
          }
          this.prepareData(startDataIndex, count);

          this._render(startDataIndex);
        }
      } else if (!scrollDown && (bottomDistance > 0 &&
                 bottomDistance > this.cacheTriggerHeight)) {
        startDataIndex = cache.dataIndex - this.nodeRange;
        if (startDataIndex < 0) {
          startDataIndex = 0;
        }

        // Render next segment but only if not already at the top.
        if (startDataIndex !== 0 || cache.topPx !== 0) {
          this.prepareData(startDataIndex, this.nodeRange);
          this._render(startDataIndex);
        }
      }

      this._startScrollStopPolling();
    },

    /**
     * Returns the start index and end index of the list items that
     * are currently visible to the user.
     * @return {Array} first and last index. Array could be undefined
     * if the VScroll is not in a position to show data yet.
     */
    getVisibleIndexRange: function() {
      // Do not bother if itemHeight has not bee initialized yet.
      if (this.itemHeight === undefined) {
        return undefined;
      }

      var top = this.scrollTop;

      return [
        Math.floor(top / this.itemHeight),
        Math.floor((top +
                    this.scrollingContainer.getBoundingClientRect().height -
                    this.visibleOffset) /
                    this.itemHeight)
      ];
    },

    /**
     * Given the list index, scroll to the top of that item.
     * @param  {Number} index the list item index.
     */
    scrollToIndex: function(index) {
      this.scrollingContainer.scrollTop = (index * this.itemHeight) +
                                          this.visibleOffset;
    },

    /**
     * Removes items from display in the container. Just a visual
     * change, does not change data in any way.
     */
    clearDisplay: function() {
      this.container.innerHTML = '';
      this.container.style.height = '0px';
      this._cleared = true;
    },

    /**
     * Call this method before the VScroll instance will be destroyed.
     * Used to clean up the VScroll.
     */
    destroy: function() {
      this.scrollingContainer.removeEventListener('scroll', this.onEvent);
      this.scrollingContainer.removeEventListener('resize', this.onEvent);
      if (this._scrollTimeoutPoll) {
        clearTimeout(this._scrollTimeoutPoll);
        this._scrollTimeoutPoll = 0;
      }
    },

    /**
     * Does the heavy lifting of showing the items that should appear
     * starting with the given index.
     * @param  {Number} index the index into the list data that
     * should be used to start the render.
     */
    _render: function(index) {
      var i;

      this.currentIndex = index;

      if (!this._inited) {
        this._init();
      } else {
        if (this._cleared) {
          this.nodeCacheList.forEach(function(cache, cacheIndex) {
            this.container.appendChild(cache.container);
          }.bind(this));
          this._cleared = false;
        }

        // Disregard the render request an existing cache set already has
        // that index generated.
        for (i = 0; i < this.nodeCacheList.length; i++) {
          if (i !== this.nodeCacheId &&
              this.nodeCacheList[i].dataIndex === index) {
            this.currentNodeCache = this.nodeCacheList[i];
            this.nodeCacheId = i;
            return;
          }
        }

        // Update which nodeCache to use. Want one that is not
        // currently visible.
        var cacheId = -1;
        for (i = this.nodeCacheId + 1; cacheId === -1; i++) {
          if (i > this.nodeCacheList.length - 1) {
            i = 0;
          }

          var cacheItemIndex = this.nodeCacheList[i].dataIndex;
          if ((cacheItemIndex === -1) || !this._isCacheVisible(i)) {
            cacheId = i;
          }
        }
        this.nodeCacheId = cacheId;
      }

      var cache = this.nodeCacheList[this.nodeCacheId],
          nodes = cache.nodes,
          listSize = this.list.size();

      cache.dataIndex = index;

      // Store the index on DOM node container index, to
      // allow easier query selectors for tests.
      cache.container.dataset.index = index;

      this.currentNodeCache = cache;
      this.currentNodeCache.dataIndex = this.currentIndex;

      // Pull the node cache container out of the DOM to
      // allow for the updates to happen quicker without
      // triggering reflows in the middle? Experimental.
      if (this.detachForUpdates) {
        this.container.removeChild(cache.container);
      }

      var length = index + nodes.length;
      for (i = index; i < length; i++) {
        var node = nodes[i - index];
        if (i < listSize) {
          var data = this.list(i);
          if (!data) {
            data = this.defaultData;
          }
          this.bindData(data, node);
        }
      }

      // Reposition the cache at the new location and insert
      // back into the DOM
      cache.setTop(index * this.itemHeight);
      if (this.detachForUpdates) {
        this.container.appendChild(cache.container);
      }
    },

    /**
     * Handles final initialization, once the VScroll is expected
     * to actually show data.
     */
    _init: function() {

      this.scrollingContainer.addEventListener('scroll', this.onEvent);
      this.scrollingContainer.addEventListener('resize', this.onEvent);

      for (var i = 0; i < this.nodeCacheListSize; i++) {
        this.nodeCacheList.push(new NodeCache(this.useTransform));
      }

      // Render the data item at index, to get sizes of things,
      // and create the cache of nodes.
      var node = this.template.cloneNode(true),
          cache = this.nodeCacheList[0];

      cache.nodes.push(node);

      cache.container.appendChild(node);
      cache.setTop(0);

      // Clear out any previous container contents. For example, a
      // cached HTML of a previous card may have been used to init
      // this VScroll instance.
      this.container.innerHTML = '';

      this.container.appendChild(cache.container);

      this.itemHeight = node.clientHeight;
      // Using window here because asking for this.container.clientHeight
      // will be zero since it has not children that are in the flow.
      // innerHeight is fairly close though as the list content is the
      // majority of the display area.
      this.innerHeight = window.innerHeight;
      this.itemsPerDisplay = Math.ceil(this.innerHeight /
                                       this.itemHeight);
      this.nodeRange = Math.floor(this.itemsPerDisplay * this.rangeMultipler);
      this.cacheContainerHeight = this.nodeRange * this.itemHeight;

      this.cacheTriggerHeight = this.cacheContainerHeight -
                                (this.cacheContainerHeight *
                                 this.heightFractionTrigger);

      // Generate as set of DOM nodes to reuse.
      // The - 1 is because the init node used to calculate itemHeight
      // is already in the cache.
      this.nodeCacheList.forEach(function(cache, cacheIndex) {
        var nodes = cache.nodes,
            i = 0,
            length = this.nodeRange;

        // If the first pass through, already added test div to get
        // item height, so exclude that one from the count.
        if (cacheIndex === 0) {
          i = 1;
        }

        // Set explicit height on on the cache container, in the hopes
        // that this helps layout, but not proven yet.
        cache.container.style.height = this.cacheContainerHeight + 'px';
        cache.setTop(cacheIndex * this.cacheContainerHeight);

        if (cacheIndex > 0) {
          // The NodeCache container needs to be inserted into the DOM
          this.container.appendChild(cache.container);
        }

        // Set up the cache nodes inside the container.
        for (; i < length; i++) {
          var newNode = this.template.cloneNode(true);
          setTop(newNode, (i * this.itemHeight), this.useTransform);
          cache.container.appendChild(newNode);
          nodes.push(newNode);
        }
      }.bind(this));

      this._calculateTotalHeight();
      this._inited = true;
      this.emit('inited');
    },

    /**
     * Recalculates the size of the container, and resets the
     * display of items in the container. Maintains the scroll
     * position inside the list.
     * @param {Number} refIndex a reference index that spawned
     * the recalculate. If that index is "above" the targeted
     * computed index found by recalculate, then it means the
     * the absolute scroll position may need to change.
     */
    _recalculate: function(refIndex) {
      var index = Math.floor(this.scrollTop / this.itemHeight),
          remainder = this.scrollTop % this.itemHeight,
          sizeDiff = this.list.size() - this.oldListSize;

      // If this recalculate was spawned from the top and more
      // items, then new messages from the top, and account for
      // them so the scroll position does not jump. Only do this
      // though if old size was not 0, which is common on first
      // folder sync, or if the reference index that spawned the
      // recalculate is "above" the target index, since that
      // means the contents above the target index shifted.
      if (refIndex && refIndex < index && sizeDiff > 0 &&
          this.oldListSize !== 0 && index !== 0) {
        index += sizeDiff;
      }

      console.log('VSCROLL scrollTop: ' + this.scrollTop +
                  ', RECALCULATE: ' + index + ', ' + remainder);

      this._calculateTotalHeight();

      // Now clear the caches from the visible area
      this.nodeCacheList.forEach(function(cache) {
        cache.setTop(this.totalHeight + 1);
        cache.dataIndex = -1;
        cache.container.dataset.index = -1;
      }.bind(this));

      this._render(index);

      // Reposition the scroll
      //
      this.scrollingContainer.scrollTop = (this.itemHeight * index) + remainder;

      this.waitingForRecalculate = false;

      this.emit('recalculated', index === 0);
    },

    /**
     * Sets the total height of the container.
     */
    _calculateTotalHeight: function() {
      // Size the scrollable area to the full height if all items
      // were rendered inside of it, so that there is no weird
      // scroll bar grow/shrink effects and so that inertia
      // scrolling is not artificially truncated.
      var newListSize = this.list.size();

      // Do not bother if same size, or if the container was set to 0 height,
      // most likely by a clearDisplay.
      if (this.oldListSize !== newListSize ||
        parseInt(this.container.style.height, 10) === 0) {
        this.totalHeight = this.itemHeight * newListSize;
        this.container.style.height = this.totalHeight + 'px';
        this.oldListSize = newListSize;
      }
    },

    /**
     * Indicates if the NodeCache at the given index is visible in
     * the container.
     * @param  {number}  index the index of the NodeCache in
     * the VScroll's set of NodeCache instances.
     * @return {Boolean}
     */
    _isCacheVisible: function(index) {
      var top = this.nodeCacheList[index].topPx,
          bottom = top + this.cacheContainerHeight,
          scrollTop = this.scrollTop,
          scrollBottom = scrollTop + this.innerHeight;

      if (bottom > this.totalHeight) {
        bottom = this.totalHeight;
      }
      if (scrollBottom > this.totalHeight) {
        scrollBottom = this.totalHeight;
      }

      // If the scrollTop/Bottom intersects the top/bottom,
      // then it is visible
      if ((scrollTop >= top && scrollTop <= bottom) ||
          (scrollBottom >= top && scrollBottom <= bottom) ||
          (top >= scrollTop && top <= scrollBottom) ||
          (bottom >= scrollTop && bottom <= scrollBottom)) {
        return true;
      }
      return false;
    },

    /**
     * Given the list index, get the NodeCache instance to use for
     * it.
     * @param  {Number} index the list item index.
     * @return {NodeCache} could be undefined if the item at that
     * index is not currently targeted for display in a NodeCache.
     */
    _getCacheForIndex: function(index) {
      var cache,
          startId = this.nodeCacheId,
          i = startId;

      do {
        cache = this.nodeCacheList[i];
        if (index >= cache.dataIndex &&
            index < cache.dataIndex + cache.nodes.length) {
          return cache;
        }
        i += 1;
        if (i > this.nodeCacheList.length - 1) {
          i = 0;
        }
      } while(i !== startId);
    },

    /**
     * Handles checking for the end of a scroll, based on a time
     * delay since the last scroll event.
     */
    _scrollTimeoutPoll: function() {
      this._scrollStopTimeout = 0;
      if (Date.now() > this._lastEventTime + 300) {
        // Scan for items that have default data but maybe should
        // have real data by now.
        this.nodeCacheList.forEach(function(cache, i) {
          if (this._isCacheVisible(i) && cache.dataIndex > -1) {
            var nodes = cache.nodes;
            nodes.forEach(function(node, j) {
              if (node.classList.contains(this.itemDefaultDataClass)) {
                this.bindData(
                  this.list(cache.dataIndex + j) || this.defaultData,
                  node
                );
              }
            }.bind(this));
          }
        }.bind(this));

        this.emit('scrollStopped');
      } else {
        this._scrollStopTimeout = setTimeout(this._scrollTimeoutPoll, 300);
      }
    },

    /**
     * Starts checking for the end of scroll events.
     */
    _startScrollStopPolling: function() {
      if (!this._scrollStopTimeout) {
        // "this" binding for _scrollTimeoutPoll done in constructor
        this._scrollStopTimeout = setTimeout(this._scrollTimeoutPoll, 300);
      }
    }
  };

  evt.mix(VScroll.prototype);

  // Override on() to allow for a lazy firing of scrollStopped,
  // particularly when the list is not scrolling, so the stop
  // polling is not currently running. This is useful for "once"
  // listeners that just want to be sure to do work when scroll
  // is not in action.
  var originalOn = VScroll.prototype.on;
  VScroll.prototype.on = function(id, fn) {
    if (id === 'scrollStopped') {
      this._startScrollStopPolling();
    }

    return originalOn.apply(this, slice.call(arguments));
  };

  // Introspection tools --------------------------------------------
  // uncomment this section to use them. Useful for tracing how the
  // code is called.
  /*
  var logQueue = [],
      logTimeoutId = 0,
      // 16 ms threshold for 60 fps, set to 0 to just log all calls,
      // without timings. Unless set to 0, log calls are batched
      // and written to the console later, so they will not appear
      // in the correct order as compared to console logs done outside
      // this module. Plus they will appear out of order since the log
      // call does not complete until after the wrapped function
      // completes. So if other function calls complete inside that
      // function, they will be logged before the containing function
      // is logged.
      perfLogThreshold = 0;

  function logPerf() {
    logQueue.forEach(function(msg) {
      console.log(msg);
    });
    logQueue = [];
    logTimeoutId = 0;
  }

  function queueLog(prop, time, arg0) {
    var arg0Type = typeof arg0;
    logQueue.push(module.id + ': ' + prop +
      (arg0Type === 'number' ||
       arg0Type === 'boolean' ||
       arg0Type === 'string' ?
       ': (' + arg0 + ')' : '') +
      (perfLogThreshold === 0 ? '' : ': ' + time));
    if (perfLogThreshold === 0) {
      logPerf();
    } else {
      if (!logTimeoutId) {
        logTimeoutId = setTimeout(logPerf, 2000);
      }
    }
  }

  function perfWrap(prop, fn) {
    return function() {
      var start = performance.now();
      if (perfLogThreshold === 0) {
        queueLog(prop, 0, arguments[0]);
      }
      var result = fn.apply(this, arguments);
      var end = performance.now();

      var time = end - start;
      if (perfLogThreshold > 0 && time > perfLogThreshold) {
        queueLog(prop, end - start, arguments[0]);
      }
      return result;
    };
  }

  if (perfLogThreshold > -1) {
    Object.keys(VScroll.prototype).forEach(function (prop) {
      var proto = VScroll.prototype;
      if (typeof proto[prop] === 'function') {
        proto[prop] = perfWrap(prop, proto[prop]);
      }
    });
  }
  */

  return VScroll;
});
