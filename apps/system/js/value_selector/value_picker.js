/**
 * base widget used in ValueSelector and SpinDatePicker widget
 */
var ValuePicker = (function() {
  //
  // Constructor
  //
  function VP(e, unitStyle) {
    this.element = e;
    this.container = e.parentNode;
    this._valueDisplayedText = unitStyle.valueDisplayedText;
    this._unitClassName = unitStyle.className;
    this._top = 0;
    this._lower = 0;
    this._upper = unitStyle.valueDisplayedText.length - 1;
    this._range = unitStyle.valueDisplayedText.length;
    this._currentIndex = 0;
    this.init();
  }

  //
  // Public methods
  //
  VP.prototype.getSelectedIndex = function() {
    var selectedIndex = this._currentIndex;
    return selectedIndex;
  };

  VP.prototype.getSelectedDisplayedText = function() {
    var displayedText = this._valueDisplayedText[this._currentIndex];
    return displayedText;
  };

  VP.prototype.setSelectedIndex = function(tunedIndex, ignorePicker) {
    if ((tunedIndex % 1) > 0.5) {
      tunedIndex = Math.floor(tunedIndex) + 1;
    } else {
      tunedIndex = Math.floor(tunedIndex);
    }

    if (tunedIndex < this._lower)
      tunedIndex = this._lower;

    if (tunedIndex > this._upper)
      tunedIndex = this._upper;

    if (this._currentIndex != tunedIndex) {
      this._currentIndex = tunedIndex;
      this.onselectedindexchange(this._currentIndex);
    }
    this.updateUI(tunedIndex, ignorePicker);

    return tunedIndex;
  };

  VP.prototype.setSelectedIndexByDisplayedText = function(displayedText) {
    var newIndex = this._valueDisplayedText.indexOf(displayedText);
    if (newIndex != -1) {
      if (this._currentIndex != newIndex) {
        this._currentIndex = newIndex;
        this.onselectedindexchange(this._currentIndex);
      }
      this.updateUI(newIndex);
    }
  };

  VP.prototype.setRange = function(lower, upper) {
    if (lower !== null) {
      this._lower = lower;
    } else {
      this._lower = 0;
    }

    if (upper !== null) {
      this._upper = upper;
    } else {
      this._upper = unitStyle.valueDisplayedText.length - 1;
    }

    var unitElement = this.element.firstElementChild;
    var index = 0;
    while (unitElement) {
      unitElement.dataset.disabled =
        (index < this._lower || index > this._upper);
      unitElement = unitElement.nextElementSibling;
      index++;
    }

    this.container.setAttribute('aria-valuemin', this._lower);
    this.container.setAttribute('aria-valuemax', this._upper);

    this._range = this._upper - this._lower + 1;
    this.setSelectedIndex(this._currentIndex);
  };

  //
  // Internal methods
  //
  VP.prototype.init = function() {
    this.initUI();
    this.setSelectedIndex(0); // Default Index is zero
    this.keypressHandler = vp_keypress.bind(this);
    this.mousedonwHandler = vp_mousedown.bind(this);
    this.mousemoveHandler = vp_mousemove.bind(this);
    this.mouseupHandler = vp_mouseup.bind(this);
    this.addEventListeners();
  };

  VP.prototype.initUI = function() {
    this.container.setAttribute('role', 'spinbutton');
    this.container.setAttribute('aria-valuemin', this._lower);
    this.container.setAttribute('aria-valuemax', this._upper);
    var unitCount = this._valueDisplayedText.length;
    for (var i = 0; i < unitCount; ++i) {
      this.addPickerUnit(i);
    }
    // cache the size of picker
    this._pickerUnits = this.element.children;
    this._pickerUnitsHeight = this._pickerUnits[0].clientHeight;
    this._pickerHeight = this._pickerUnits[0].clientHeight *
                                     this._pickerUnits.length;
    this._space = this._pickerHeight / this._range;
  };

  VP.prototype.addPickerUnit = function(index) {
    var html = this._valueDisplayedText[index];
    var unit = document.createElement('div');
    unit.className = this._unitClassName;
    unit.innerHTML = html;
    this.element.appendChild(unit);
  };

  VP.prototype.updateUI = function(index, ignorePicker) {
    if (true !== ignorePicker) {
      this._top = -index * this._space;
      this.element.style.transform = 'translateY(' + this._top + 'px)';
      this.container.setAttribute('aria-valuenow', index);
      this.container.setAttribute('aria-valuetext',
                                  this._valueDisplayedText[index]);
    }
  };

  VP.prototype.addEventListeners = function() {
    this.container.addEventListener('keypress', this.keypressHandler, false);
    this.element.addEventListener('mousedown', this.mousedonwHandler, false);
  };

  VP.prototype.removeEventListeners = function() {
    this.element.removeEventListener('mouseup', this.mouseupHandler, false);
    this.element.removeEventListener('mousemove', this.mousemoveHandler, false);
  };

  VP.prototype.uninit = function() {
    this._top = 0;
    this.element.removeEventListener('mousedown', this.mousedonwHandler, false);
    this.element.removeEventListener('mouseup', this.mouseupHandler, false);
    this.element.removeEventListener('mousemove', this.mousemoveHandler, false);
    this.element.style.transform = 'translateY(0px)';
    this.container.removeEventListener('keypress', this.keypressHandler, false);
    this.container.removeAttribute('role');
    this.container.removeAttribute('aria-valuemin');
    this.container.removeAttribute('aria-valuemax');
    this.container.removeAttribute('aria-valuenow');
    this.container.removeAttribute('aria-valuetext');
    this.onselectedindexchange = null;
    empty(this.element);
  };

  VP.prototype.onselectedindexchange = function(index) {};

  function cloneEvent(evt) {
    if ('touches' in evt)
      evt = evt.touches[0];
    return { x: evt.pageX, y: evt.pageY, timestamp: evt.timeStamp };
  }

  function empty(element) {
    while (element.hasChildNodes())
      element.removeChild(element.lastChild);
    element.innerHTML = '';
  }

  //
  // Tuneable parameters
  //
  var SPEED_THRESHOLD = 0.1;
  var currentEvent, startEvent, currentSpeed;
  var tunedIndex = 0;

  function toFixed(value) {
    return parseFloat(value.toFixed(1));
  }

  function calcSpeed() {
    var movingSpace = startEvent.y - currentEvent.y;
    var deltaTime = currentEvent.timestamp - startEvent.timestamp;
    var speed = movingSpace / deltaTime;
    currentSpeed = parseFloat(speed.toFixed(2));
  }

  function calcTargetIndex(space) {
    return tunedIndex - getMovingSpace() / space;
  }

  // If the user swap really slow, narrow down the moving space
  // So the user can fine tune value.
  function getMovingSpace() {
    var movingSpace = currentEvent.y - startEvent.y;
    var reValue = Math.abs(currentSpeed) > SPEED_THRESHOLD ?
                                movingSpace : movingSpace / 4;
    return reValue;
  }

  function vp_mousemove(event) {
    event.stopPropagation();
    event.target.setCapture(true);
    currentEvent = cloneEvent(event);

    calcSpeed();

    // move selected index
    this._top = this._top + getMovingSpace();
    this.element.style.transform = 'translateY(' + this._top + 'px)';

    tunedIndex = calcTargetIndex(this._space);
    var roundedIndex = Math.round(tunedIndex * 10) / 10;

    if (roundedIndex != this._currentIndex)
      this.setSelectedIndex(toFixed(roundedIndex), true);

    startEvent = currentEvent;
  }

  function vp_mouseup(event) {
    event.stopPropagation();
    this.removeEventListeners();

    // Add animation back
    this.element.classList.add('animation-on');

    // Add momentum if speed is higher than a given threshold.
    if (Math.abs(currentSpeed) > SPEED_THRESHOLD) {
      var direction = currentSpeed > 0 ? 1 : -1;
      tunedIndex += Math.min(Math.abs(currentSpeed) * 5, 5) * direction;
    }
    tunedIndex = this.setSelectedIndex(toFixed(tunedIndex));
    currentSpeed = 0;
  }

  function vp_mousedown(event) {
    event.stopPropagation();

    // Stop animation
    this.element.classList.remove('animation-on');

    startEvent = currentEvent = cloneEvent(event);
    tunedIndex = this._currentIndex;

    this.removeEventListeners();
    this.element.addEventListener('mousemove', this.mousemoveHandler, false);
    this.element.addEventListener('mouseup', this.mouseupHandler, false);
  }

  function vp_keypress(event) {
    if (event.keyCode == KeyEvent.DOM_VK_DOWN)
      this.setSelectedIndex(this._currentIndex - 1);
    else
      this.setSelectedIndex(this._currentIndex + 1);
  }

  return VP;
}());
