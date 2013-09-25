define(function(require) {
  'use strict';

  var Template = require('template');
  var GestureDetector = require('gesture_detector');
  var SPEED_THRESHOLD = 0.1;
  var INERTIA_MULTIPLIER = 5;

  function calculateSpeed(previous, current) {
    var motion = previous.y - current.y;
    var delta = current.time - previous.time;
    var speed = motion / delta;

    return parseFloat(speed.toFixed(2));
  }

  function Touch(touch = {}) {
    this.x = touch.x || 0;
    this.y = touch.y || 0;
    this.time = touch.time || 0;
  }

  /**
   * Spinner
   *
   * Create a select list spinner.
   *
   * @param {Object} setup An object containing setup data.
   *                       - element, a DOM element to create
   *                         the spinner with.
   *                       - values, an array of values to
   *                         populate the spinner with.
   *
   *
   * new Spinner({
   *   element: this.selector[picker],
   *   values: values
   * });
   *
   *
   */
  function Spinner(setup = {}) {
    this.element = setup.element;
    this.values = setup.values;
    this.template = new Template('picker-unit-tmpl');

    this.top = 0;
    this.space = 0;

    this.lower = 0;
    this.upper = setup.values.length - 1;
    this.range = setup.values.length;
    this.unit = 0;
    this.direction = 0;

    this.index = 0;

    this.previous = new Touch();
    this.current = new Touch();

    this.timeout = null;

    var length = this.values.length;
    var html = '';
    var speed = 0;
    var node;

    for (var i = 0; i < length; i++) {
      html += this.template.interpolate({
        // Coerce the number value to a string
        unit: this.values[i] + ''
      });
    }

    this.element.innerHTML = html;

    this.element.addEventListener('touchstart', this, false);
    this.element.addEventListener('pan', this, false);
    this.element.addEventListener('swipe', this, false);

    Object.defineProperties(this, {
      value: {
        get: function() {
          return this.values[this.index];
        },
        set: function(value) {
          this.select(this.values.indexOf(value));
        }
      }
    });

    this.select(0);

    new GestureDetector(this.element).startDetecting();
  }

  Spinner.prototype.reset = function() {
    this.unit = this.element.children[0].clientHeight;
    this.space = this.unit * this.range;
    this.index = 0;
    this.top = 0;
    this.update();
  };

  Spinner.prototype.update = function() {
    this.element.style.transform = 'translateY(' + this.top + 'px)';
  };

  Spinner.prototype.select = function(index) {

    index = Math.round(index);

    if (index < this.lower) {
      index = this.lower;
    }

    if (index > this.upper) {
      index = this.upper;
    }

    if (index !== this.index) {
      this.index = index;
    }

    this.top = -this.index * this.unit;
    this.update();

    return index;
  };

  Spinner.prototype.handleEvent = function(event) {
    this['on' + event.type](event);
  };

  /**
   * ontouchstart - prevent default action (stops scrolling)
   */
  Spinner.prototype.ontouchstart = function(event) {
    event.preventDefault();
  };

  Spinner.prototype.onpan = function(event) {
    event.stopPropagation();
    var position = event.detail.position;
    var diff, moving;

    // If this is the first pan event after a swipe...
    if (this.element.classList.contains('animation-on')) {
      this.element.classList.remove('animation-on');

      this.select(this.index);

      this.previous.y = position.clientY;
      this.previous.time = position.timeStamp;
      return;
    }

    this.current.y = position.clientY;
    this.current.time = position.timeStamp;

    this.speed = calculateSpeed(this.previous, this.current);

    diff = this.current.y - this.previous.y;
    moving = Math.abs(this.speed) > SPEED_THRESHOLD ? diff : diff / 4;

    this.top = this.top + moving;

    if (this.top > 0) {
      this.top = 0;
    }

    this.index = Math.round(Math.abs(this.top) / this.unit);
    this.update();

    clearInterval(this.timeout);

    this.timeout = setTimeout(this.onswipe.bind(this), 200);

    this.previous.y = this.current.y;
    this.previous.time = this.current.time;
  };

  Spinner.prototype.onswipe = function(event) {
    event.stopPropagation();
    this.element.classList.add('animation-on');

    clearInterval(this.timeout);

    var index = this.index;

    // TODO: File ticket to calculate new index
    //        based on last pan event's speed.

    this.select(index);
    this.speed = 0;
  };

  return Spinner;
});
