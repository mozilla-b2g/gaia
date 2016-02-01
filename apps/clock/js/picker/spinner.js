define(function(require) {
  'use strict';
  /* global IntlHelper */

  var Template = require('template');
  var GestureDetector = require('shared/js/gesture_detector');
  var spinnerHtml = require('text!picker/spinner.html');

  // units covered per millisecond threshold to kick off inertia
  var SPEED_THRESHOLD = 0.01;

  // max units covered by inertia
  var INERTIA_MAXIMUM = 15;

  // not the same as animation duration, this accounts for "slowing down",
  // measured in miliseconds
  var INERTIA_DURATION = 300;

  // number of milliseconds after last motion without leting go
  // we will select whatever is being "hovered" and cancel momentum
  var DRAGGING_TIMEOUT = 200;

  IntlHelper.define('digit-padding', 'number', {
    style: 'decimal',
    useGrouping: false,
    minimumIntegerDigits: 2
  });

  function calculateSpeed(previous, current) {
    /* jshint validthis:true */
    var motion = (previous.y - current.y) / this.unitHeight;
    var delta = current.time - previous.time;
    var speed = motion / delta;

    return parseFloat(speed.toFixed(4)) || 0;
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
    // define some non writable properties
    Object.defineProperties(this, {
      value: {
        get: function() {
          return this.values[this.index];
        },
        set: function(value) {
          this.select(this.values.indexOf(parseInt(value)));
        }
      },
      unitHeight: {
        get: function() {
          return this.element.children[0].clientHeight;
        }
      },
      space: {
        get: function() {
          return this.unitHeight * this.length;
        }
      },
      container: {
        value: setup.element.parentNode
      },
      element: {
        value: setup.element
      },
      values: {
        value: setup.values
      },
      length: {
        value: setup.values.length
      },
      textValues: {
        value: setup.textValues || setup.values
      },
      isPadded: {
        value: setup.isPadded || false
      },
      l10nId: {
        value: setup.l10nId || null
      }
    });

    this.template = new Template(spinnerHtml);

    this.top = 0;
    this.index = 0;

    this.previous = new Touch();
    this.current = new Touch();

    this.timeout = null;

    var html = '';

    var formatter = IntlHelper.get(
      this.isPadded ? 'digit-padding' : 'digit-nopadding');

    for (var i = 0; i < this.length; i++) {
      html += this.template.interpolate({
        value: this.values[i].toString(),
        text: formatter.format(this.values[i])
      });
    }

    this.element.innerHTML = html;

    this.container.addEventListener('touchstart', this, false);
    this.container.addEventListener('pan', this, false);
    this.container.addEventListener('swipe', this, false);
    this.container.addEventListener('keypress', this, false);
    this.container.setAttribute('aria-valuemax', this.upper);
    this.container.setAttribute('aria-valuemin', this.lower);
    this.container.setAttribute('aria-valuenow', this.index);
    if (this.l10nId) {
      document.l10n.setAttributes(
        this.container,
        this.l10nId,
        {n: this.values[i]}
      );
    }

    IntlHelper.observe(['digit-padding', 'digit-nopadding'],
      this.resetValues.bind(this));

    this.reset();

    new GestureDetector(this.container).startDetecting();
  }

  Spinner.prototype.resetValues = function() {
    var formatter = IntlHelper.get(
      this.isPadded ? 'digit-padding' : 'digit-nopadding');

    var units = [...this.container.querySelectorAll('.picker-unit')];

    units.forEach(unit => {
      var value = parseInt(unit.dataset.value);
      unit.textContent = formatter.format(value);
    });
  };

  Spinner.prototype.reset = function() {
    this.index = 0;
    this.top = 0;
    this.update();
  };

  Spinner.prototype.update = function() {
    this.container.setAttribute('aria-valuenow', this.index);
    this.container.setAttribute('aria-valuetext', this.textValues[this.index]);
    this.element.style.transform = 'translateY(' + this.top + 'px)';
  };

  Spinner.prototype.select = function(index) {
    index = Math.round(index);

    if (index < 0) {
      index = 0;
    }

    if (index > this.length - 1) {
      index = this.length - 1;
    }

    if (index !== this.index) {
      this.index = index;
    }

    this.top = -this.index * this.unitHeight;
    this.update();

    return index;
  };

  Spinner.prototype.handleEvent = function(event) {
    this['on' + event.type](event);
  };

  Spinner.prototype.stopInteraction = function() {
    this.element.classList.add('animation-on');

    clearTimeout(this.timeout);

    this.select(this.index);
    this.speed = 0;
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
    var diff;

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
    this.speed = calculateSpeed.call(this, this.previous, this.current);

    diff = this.current.y - this.previous.y;

    this.top = this.top + diff;

    if (this.top > 0) {
      this.top = 0;
    }
    if (this.top < -this.space) {
      this.top = -this.space;
    }

    this.index = Math.round(Math.abs(this.top) / this.unitHeight);
    this.update();

    clearTimeout(this.timeout);

    var stopInteraction = this.stopInteraction.bind(this);
    this.timeout = setTimeout(stopInteraction, DRAGGING_TIMEOUT);

    this.previous.y = this.current.y;
    this.previous.time = this.current.time;
  };

  Spinner.prototype.onswipe = function(event) {

    event.stopPropagation();

    // Add momentum if speed is higher than a given threshold.
    var direction = this.speed > 0 ? 1 : -1;
    var speed = this.speed / direction;
    if (speed >= SPEED_THRESHOLD) {
      this.index += Math.round(
        Math.min(speed * INERTIA_DURATION, INERTIA_MAXIMUM) * direction
      );
    }

    this.stopInteraction();

  };

  Spinner.prototype.onkeypress = function(event) {
    this.element.classList.add('animation-on');
    if (event.keyCode == KeyEvent.DOM_VK_DOWN) {
      this.select(this.index - 1);
    } else {
      this.select(this.index + 1);
    }
  };

  return Spinner;
});
