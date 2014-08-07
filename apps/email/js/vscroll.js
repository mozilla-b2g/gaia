'use strict';

define(function(require, exports, module) {

  var evt = require('evt'),
      slice = Array.prototype.slice,
      useTransform = false;

  /**
   * Indirection for setting the top of a node. Used to allow
   * experimenting with either a transform or using top
   */
  function setTop(node, value) {
    if (useTransform) {
      node.style.transform = 'translateY(' + value + 'px)';
    } else {
      node.style.top = value + 'px';
    }
  }

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

    this._inited = false;
    // Because the FxOS keyboard works by resizing our window, we/our caller
    // need to be careful about when we sample things involving the screen size.
    // So, we want to only capture this once and do it separably from other
    // things.
    this._capturedScreenMetrics = false;

    /**
     * What is the first/lowest rendered index?  Tracked so the HTML
     * cache logic can know if we've got the data for it to be able to
     * render the first N nodes.
     */
    this.firstRenderedIndex = 0;

    this._limited = false;

    /**
     * The list of reused Element nodes.  Their order in this list has
     * no correlation with their display position.  If you decide to
     * reorder them you may break/hurt _nextAvailableNode.
     */
    this.nodes = [];
    /**
     * Maps data indexes to their reusable Element nodes if currently
     * rendered, or -1 if previously (but not currently rendered).
     * Populated as nodes are rendered so not being in the map is
     * effectively the same as having a value of -1.
     *
     * Maintained by _setNodeDataIndex and accessed by
     * _getNodeFromDataIndex.  Use those methods and do not touch this
     * map directly.
     */
    this.nodesDataIndices = {};
    /** Internal state variable of _nextAvailableNode for efficiency. */
    this.nodesIndex = -1;

    this.scrollTop = 0;

    /**
     * Any visible height offset to where container sits in relation
     * to scrollingContainer. Expected to be set by owner of the
     * VScroll instance. In email, the search box height is an
     * example of a visibleOffset.
     */
    this.visibleOffset = 0;

    this.oldListSize = 0;

    this._lastEventTime = 0;

    // Bind to this to make reuse in functional APIs easier.
    this.onEvent = this.onEvent.bind(this);
    this.onChange = this.onChange.bind(this);
    this._scrollTimeoutPoll = this._scrollTimeoutPoll.bind(this);
  }

  VScroll.nodeClassName = 'vscroll-node';

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
    var nodes = slice.call(container.querySelectorAll(
                           '.' + VScroll.nodeClassName));
    nodes.forEach(function(node) {
      var index = parseInt(node.dataset.index, 10);
      // None of the clones need this value after we read it off, so reduce
      // the size of the cache by clearing it.
      delete node.dataset.index;
      if (index > itemLimit - 1) {
        container.removeChild(node);
      }
    });
  };

  VScroll.prototype = {
    /**
     * rate limit for event handler, in milliseconds, so that
     * it does not do work for every event received. If set to
     * zero, it means always do the work for every scroll event.
     * If this code continues to use 0, then the onEvent/onChange
     * duality could be removed, and just use onChange directly.
     * A non-zero value, like 50 subjectively seems to result in
     * more checkerboarding of half the screen every so often.
     */
    eventRateLimitMillis: 0,


    /**
     * The maximum number of items visible on the screen at once
     * (derived from available space and rounded up).
     */
    itemsPerScreen: undefined,

    /**
     * The number of screens worth of items to pre-render in the
     * direction we are scrolling beyond the current screen.
     */
    prerenderScreens: 3,

    /**
     * The number of screens worth of items to prefetch (but not
     * render!) beyond what we prerender.
     */
    prefetchScreens: 2,

    /**
     * The number of extra screens worth of rendered items to keep
     * around beyond what is required for prerendering.  When
     * scrolling in a single direction, this ends up being the number
     * of screens worth of items to keep rendered behind us.  If this
     * is less than the value of `prerenderScreens` then a user just
     * jiggling the screen up and down by even a pixel will cause us
     * work as we move the delta back and forth.
     *
     * In other words, don't have this be less than
     * `prerenderScreens`, but you can have it be more.  (Although
     * having it be more is probably wasteful since extra DOM nodes
     * the user is moving away from don't help us.)
     */
    retainExtraRenderedScreens: 3,

    /**
     * When recalculating, pre-render this many screens of messages on
     * each side of the current screen.  This may be a fractional
     * value (we round up).
     *
     * In the initial case we very much want to minimize rendering
     * latency, so it makes sense for this to be smaller than
     * `prerenderScreens`.
     *
     * In the non-initial case we wait for scrolling to have quiesced,
     * so there's no overriding need to bias in either direction.
     */
    recalculatePaddingScreens: 1.5,

    /**
     * Track when the last time vscroll manually changed the scrollTop
     * of the scrolling container. Useful for when knowing if a recent
     * scroll event was triggered by this component or by user action.
     * The value resets to 0 periodically to avoid interested code from
     * doing too many timestamp checks on every scroll event.
     */
    lastScrollTopSetTime: 0,

    /**
     * The number of items to prerender (computed).
     */
    prerenderItemCount: undefined,

    /**
     * The number of items to prefetch (computed).
     */
    prefetchItemCount: undefined,

    /**
     * The number of items to render when (non-initial) recalculating.
     */
    recalculatePaddingItemCount: undefined,

    /**
     * The class to find items that have their default data set,
     * in the case where a scroll into a cache has skipped updates
     * because a previous fast scroll skipped the updates since they
     * were not visible at the time of that fast scroll.
     */
    itemDefaultDataClass: 'default-data',

    /**
     * Hook that is implemented by the creator of a VScroll instance.
     * Called when the VScroll thinks it will need the next set of
     * data, but before the VScroll actually shows that section of
     * data. Passed the inclusive high absolute index for which it
     * wants data.  ASSUMES data sources that only need to grow
     * downward.
     */
    prepareData: function(highAbsoluteIndex) {},

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
        this._init();
        this.renderCurrentPosition();
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

      // If the list data set length is different from before, that
      // indicates state is now invalid and a recalculate is needed,
      // but wait until scrolling stops. This can happen if items
      // were removed, or if new things were added to the list.
      if (this.oldListSize !== this.list.size() || removedCount) {
        if (!this.waitingForRecalculate) {
          this.waitingForRecalculate = true;
          this.once('scrollStopped', function() {
            this._recalculate(index);
          }.bind(this));
        }
        return;
      }

      // Not a list data size change, just an update to existing
      // data items, so update them in place.
      for (var i = 0; i < dataList.length; i++) {
        var absoluteIndex = index + i;
        var node = this._getNodeFromDataIndex(absoluteIndex);
        if (node) {
          this.bindData(dataList[i], node);
        }
      }
    },

    /**
     * Handles events fired, and allows rate limiting the work if
     * this.eventRateLimitMillis has been set. Otherwise just calls
     * directly to onChange.
     */
    onEvent: function() {
      this._lastEventTime = Date.now();

      if (!this.eventRateLimitMillis) {
        this.onChange();
        return;
      }

      if (this._limited) {
        return;
      }
      this._limited = true;
      setTimeout(this.onChange, this.eventRateLimitMillis);
    },

    /**
     * Process a scroll event (possibly delayed).
     */
    onChange: function() {
      // Rate limit is now expired since doing actual work.
      this._limited = false;

      if (!this._inited) {
        return;
      }

      if (this.lastScrollTopSetTime) {
        // Keep the last scroll time for about a second, which should
        // be enough time for interested parties to check the value.
        if (this.lastScrollTopSetTime + 1000 < Date.now()) {
          this.lastScrollTopSetTime = 0;
        }
      }

      var startIndex,
          endIndex,
          scrollTop = this.scrollingContainer.scrollTop,
          scrollingDown = scrollTop >= this.scrollTop;
      this.scrollTop = scrollTop;
      // must get after updating this.scrollTop since it uses that
      var visibleRange = this.getVisibleIndexRange();

      if (scrollingDown) {
        // both _render and prepareData clamp appropriately
        startIndex = visibleRange[0];
        endIndex = visibleRange[1] + this.prerenderItemCount;
        this.prepareData(endIndex + this.prefetchItemCount);
      } else {
        // scrolling up
        startIndex = visibleRange[0] - this.prerenderItemCount;
        endIndex = visibleRange[1];
        // no need to prepareData; it's already there!
      }

      this._render(startIndex, endIndex);

      this._startScrollStopPolling();
    },

    /**
     * Called when the vscroll becomes visible. In cases where the vscroll
     * may have been intially created for an element that is not visible,
     * the sizing information would not be correct and the vscroll instance
     * would not be initialized correctly. So the instance needs to know
     * when it should check again to properly initialize. Otherwise, there
     * may not be any new data signals from the the list data that a display
     * needs to be tried.
     */
    nowVisible: function() {
      // Only do work if not initialized and have data.
      if (!this._inited && this.list) {
        this._init();
        this.onChange();
      }
    },

    /**
     * Renders the list at the current scroll position.
     */
    renderCurrentPosition: function() {
      if (!this._inited) {
        return;
      }

      var scrollTop = this.scrollingContainer.scrollTop;
      this.scrollTop = scrollTop;

      var visibleRange = this.getVisibleIndexRange();
      // (_render clamps these values for sanity; we don't have to)
      var startIndex = visibleRange[0] - this.recalculatePaddingItemCount;
      var endIndex = visibleRange[1] + this.recalculatePaddingItemCount;

      this._render(startIndex, endIndex);
      // make sure we have at least enough data to cover what we want
      // to display
      this.prepareData(endIndex);
    },

    /**
     * Determine what data index is at the given scroll position.
     * @param  {Number} position scroll position
     * @return {Number} the data index.
     */
    indexAtScrollPosition: function (position) {
      var top = position - this.visibleOffset;
      if (top < 0) {
        top = 0;
      }
      return this.itemHeight ? Math.floor(top / this.itemHeight) : 0;
    },

    /**
     * Returns the start index and end index of the list items that
     * are currently visible to the user using the currently cached
     * scrollTop value.
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
        this.indexAtScrollPosition(top),
        this.indexAtScrollPosition(top + this.innerHeight)
      ];
    },

    /**
     * Given the list index, scroll to the top of that item.
     * @param  {Number} index the list item index.
     */
    jumpToIndex: function(index) {
      this._setContainerScrollTop((index * this.itemHeight) +
                                          this.visibleOffset);
    },

    /**
     * Removes items from display in the container. Just a visual
     * change, does not change data in any way. Data-related
     * elements, like the positions of this.nodes, are reset in
     * the data entry points that follow a clearDisplay, like
     * _init() or recalculate().
     */
    clearDisplay: function() {
      // Clear the HTML content.
      this.container.innerHTML = '';

      this.container.style.height = '0px';
    },

    /**
     * Call this method before the VScroll instance will be destroyed.
     * Used to clean up the VScroll.
     */
    destroy: function() {
      this.scrollingContainer.removeEventListener('scroll', this.onEvent);
      if (this._scrollTimeoutPoll) {
        clearTimeout(this._scrollTimeoutPoll);
        this._scrollTimeoutPoll = 0;
      }
    },

    _setContainerScrollTop: function(value) {
      this.scrollingContainer.scrollTop = value;
      // Opt for using a property set instead of an event emitter, since the
      // timing of that event emit is not guaranteed to get to listeners before
      // scroll events.
      this.lastScrollTopSetTime = Date.now();
    },

    /**
     * Ensure that we are rendering at least all messages in the
     * inclusive range [startIndex, endIndex].  Already rendered
     * messages outside this range may be reused but will not be
     * removed or de-rendered unless they are needed.
     *
     *
     * @param {Number} startIndex first inclusive index in this.list's
     * data that should be used.  Will be clamped to the bounds of
     * this.list but what's visible on the screen is not considered
     * @param {Number} endIndex last inclusive index in this.list's
     * data that should be used.  Clamped like startIndex.
     */
    _render: function(startIndex, endIndex) {
      var i,
          listSize = this.list.size();

      // Paranoia clamp the inputs; we depend on callers to deal with
      // the visible range.
      if (startIndex < 0) {
        startIndex = 0;
      }
      if (endIndex >= listSize) {
        endIndex = listSize - 1;
      }

      this.firstRenderedIndex = startIndex;

      if (!this._inited) {
        this._init();
      }

      for (i = startIndex; i <= endIndex; i++) {
        // If node already bound and placed correctly, skip it.
        if (this._getNodeFromDataIndex(i)) {
          continue;
        }

        var node = this._nextAvailableNode(startIndex, endIndex),
            data = this.list(i);

        if (!data) {
          data = this.defaultData;
        }

        // Remove the node while doing updates in positioning to
        // avoid extra layers from being created which really slows
        // down scrolling.
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }

        setTop(node, i * this.itemHeight);
        this._setNodeDataIndex(this.nodesIndex, i);
        this.bindData(data, node);

        this.container.appendChild(node);

      }
    },

    _setNodeDataIndex: function(nodesIndex, dataIndex) {
      // Clear dataIndices map for old dataIndex value.
      var oldDataIndex = this.nodes[nodesIndex].vScrollDataIndex;
      if (oldDataIndex > -1) {
        this.nodesDataIndices[oldDataIndex] = -1;
      }

      var node = this.nodes[nodesIndex];
      node.vScrollDataIndex = dataIndex;
      // Expose the index into the DOM so that the cache logic can
      // consider them since only the underlying DOM node is cloned by
      // cloneNode().  (vScrollDataIndex is an "expando" property on
      // the JS wrapper on the native DOM object.)
      node.dataset.index = dataIndex;
      this.nodesDataIndices[dataIndex] = nodesIndex;
    },

    _getNodeFromDataIndex: function (dataIndex) {
      var index = this.nodesDataIndices[dataIndex];

      if (index === undefined) {
        index = -1;
      }

      return index === -1 ? null : this.nodes[index];
    },

    captureScreenMetrics: function() {
      if (this._capturedScreenMetrics) {
        return;
      }
      this.innerHeight = this.scrollingContainer.getBoundingClientRect().height;
      if (this.innerHeight > 0) {
        this._capturedScreenMetrics = true;
      }
    },

    /**
     * Handles final initialization, once the VScroll is expected
     * to actually show data.
     *
     * XXX eventually consume 'resize' events.  Right now we are
     * assuming that the email app only supports a single orientation
     * (portrait) and that the only time a resize event will trigger
     * is if the keyboard is shown or hidden.  When used in the
     * message_list's search mode, it explicitly calls _init on us
     * prior to causing the keyboard to be displayed, which currently
     * saves us from getting super confused.
     */
    _init: function() {
      if (this._inited) {
        return;
      }

      // Clear out any previous container contents. For example, a
      // cached HTML of a previous card may have been used to init
      // this VScroll instance.
      this.container.innerHTML = '';

      // Get the height of an item node.
      var node = this.template.cloneNode(true);
      this.container.appendChild(node);
      this.itemHeight = node.clientHeight;
      this.container.removeChild(node);

      // Set up all the bounds used in scroll calculations
      this.captureScreenMetrics();

      // The instance is not visible yet, so cannot finish initialization.
      // Wait for the next instance API call to see if initialization can
      // complete.
      if (!this.itemHeight || !this.innerHeight) {
        return;
      }

      this.scrollingContainer.addEventListener('scroll', this.onEvent);

      this.itemsPerScreen = Math.ceil(this.innerHeight / this.itemHeight);
      this.prerenderItemCount =
        Math.ceil(this.itemsPerScreen * this.prerenderScreens);
      this.prefetchItemCount =
        Math.ceil(this.itemsPerScreen * this.prefetchScreens);
      this.recalculatePaddingItemCount =
        Math.ceil(this.itemsPerScreen * this.recalculatePaddingScreens);

      this.nodeCount = this.itemsPerScreen + this.prerenderItemCount +
                       Math.ceil(this.retainExtraRenderedScreens *
                                 this.itemsPerScreen);


      // Fill up the pool of nodes to use for data items.
      for (var i = 0; i < this.nodeCount; i++) {
        node = this.template.cloneNode(true);
        node.classList.add(VScroll.nodeClassName);
        setTop(node, (-1 * this.itemHeight));
        this.nodes.push(node);
        this._setNodeDataIndex(i, -1);
      }

      this._calculateTotalHeight();
      this._inited = true;
      this.emit('inited');
    },

    /**
     * Finds the next node in the pool to use in the visible area.
     * Uses a hidden persistent index to provide efficient lookup for
     * repeated calls using the same stratIndex/endIndex as long as
     * there are at least (endIndex - beginIndex + 1) * 2 nodes.
     *
     * @param  {Number} beginIndex the starting data index for the
     * range of already visible data indices. They should be
     * avoided as choices since they are already in visible area.
     * @param  {Number} endIndex the ending data index for the
     * range of already visible data indices.
     * @return {Node} the DOM node that can be used next for display.
     */
    _nextAvailableNode: function(beginIndex, endIndex) {
      var i, node, vScrollDataIndex,
          count = 0;

      // Loop over nodes finding the first one that is out of visible
      // range, making sure to loop back to the beginning of the
      // nodes if cycling over the end of the list.
      for (i = this.nodesIndex + 1; count < this.nodes.length; count++, i++) {
        // Loop back to the beginning if past the end of the nodes.
        if (i > this.nodes.length - 1) {
          i = 0;
        }

        node = this.nodes[i];
        vScrollDataIndex = node.vScrollDataIndex;

        if (vScrollDataIndex < beginIndex || vScrollDataIndex > endIndex) {
          this.nodesIndex = i;
          break;
        }
      }

      return node;
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
      if (!this._inited) {
        return;
      }

      var node,
          index = this.indexAtScrollPosition(this.scrollTop),
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
      for (var i = 0; i < this.nodeCount; i++) {
        node = this.nodes[i];
        setTop(node, (-1 * this.itemHeight));
        this._setNodeDataIndex(i, -1);
      }
      this.waitingForRecalculate = false;

      this._setContainerScrollTop((this.itemHeight * index) + remainder);
      this.renderCurrentPosition();

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
     * Handles checking for the end of a scroll, based on a time
     * delay since the last scroll event.
     */
    _scrollTimeoutPoll: function() {
      this._scrollStopTimeout = 0;
      if (Date.now() > this._lastEventTime + 300) {
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
