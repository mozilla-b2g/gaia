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

  VP.prototype.setSelectedIndex = function(index, ignorePicker) {
    this.updateCurrentIndex(index, ignorePicker);
    this.align();
  };

  VP.prototype.updateCurrentIndex = function(index, ignorePicker) {
    index = Math.max(this._lower, index);
    index = Math.min(this._upper, index);
    this._currentIndex = index;
    this.updateUI(index, ignorePicker);
    return index;
  };

  VP.prototype.setSelectedIndexByDisplayedText = function(displayedText) {
    var newIndex = this._valueDisplayedText.indexOf(displayedText);
    this.setSelectedIndex(newIndex);
  };

  //
  // Tuneable parameters
  //
  var SPEED_THRESHOLD = 0.5;
  var OVER_SCROLL = 28; // in pixel. to simulate bounce effect.
  //
  // Internal methods
  //
  VP.prototype.init = function() {
    this.initUI();
    this.align();
    this.setSelectedIndex(0); // Default Index is zero
    this.mousedownHandler = vp_mousedown.bind(this);
    this.mousemoveHandler = vp_mousemove.bind(this);
    this.mouseupHandler = vp_mouseup.bind(this);
    this.transitionendHandler = vp_transitionend.bind(this);
    this.addEventListeners();
  };

  VP.prototype.initUI = function() {
    var unitCount = this._valueDisplayedText.length;
    for (var i = 0; i < unitCount; ++i) {
      this.addPickerUnit(i);
    }
    // cache the size of picker
    this._pickerUnits = this.element.children;
    this._pickerUnitsHeight = this._pickerUnits[0].clientHeight;
    this._pickerHeight = this.element.clientHeight;
    this._space = this._pickerHeight / this._range;

    // restrict the 'top' attribute of picker between topBouncingBound and
    // bottomBouncingBound.
    this._topBound = -((this._pickerUnits.length - 1) *
                         this._pickerUnitsHeight);
    this._bottomBound = 0;
    this._topBouncingBound = this._topBound - OVER_SCROLL;
    this._bottomBouncingBound = this._bottomBound + OVER_SCROLL;
  };

  VP.prototype.align = function() {
    // make sure the Picker aligns to correct position.
    var pickerTop = -(this._pickerUnitsHeight * this._currentIndex);
    this.element.style.top = pickerTop + 'px';
  };

  VP.prototype.addPickerUnit = function(index) {
    var html = this._valueDisplayedText[index];
    var unit = document.createElement('div');
    unit.className = this._unitClassName;
    unit.innerHTML = html;
    this.element.appendChild(unit);
  };

  VP.prototype.updateUI = function(index, ignorePicker) {
    // set current Index as Active
    var actives = this.element.querySelectorAll('.active');
    for (var i = 0; i < actives.length; i++) {
      actives[i].classList.remove('active');
    }
    this._pickerUnits[this._currentIndex].classList.add('active');
  };

  VP.prototype.addEventListeners = function() {
    this.element.addEventListener('mousedown', this.mousedownHandler, false);
  };

  VP.prototype.removeEventListeners = function() {
    this.element.removeEventListener('mouseup', this.mouseupHandler, false);
    this.element.removeEventListener('mousemove', this.mousemoveHandler, false);
  };

  var lastEvent, currentEvent, startEvent, currentSpeed;
  var currentindex = 0;
  var startTop = 0;

  function cloneEvent(evt) {
    if ('touches' in evt) {
      evt = evt.touches[0];
    }
    return { x: evt.pageX, y: evt.pageY,
             timestamp: MouseEventShim.getEventTimestamp(evt) };
  }

  function toFixed(value) {
    return parseFloat(value.toFixed(1));
  }

  function calcSpeed() {
    var movingSpace = currentEvent.y - lastEvent.y;
    var deltaTime = currentEvent.timestamp - lastEvent.timestamp;
    var speed = movingSpace / deltaTime;
    currentSpeed = parseFloat(speed.toFixed(2));
  }

  function vp_transitionend() {
    this.element.classList.remove('animation-on');
    this.element.removeEventListener('transitionend',
                                     this.transitionendHandler);
  }

  function vp_mousemove(event) {
    event.stopPropagation();
    lastEvent = currentEvent;
    currentEvent = cloneEvent(event);
    calcSpeed();

    // update 'top' of picker
    var delta = currentEvent.y - startEvent.y;
    var newTop = (parseFloat(startTop) + delta);
    newTop = Math.min(this._bottomBouncingBound, newTop);
    newTop = Math.max(newTop, this._topBouncingBound);
    this.element.style.top = newTop + 'px';
    // update Active state of selected unit, it does not care bouncing effect.
    newTop = Math.min(this._bottomBound, newTop);
    newTop = Math.max(newTop, this._topBound);
    var index = Math.round(Math.abs(newTop / this._space));
    this.updateCurrentIndex(index, true);
  }

  function vp_mouseup(event) {
    event.stopPropagation();
    this.removeEventListeners();

    // Add animation back
    this.element.addEventListener('transitionend', this.transitionendHandler);
    this.element.classList.add('animation-on');

    // Add momentum if speed is higher than a given threshold.
    if (Math.abs(currentSpeed) > SPEED_THRESHOLD) {
      var offset = -(Math.round(currentSpeed * 5));
      this.updateCurrentIndex(offset + this.getSelectedIndex());
    }
    this.align();
    currentSpeed = 0;
  }

  function vp_mousedown(event) {
    event.stopPropagation();
    event.target.setCapture(true);
    MouseEventShim.setCapture();

    // Stop animation
    this.element.classList.remove('animation-on');

    startTop = this.element.style.top;
    lastEvent = startEvent = currentEvent = cloneEvent(event);

    this.removeEventListeners();
    this.element.addEventListener('mousemove', this.mousemoveHandler, false);
    this.element.addEventListener('mouseup', this.mouseupHandler, false);
  }

  return VP;
}());

