'use strict';

function escapeHTML(str, escapeQuotes) {
  var span = document.createElement('span');
  span.textContent = str;

  if (escapeQuotes)
    return span.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  return span.innerHTML;
}

function summarizeDaysOfWeek(bitStr) {
  var _ = navigator.mozL10n.get;

  if (bitStr == '')
    return _('never');

  // Format bits: 0123456(0000000)
  // Case: Everyday:  1111111
  // Case: Weekdays:  1111100
  // Case: Weekends:  0000011
  // Case: Never:     0000000
  // Case: Specific:  other case  (Mon, Tue, Thu)

  var summary = '';
  switch (bitStr) {
  case '1111111':
    summary = _('everyday');
    break;
  case '1111100':
    summary = _('weekdays');
    break;
  case '0000011':
    summary = _('weekends');
    break;
  case '0000000':
    summary = _('never');
    break;
  default:
    var weekdays = [];
    for (var i = 0; i < bitStr.length; i++) {
      if (bitStr.substr(i, 1) == '1') {
        // Note: here, Monday is the first day of the week
        // whereas in JS Date(), it's Sunday -- hence the (+1) here.
        weekdays.push(_('weekday-' + ((i + 1) % 7) + '-short'));
      }
    }
    summary = weekdays.join(', ');
  }
  return summary;
}

function is12hFormat() {
  var localeTimeFormat = navigator.mozL10n.get('dateTimeFormat_%X');
  var is12h = (localeTimeFormat.indexOf('%p') >= 0);
  return is12h;
}

function getLocaleTime(d) {
  var f = new navigator.mozL10n.DateTimeFormat();
  var is12h = is12hFormat();
  return {
    t: f.localeFormat(d, (is12h ? '%I:%M' : '%H:%M')).replace(/^0/, ''),
    p: is12h ? f.localeFormat(d, '%p') : ''
  };
}

function isAlarmPassToday(hour, minute) { // check alarm has passed or not
  var now = new Date();
  if (hour > now.getHours() ||
      (hour == now.getHours() && minute > now.getMinutes())) {
    return false;
  }
  return true;
}

function getNextAlarmFireTime(alarm) { // get the next alarm fire time
  var repeat = alarm.repeat;
  var hour = alarm.hour;
  var minute = alarm.minute;
  var now = new Date();
  var nextAlarmFireTime = new Date();
  var diffDays = 0; // calculate the diff days from now
  if (repeat == '0000000') { // one time only and alarm within 24 hours
    if (isAlarmPassToday(hour, minute)) // if alarm has passed already
      diffDays = 1; // alarm tomorrow
  } else { // find out the first alarm day from the repeat info.
    var weekDayFormatRepeat =
      repeat.slice(-1).concat(repeat.slice(0, repeat.length - 1));
    var weekDayOfToday = now.getDay();
    var index = 0;
    for (var i = 0; i < weekDayFormatRepeat.length; i++) {
      index = (i + weekDayOfToday) % 7;
      if (weekDayFormatRepeat.charAt(index) == '1') {
        if (diffDays == 0) {
          if (!isAlarmPassToday(hour, minute)) // if alarm has passed already
            break;

          diffDays++;
          continue;
        }
        break;
      }
      diffDays++;
    }
  }

  nextAlarmFireTime.setDate(nextAlarmFireTime.getDate() + diffDays);
  nextAlarmFireTime.setHours(hour);
  nextAlarmFireTime.setMinutes(minute);
  nextAlarmFireTime.setSeconds(0, 0);

  return nextAlarmFireTime;
}

function changeSelectByValue(selectElement, value) {
  var options = selectElement.options;
  for (var i = 0; i < options.length; i++) {
    if (options[i].value == value) {
      if (selectElement.selectedIndex != i) {
        selectElement.selectedIndex = i;
      }
      break;
    }
  }
}

function getSelectedValue(selectElement) {
  return selectElement.options[selectElement.selectedIndex].value;
}

function getSelectedValueByIndex(selectElement, index) {
  if (0 <= index < selectElement.options.length)
    return selectElement.options[index].value;
}

var ValuePicker = (function() {

  //
  // Constructor
  //
  function VP(e, unitStyle) {
    this.element = e;
    this._valueDisplayedText = unitStyle.valueDisplayedText;
    this._unitClassName = unitStyle.className;
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

    if (tunedIndex < this._lower) {
      tunedIndex = this._lower;
    }

    if (tunedIndex > this._upper) {
      tunedIndex = this._upper;
    }

    this._currentIndex = tunedIndex;
    this.updateUI(tunedIndex, ignorePicker);

    return tunedIndex;
  };

  VP.prototype.setSelectedIndexByDisplayedText = function(displayedText) {
    var newIndex = this._valueDisplayedText.indexOf(displayedText);
    if (newIndex != -1) {
      this._currentIndex = newIndex;
      this.updateUI(newIndex);
    }
  };

  //
  // Internal methods
  //
  VP.prototype.init = function() {
    this.initUI();
    this.setSelectedIndex(0); // Default Index is zero
    this.mousedonwHandler = vp_mousedown.bind(this);
    this.mousemoveHandler = vp_mousemove.bind(this);
    this.mouseupHandler = vp_mouseup.bind(this);
    this.addEventListeners();
  };

  VP.prototype.initUI = function() {
    var lower = this._lower;
    var upper = this._upper;
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
      this.element.style.top =
            (this._lower - index) * this._space + 'px';
    }
  };

  VP.prototype.addEventListeners = function() {
    this.element.addEventListener('mousedown', this.mousedonwHandler, false);
  };

  VP.prototype.removeEventListeners = function() {
    this.element.removeEventListener('mouseup', this.mouseupHandler, false);
    this.element.removeEventListener('mousemove', this.mousemoveHandler, false);
  };

  function cloneEvent(evt) {
    if ('touches' in evt) {
      evt = evt.touches[0];
    }
    return { x: evt.pageX, y: evt.pageY, timestamp: evt.timeStamp };
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
    this.element.style.top = parseFloat(this.element.style.top) +
                              getMovingSpace() + 'px';

    tunedIndex = calcTargetIndex(this._space);
    var roundedIndex = Math.round(tunedIndex * 10) / 10;

    if (roundedIndex != this._currentIndex) {
      this.setSelectedIndex(toFixed(roundedIndex), true);
    }

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

  return VP;
}());


