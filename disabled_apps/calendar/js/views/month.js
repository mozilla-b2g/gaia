define(function(require, exports, module) {
'use strict';

var Calc = require('common/calc');
var GestureDetector = require('shared/gesture_detector');
var SingleMonth = require('./single_month');
var View = require('view');
var core = require('core');
var dateFromId = Calc.dateFromId;
var monthStart = Calc.monthStart;
var performance = require('performance');
var router = require('router');
var timeObserver = require('time_observer');

// minimum difference between X and Y axis to be considered an horizontal swipe
var XSWIPE_OFFSET = window.innerWidth / 10;

function Month() {
  View.apply(this, arguments);
  this.frames = new Map();
  window.addEventListener('localized', this);
  this._setPresentDate = this._setPresentDate.bind(this);
}
module.exports = Month;

Month.prototype = {
  __proto__: View.prototype,

  SCALE: 'month',

  selectors: {
    element: '#month-view',
  },

  date: null,

  /** @type {SingleMonth} */
  currentFrame: null,

  /**
   * used to detect if dbltap happened on same date
   * @type {DOMElement}
   */
  _lastTarget: null,

  /**
   * store current, previous and next months
   * we load them beforehand and keep on the cache to speed up swipes
   * @type {Array<SingleMonth>}
   */
  frames: null,

  onactive: function() {
    View.prototype.onactive.apply(this, arguments);
    core.timeController.scale = this.SCALE;
    if (this.currentFrame) {
      this.currentFrame.activate();
    }
  },

  _onswipe: function(data) {
    // only move to a different month if it's an horizontal swipe
    if (Math.abs(data.dy) > (Math.abs(data.dx) - XSWIPE_OFFSET)) {
      return;
    }
    var dir = document.documentElement.dir === 'rtl' ? -1 : 1;
    this._move(dir * data.dx < 0);
  },

  _onwheel: function(event) {
    // mouse wheel is used for a10y
    if (event.deltaMode !== event.DOM_DELTA_PAGE || event.deltaX === 0) {
      return;
    }
    this._move(event.deltaX > 0);
  },

  _move: function(isNext) {
    var controller = core.timeController;
    var date = isNext ? this._nextTime() : this._previousTime();
    // If we changed months, set the selected day to the 1st
    controller.selectedDay = date;
    controller.move(date);
  },

  _nextTime: function() {
    return monthStart(this.date, 1);
  },

  _previousTime: function() {
    return monthStart(this.date, -1);
  },

  _initEvents: function() {
    this.controller = core.timeController;

    this.element.addEventListener('swipe', this);
    this.element.addEventListener('wheel', this);
    this.controller.on('monthChange', this);
    this.delegate(this.element, 'click', '.month-day', this);
    this.delegate(this.element, 'dbltap', '.month-day', this);

    timeObserver.on('day', this._setPresentDate);

    this.gd = new GestureDetector(this.element);
    this.gd.startDetecting();
  },

  handleEvent: function(e, target) {
    switch (e.type) {
      case 'swipe':
        this._onswipe(e.detail);
        break;
      case 'wheel':
        this._onwheel(e);
        break;
      case 'click':
        var date = dateFromId(target.dataset.date);
        this.controller.selectedDay = date;
        break;
      case 'dbltap':
        // make sure we discard double taps that started on a different day
        if (this._lastTarget === target) {
          this._goToAddEvent();
        }
        break;
      case 'monthChange':
        this.changeDate(e.data[0]);
        break;
      case 'localized':
        this.reconstruct();
        break;
    }
    this._lastTarget = target;
  },

  _goToAddEvent: function(date) {
    // slight delay to avoid tapping the elements inside the add event screen
    setTimeout(() => {
      // don't need to set the date since the first tap triggers a click that
      // sets the  timeController.selectedDay
      router.go('/event/add/');
    }, 50);
  },

  changeDate: function(time) {
    this.date = monthStart(time);

    if (this.currentFrame) {
      this.currentFrame.deactivate();
    }

    this.currentFrame = this._getFrame(this.date);

    this._trimFrames();
    this._appendFrames();

    this.currentFrame.activate();
  },

  _getFrame: function(date) {
    var id = date.getTime();
    var frame = this.frames.get(id);
    if (!frame) {
      frame = new SingleMonth({
        date: date,
        container: this.element
      });
      frame.create();
      this.frames.set(id, frame);
    }
    return frame;
  },

  _trimFrames: function() {
    if (this.frames.size <= 3) {
      return;
    }

    // full month (we always keep previous/next months)
    var delta = 31 * 24 * 60 * 60 * 1000;

    this.frames.forEach((frame, ts) => {
      var base = Number(this.date);
      if (Math.abs(base - ts) > delta) {
        frame.destroy();
        this.frames.delete(ts);
      }
    });
  },

  _appendFrames: function() {
    // sort elements by timestamp (key = timestamp) so DOM makes more sense
    Array.from(this.frames.keys())
    .sort((a, b) => a - b)
    .forEach(key => this.frames.get(key).append());
  },

  _setPresentDate: function() {
    var id = Calc.getDayId(new Date());
    var presentDate = this.element.querySelector('[data-date="' + id + '"]');
    var previousDate = this.element.querySelector('.present');

    if (previousDate) {
      previousDate.classList.remove('present');
      previousDate.classList.add('past');
    }
    if (presentDate) {
      presentDate.classList.add('present');
    }
  },

  oninactive: function() {
    View.prototype.oninactive.call(this);
    if (this.currentFrame) {
      this.currentFrame.deactivate();
    }
  },

  onfirstseen: function() {
    this._initEvents();
    this.changeDate(this.controller.month);
    performance.monthReady();
  },

  destroy: function() {
    this.frames.forEach((frame, key) => {
      this.frames.delete(key);
      frame.destroy();
    });
  },

  reconstruct: function() {
    // Watch for changed value from transition of a locale to another
    this.destroy();
    this.changeDate(this.controller.month);
  }

};

});
