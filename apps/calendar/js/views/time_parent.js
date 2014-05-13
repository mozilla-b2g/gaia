/* global GestureDetector */
Calendar.ns('Views').TimeParent = (function() {
  'use strict';

  var XSWIPE_OFFSET = window.innerWidth / 10;

  /**
   * Parent view for busytime-based views
   * (month, week, day) contains basic
   * handlers for purging frames, panning, etc...
   *
   * Each "child" must be added to frames.
   * Each child must be identified by some id.
   *
   * Child classes are expected to have "create"
   * method and "destroy" methods for adding &
   * removing them from the dom.
   */
  function TimeParent() {
    Calendar.View.apply(this, arguments);
    this._initEvents();
  }

  TimeParent.prototype = {
    __proto__: Calendar.View.prototype,

    get frameContainer() {
      return this.element;
    },

    _initEvents: function() {
      this.app.timeController.on('purge', this);
      this.element.addEventListener('swipe', this);

      this.gd = new GestureDetector(this.element);
      this.gd.startDetecting();
    },

    _onswipe: function(data) {
      if (Math.abs(data.dy) > (Math.abs(data.dx) - XSWIPE_OFFSET)) {
        return false;
      }

      var dir = data.direction;
      var controller = this.app.timeController;

      // TODO: RTL
      if (dir === 'left') {
        controller.move(this._nextTime(this.date));
      } else {
        controller.move(this._previousTime(this.date));
      }
      return true;
    },

    handleEvent: function(e) {
      switch (e.type) {
        case 'swipe':
          this._onswipe(e.detail);
          break;
        case 'purge':
          this._purgeFrames(e.data[0]);
          break;
      }
    },

    /**
     * Creates a single 'frame' for the parent.
     * A frame can be any object with the following capabilities;
     *
     *    - element: property that contains a dom element
     *               that has yet to be inserted into the document.
     *
     *    - timespan: a timespan object for purge events.
     *
     *    - activate: a method to activate the frame.
     *
     *    - deactivate: a method to deactivate the frame.
     *
     *    - destroy: a method to destroy the frame.
     *
     *
     * The default behaviour of this method is to use
     * the 'childClass' property to create an object
     * to use as the frame. In day/month cases the frame
     * can be the child class directly.
     *
     * @param {Date} date frame time.
     */
    _createFrame: function(date) {
      /** default childClass implementation */
      var child = new this.childClass({
        app: this.app,
        date: date
      });
      child.create();
      return child;
    },

    _nextTime: function() {},
    _previousTime: function() {},

    /**
     * Adds a frame for the given time.
     *
     * @param {Date} date time to add frame for.
     * @return {Object} existing or newly added frame.
     */
    addFrame: function(date) {
      var frame = this._createFrame(date);
      // XXX: look into correctly positioning
      //      elements by their viewing order.
      this.frameContainer.appendChild(
        frame.element
      );
      return frame;
    },

    /**
     * Changes date of the parent frame.
     *
     * @param {Date} time center point to activate.
     */
    changeDate: function(time) {
      var prevScrollTop = 0;

      if (this.currentFrame) {
        prevScrollTop = this.currentFrame.getScrollTop();
        this.currentFrame.destroy();
      }

      this.date = time;

      // create & activate current frame
      var cur = this.currentFrame = this.addFrame(time);
      cur.activate();
      cur.setScrollTop(prevScrollTop);
    },

    /**
     *
     * @param {Calendar.Timespan} timespan span of time.
     */
    _purgeFrames: function(span) {
      if (this.currentFrame && span.contains(this.currentFrame.timespan)) {
        this.currentFrame.destroy();
        this.currentFrame = null;
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