var ValueSelector = (function() {
  //
  // Constructor
  //
  function VS() {
    this._containers = {};
    this._popups = {};
    this._buttons = {};
    this._onConfirmHandler = null;
    this._onCancelHandler = null;
    this._onClickOptionHandler = null;
    this.init();
  }

  //
  // Internal methods
  //
  VS.prototype.debug = function(msg) {
    var debugFlag = false;
    if (debugFlag) {
      console.log('[ValueSelector] ', msg);
    }
  },

  VS.prototype.init = function() {
    this._element = document.getElementById('value-selector');
    this._element.addEventListener('mousedown', this);
    this._containers =
      document.getElementById('value-selector-container');
    this._containers.addEventListener('click', this);
    this._popups =
      document.getElementById('select-option-popup');
    this._popups.addEventListener('submit', this);

    this._buttons = document.getElementById('select-options-buttons');
    this._buttons.addEventListener('click', this);

    window.addEventListener('appopen', this);
    window.addEventListener('appwillclose', this);
  },

  VS.prototype.handleEvent = function(evt) {
    switch (evt.type) {
      case 'appopen':
      case 'appwillclose':
        this.hide();
        break;
      case 'click':
        var currentTarget = evt.currentTarget;
        switch (currentTarget) {
          case this._buttons:
            var target = evt.target;
            if (target.dataset.type == 'cancel') {
              this.cancel();
            } else if (target.dataset.type == 'ok') {
              this.confirm();
            }
            break;

          case this._containers:
            this.handleSelect(evt.target);
            break;
        }
        break;

      case 'submit':
        // Prevent the form from submit.
      case 'mousedown':
        // Prevent focus being taken away by us.
        evt.preventDefault();
        break;

      default:
        this.debug('no event handler defined for' + evt.type);
        break;
    }
  },

  VS.prototype.handleSelect = function(target) {

    if (target.dataset === undefined ||
        (target.dataset.optionIndex === undefined &&
         target.dataset.optionValue === undefined))
      return;

    var selectee = this._containers.querySelectorAll('[aria-checked="true"]');
    for (var i = 0; i < selectee.length; i++) {
      selectee[i].removeAttribute('aria-checked');
    }
    target.setAttribute('aria-checked', 'true');

    if (this._onClickOptionHandler)
      this._onClickOptionHandler(target);
  },

  VS.prototype.cancel = function() {
    this.debug('cancel invoked');
    if (this._onCancelHandler)
      this._onCancelHandler();

    this.hide();
  },

  VS.prototype.confirm = function() {

    var singleOptionIndex;
    var selectee = this._containers.querySelectorAll('[aria-checked="true"]');
    if (selectee.length > 0)
      singleOptionIndex = selectee[0].dataset.optionIndex;

    if (this._onConfirmHandler)
      this._onConfirmHandler(singleOptionIndex);

    this.hide();
  },

  //
  // Public methods
  //
  VS.prototype.buildOptions = function(options) {

    var optionHTML = '';

    function escapeHTML(str) {
      var span = document.createElement('span');
      span.textContent = str;
      return span.innerHTML;
    }

    for (var i = 0, n = options.length; i < n; i++) {

      var checked = options[i].selected ? ' aria-checked="true"' : '';
      options[i].optionIndex = i;
      // This for attribute is created only to avoid applying
      // a general rule in building block
      var forAttribute = ' for="gaia-option-' + options[i].optionIndex + '"';

      optionHTML += '<li data-option-index="' + options[i].optionIndex + '"' +
                     checked + '>' +
                     '<label' + forAttribute + '> <span>' +
                     escapeHTML(options[i].text) +
                     '</span></label>' +
                    '</li>';
    }

    var optionsContainer = document.querySelector(
                             '#value-selector-container ol');
    if (!optionsContainer)
      return;

    optionsContainer.innerHTML = optionHTML;

    // Apply different style when the options are more than 1 page
    if (options.length > 5) {
      this._containers.classList.add('scrollable');
    } else {
      this._containers.classList.remove('scrollable');
    }
  },

  VS.prototype.show = function() {
    this._element.hidden = false;
  },

  VS.prototype.hide = function() {
    this._element.hidden = true;
  },

  VS.prototype.setSelectedIndex = function(index) {
    var selectee = this._containers.querySelectorAll('[aria-checked="true"]');
    for (var i = 0; i < selectee.length; i++) {
      selectee[i].removeAttribute('aria-checked');
    }
    var id = 'li[data-option-index="' + index + '"]';
    var selectedOption = document.querySelector(id);
    selectedOption.setAttribute('aria-checked', 'true');
  },

  VS.prototype.setOnConfirmHandler = function(confirmHandler) {
    this._onConfirmHandler = confirmHandler;
  },

  VS.prototype.setOnCancelHandler = function(cancelHandler) {
    this._onCancelHandler = cancelHandler;
  },

  VS.prototype.setOnClickOptionHandler = function(clickOptionHandler) {
    this._onClickOptionHandler = clickOptionHandler;
  }

  return VS;
}());

