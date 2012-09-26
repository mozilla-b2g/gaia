Calendar.ns('Views').TimeParent = (function() {

  /**
   * Parent view for busytime-based views
   * (month, week, day) contains basic
   * handlers for purging children, panning, etc...
   *
   * Each "child" must be added to children.
   * Each child must be identified by some id.
   *
   * Child classes are expected to have "create"
   * method and "destroy" methods for adding &
   * removing them from the dom.
   */
  function TimeParent() {
    Calendar.View.apply(this, arguments);
    this.children = new Calendar.OrderedMap();
    this._activeChildren = new Calendar.OrderedMap();

    this.recalculateWidth();
    this._initEvents();
  }

  TimeParent.prototype = {
    __proto__: Calendar.View.prototype,

    /**
     * Number of elements to keep rendered
     * ahead of the current item.
     *
     * @type Numeric
     */
    paddingBefore: 1,

    /**
     * Number of elements to keep ahead
     * of the current item.
     */
    paddingAfter: 1,

    /**
     * Number of visible children.
     * In viewport when centered.
     */
    visibleChildren: 1,

    viewportSize: window.innerWidth,

    childThreshold: 2.5,

    panThreshold: 10,

    /* should always be higher then padding */
    maxChildren: 6,

    /* panning variables */

    _childWidth: null,
    _childThreshold: null,
    _frame: null,
    _frameMoveOffset: 0,
    _panOffset: 0,

    currentChild: null,

    get childContainer() {
      return this.element;
    },

    /**
     * Recalculate internal width based on visibleChildren & viewportSize.
     */
    recalculateWidth: function() {
      this._childWidth =
        this.viewportSize / this.visibleChildren;

      this._childThreshold =
        this._childWidth / this.childThreshold;
    },

    _initEvents: function() {
      this.app.timeController.on('purge', this);
      this.element.addEventListener('pan', this);
      this.element.addEventListener('swipe', this);
      this.element.addEventListener('mousedown', this);
    },

    _attachEvents: function() {
      this.element.addEventListener('mousemove', this);
      this.element.addEventListener('mouseup', this);
    },

    _relaseEvents: function() {
      this.element.removeEventListener('mousemove', this);
      this.element.removeEventListener('mouseup', this);
    },

    _startPanning: function(event) {
      this._isPanning = true;

      var children = this._activeChildren.items;
      var first = children[0];
      var last = children[children.length - 1];

      this._padChildren('past', 1, first[1].date, true);
      this._padChildren('future', 1, last[1].date, true);
    },

    _stopPanning: function() {
      this._isPanning = false;
      this._panOffset = 0;
      this._frameMoveOffset = 0;
      this._startEvent = null;

      this.deactivateChildren();
      this._moveFrames(0, 1);
    },

    handleEvent: function(e) {
      switch (e.type) {
        case 'mousedown':
          e.stopPropagation();
          this._attachEvents();
          this._startEvent = e;
          break;

        case 'mousemove':
          var deltaX = e.screenX - this._startEvent.screenX;
          if (!this._isPanning) {
            if (Math.abs(deltaX) < this.panThreshold) {
              return;
            } else {
              this._startPanning();
            }
          }
          e.stopPropagation();
          this._pan(deltaX);
          break;

        case 'mouseup':
          this._relaseEvents();
          e.stopPropagation();
          if (this._isPanning) {
            this._stopPanning();
          }
          break;

        case 'purge':
          this.purgeChildren(e.data[0]);
          break;
      }
    },

    moveNext: function() {
      this._internalMove = true;

      var time = this._nextTime(
        this.currentChild.date
      );
      this.app.timeController.move(time);
    },

    movePrevious: function() {
      this._internalMove = true;

      var time = this._previousTime(
        this.currentChild.date
      );
      this.app.timeController.move(time);
    },

    /**
     * For extension create a child given an id.
     *
     * @return {Calendar.View} child view.
     */
    _createChild: function(time) {
    },

    /**
     * For extension create an id given a time.
     *
     * @return {String} id of time.
     */
    _getId: function(time) {
    },

    _nextTime: function() {},
    _previousTime: function() {},

    _appendChild: function(id, time) {
      var child = this.children.get(id);
      if (!child) {
        child = this._createChild(time);
        // all elements are absolutely positioned
        // on top of each other until we move them
        // with translateX so order is not important.
        // XXX: a11y <- check here!
        this.childContainer.appendChild(child.create());
        this._addChild(child);
      }

      return child;
    },

    _addChild: function(child) {
      this.children.set(child.id, child);
    },

    _removeChild: function(child) {
      this.children.remove(child.id);
    },

    _padChildren: function(direction, padding, start, activate) {
      var fn;

      if (direction === 'past') {
        fn = this._previousTime;
      } else {
        fn = this._nextTime;
      }

      var time = start;
      var id;
      var child;

      while (padding--) {
        time = fn.call(this, time);
        id = this._getId(time);
        child = this._appendChild(id, time);

        if (activate) {
          this.activateChild(child);
        }
      }

      return child;
    },

    /**
     * Activates child.
     */
    activateChild: function(child) {
      child.activate();
      var id = child.id;
      this._activeChildren.set(id, child);
    },

    /**
     * Deactivates out of bound children.
     */
    deactivateChildren: function() {
      if (!this._activeChildren.length)
        return;

      // find center
      var idx = this._activeChildren.indexOf(
        this.currentChild.id
      );

      var items = this._activeChildren.items;

      // visible children -1 for the current...
      var max = this.visibleChildren;
      var children = items.splice(
        idx, max
      );

      var i = 0;
      var len = this._activeChildren.length;
      var id;
      var child;
      var curLen = len;

      for (; i < len; i++) {
        child = this._activeChildren.items[i];
        if (child && child[1]) {
          child = child[1];

          if (child.element) {
            child.element.style.transform = '';
          }

          child.deactivate();
        }
      }

      // cleanup extra children after we go
      // over the limit
      if (this.children.length > this.maxChildren) {
        var current = this.children.indexOf(
          this.currentChild.id
        );

        // we will remove down to just the minimum so
        // we don't need to keep calling this after for
        // each move...
        var keep = this.children.items.splice(
          current, this.visibleChildren
        );

        var remove = this.children.items;
        var len = remove.length;
        var i = 0;

        for (; i < len; i++) {
          remove[i][1].destroy();
        }

        this.children.items = keep;
      }

      this._activeChildren.items = children;
    },

    /**
     * Activates a given time adding children as needed.
     *
     * @param {Date} time center point to activate.
     * @param {Boolean} clear when true clear cache this
     *                        is required when non-sequential jumps
     *                        in time occur.
     */
    _activateTime: function(time) {
      var id = this._getId(time);

      this.currentChild = this._appendChild(id, time);

      // pad
      this._padChildren('past', this.paddingBefore, time);
      this._padChildren('future', this.paddingAfter, time);

      this.activateChild(this.currentChild);

      // show relevant views
      var max = this.visibleChildren;
      var child = this.currentChild;

      while (--max) {
        child = this.children.next(child.id);
        if (!child.active) {
          this.activateChild(child);
        }
      }

      if (this._internalMove) {
        this._internalMove = false;
      } else {
        this.deactivateChildren();
      }
    },

    _getPos: function(i, offset) {
      var pos = (this._childWidth * i) + offset;
      return 'translateX(' + pos + 'px)';
    },

    /**
     * Moves currently active frames.
     * If total number of active frames exceeds .visibleChildren
     * extra positions are assumed as padding and will be positioned
     * around the activeChildren.
     *
     * @param {Numeric} offset numeric offset (like the panning offset).
     */
    _moveFrames: function(offset) {
      offset -= this._frameMoveOffset;

      var i = 0;
      var items = this._activeChildren.items;
      var len = items.length;
      var width = this._childWidth;
      var frame;

      var frameOffset = 0;

      if (this._activeChildren.length > this.visibleChildren) {
        frameOffset = -1;
      }

      for (; i < len; i++) {
        // remember the first element in the frame
        // is actually the _previous_ element so
        // it should have a negative offset always...
        items[i][1].element.style.transform =
          this._getPos(i + frameOffset, offset);
      }
    },

    _pushFrame: function() {
      // get next frame
      var frame = this._activeChildren.items;
      var frameLen = this.visibleChildren + 2;

      if (frame.length > frameLen) {
        this._frameMoveOffset -= this._childWidth;
        // shift a frame off as it should
        // be out of the viewport now...
        var remove = frame.shift();
        remove[1].deactivate();
      }

      var child = this._padChildren(
        'future',
        1,
        frame[frame.length - 1][1].date,
        true
      );

      child.element.style.transform = this._getPos(
        0, this.viewportSize + 100
      );
    },

    _unshiftFrame: function() {
      var frameLen = this.visibleChildren + 2;
      var frame = this._activeChildren.items;

      if (frame.length > frameLen) {
        // shift a frame off as it should
        // be out of the viewport now...
        var remove = frame.pop();
        remove[1].deactivate();
      }

      var child = this._padChildren(
        'past',
        1,
        frame[0][1].date,
        true
      );

      child.element.style.transform = this._getPos(
        0, this.viewportSize + 100
      );

      this._frameMoveOffset += this._childWidth;
    },

    _pan: function(offset) {
      this._moveFrames(offset);

      var abs = Math.abs(offset) - this._panOffset;

      if (abs > this._childThreshold) {
        this._panOffset += this._childWidth;

        if (offset < 0) {
          this.moveNext();
          this._pushFrame();
        } else {
          this.movePrevious();
          this._unshiftFrame();
        }
      }
    },

    /**
     * Purge any child that is contained
     * by this timespan.
     *
     * @param {Calendar.Timespan} timespan span of time.
     */
    purgeChildren: function(span) {
      var key;
      var child;
      var i = 0;
      var len = this.children.length;

      var offset = 0;

      for (; i < len; i++) {
        child = this.children.items[i - offset][1];
        if (span.contains(child.timespan)) {
          child.destroy();
          this.children.items.splice(i - offset, 1);
          offset += 1;
        }
      }
    },

    onactive: function() {
      Calendar.View.prototype.onactive.apply(
        this, arguments
      );

      if (this.app && this.scale) {
        this.app.timeController.scale = this.scale;
      }
    }

  };

  return TimeParent;


}());
