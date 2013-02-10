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
    summary = weekdays.join('<span class="comma">,</span> ');
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
    this.mousedownHandler = vp_mousedown.bind(this);
    this.mousemoveHandler = vp_mousemove.bind(this);
    this.mouseupHandler = vp_mouseup.bind(this);
    this.transitionendHandler = vp_transitionend.bind(this);
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
    this.resetUI();
    if (true !== ignorePicker) {
      this.element.style.top =
            (this._lower - index) * this._space + 'px';
    }
  };

  VP.prototype.addEventListeners = function() {
    this.element.addEventListener('mousedown', this.mousedownHandler, false);
  };

  VP.prototype.removeEventListeners = function() {
    this.element.removeEventListener('mouseup', this.mouseupHandler, false);
    this.element.removeEventListener('mousemove', this.mousemoveHandler, false);
  };

  VP.prototype.resetUI = function() {
    var actives = this.element.querySelectorAll('.active');
    for (var i = 0; i < actives.length; i++) {
      actives[i].classList.remove('active');
    }
    this._pickerUnits[this._currentIndex].classList.add('active');
  };

  function cloneEvent(evt) {
    if ('touches' in evt) {
      evt = evt.touches[0];
    }
    return { x: evt.pageX, y: evt.pageY,
             timestamp: MouseEventShim.getEventTimestamp(evt) };
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

  function vp_transitionend() {
    this.element.classList.remove('animation-on');
    this.element.removeEventListener('transitionend',
                                     this.transitionendHandler);
  }

  function vp_mousemove(event) {
    event.stopPropagation();
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
    this.element.addEventListener('transitionend', this.transitionendHandler);
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
    event.target.setCapture(true);
    MouseEventShim.setCapture();

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

