define(function(require, exports, module) {
'use strict';

var Overlap = require('utils/overlap');
var localeFormat = require('date_format').localeFormat;
var colorUtils = require('utils/color');
var dayObserver = require('day_observer');
var relativeDuration = require('calc').relativeDuration;
var relativeOffset = require('calc').relativeOffset;
var getTimeL10nLabel = require('calc').getTimeL10nLabel;
var isSameDate = require('calc').isSameDate;
var spanOfDay = require('calc').spanOfDay;

var _id = 0;

function SingleDay(config) {
  this.date = config.date;
  this._hourHeight = config.hourHeight;
  this._daysHolder = config.daysHolder;
  this._allDayIcon = config.allDayIcon;
  this._alldaysHolder = config.alldaysHolder;
  this._oneDayLabelFormat = config.oneDayLabelFormat;
  this._render = this._render.bind(this);
  this._instanceID = _id++;
  this.overlaps = new Overlap();
}
module.exports = SingleDay;

SingleDay.prototype = {
  _isActive: false,
  _borderWidth: 0.1,
  _attached: false,

  setup: function() {
    this.day = document.createElement('div');
    this.day.className = 'md__day';
    this.day.dataset.date = this.date;

    this.allday = document.createElement('div');
    this.allday.className = 'md__allday';
    this.allday.dataset.date = this.date;

    this._dayName = document.createElement('h1');
    this._dayName.className = 'md__day-name';
    this._dayName.setAttribute('aria-level', '2');
    this._dayName.id = 'md__day-name-' + this._instanceID;
    this.allday.appendChild(this._dayName);

    this._alldayEvents = document.createElement('div');
    this._alldayEvents.className = 'md__allday-events';
    this.allday.appendChild(this._alldayEvents);

    this._updateDayName();

    this.onactive();
  },

  _updateDayName: function() {
    // we can't use [data-l10n-date-format] because format might change
    var format = window.navigator.mozL10n.get('week-day');
    this._dayName.textContent = localeFormat(
      this.date,
      format
    );
  },

  handleEvent: function(evt) {
    switch(evt.type) {
      case 'localized':
        this._updateDayName();
        break;
    }
  },

  append: function() {
    this._daysHolder.appendChild(this.day);
    this._alldaysHolder.appendChild(this.allday);
    this._attached = true;
  },

  onactive: function() {
    if (this._isActive) {
      return;
    }
    dayObserver.on(this.date, this._render);
    window.addEventListener('localized', this);
    this._isActive = true;
  },

  _render: function(records) {
    this._alldayEvents.innerHTML = '';
    records.allday.forEach(this._renderAlldayEvent, this);
    this.overlaps.reset();
    this.day.innerHTML = '';
    records.basic.forEach(this._renderEvent, this);
    if (this._alldayEvents.children.length > 0) {
      // If there are all day events, the section acts as a listbox.
      this._alldayEvents.setAttribute('role', 'listbox');
      this._alldayEvents.setAttribute('aria-labelledby', this._allDayIcon.id +
        ' ' + this._dayName.id);
    } else {
      // If there are no all day events, the section acts as a create new all
      // day event button.
      this._alldayEvents.setAttribute('role', 'button');
      this._alldayEvents.setAttribute('data-l10n-id', 'create-all-day-event');
      this._alldayEvents.setAttribute('aria-describedby', this._dayName.id);
    }
  },

  _renderEvent: function(record) {
    var el = this._buildEventElement(record);

    var busytime = record.busytime;
    var {startDate, endDate, _id} = busytime;
    // Screen reader should be aware if the event spans multiple dates.
    var format = isSameDate(startDate, endDate) ? this._oneDayLabelFormat :
      'event-multiple-day-duration';

    var description = document.createElement('span');
    description.id = 'md__event-' + _id + '-description-' + this._instanceID;
    description.setAttribute('aria-hidden', true);
    description.setAttribute('data-l10n-id', format);
    description.setAttribute('data-l10n-args', JSON.stringify({
      startDate: localeFormat(startDate,
        navigator.mozL10n.get('longDateFormat')),
      startTime: localeFormat(startDate, navigator.mozL10n.get(
        getTimeL10nLabel('shortTimeFormat'))),
      endDate: localeFormat(endDate, navigator.mozL10n.get('longDateFormat')),
      endTime: localeFormat(endDate, navigator.mozL10n.get(
        getTimeL10nLabel('shortTimeFormat')))
    }));
    el.setAttribute('aria-labelledby',
      el.getAttribute('aria-labelledby') + ' ' + description.id);
    el.appendChild(description);

    var duration = relativeDuration(this.date, startDate, endDate);
    // we subtract border to keep a margin between consecutive events
    var hei = duration * this._hourHeight - this._borderWidth;
    el.style.height = hei + 'px';

    if (duration < 1) {
      el.classList.add('is-partial');
      var size = '';
      // we need to toggle layout if event lasts less than 20, 30 and 45min
      if (duration < 0.3) {
        size = 'micro';
      } else if (duration < 0.5) {
        size = 'tiny';
      } else if (duration < 0.75) {
        size = 'small';
      }
      if (size) {
        el.classList.add('is-partial-' + size);
      }
    }

    var offset = relativeOffset(this.date, startDate);
    el.style.top = (offset * this._hourHeight) + 'px';

    this.overlaps.add(busytime, el);
    this.day.appendChild(el);
  },

  _buildEventElement: function(record) {
    var {event, busytime, color} = record;
    var {remote} = event;

    var el = document.createElement('a');
    el.href = '/event/show/' + busytime._id;
    el.className = 'md__event';
    el.style.borderColor = color;
    el.style.backgroundColor = colorUtils.hexToBackground(color);

    var labels = [];

    // we use a <bdi> element because content might be bidirectional
    var title = document.createElement('bdi');
    title.className = 'md__event-title';
    title.id = 'md__event-' + busytime._id + '-title-' + this._instanceID;
    labels.push(title.id);
    // since we use "textContent" there is no risk of XSS
    title.textContent = remote.title;
    el.appendChild(title);

    if (remote.location) {
      // we use a <bdi> element because content might be bidirectional
      var location = document.createElement('bdi');
      location.className = 'md__event-location';
      location.id = 'md__event-' + busytime._id + '-location-' +
        this._instanceID;
      labels.push(location.id);
      // since we use "textContent" there is no risk of XSS
      location.textContent = remote.location;
      el.appendChild(location);
    }

    if (remote.alarms && remote.alarms.length) {
      var icon = document.createElement('i');
      icon.className = 'gaia-icon icon-calendar-alarm';
      icon.style.color = color;
      icon.setAttribute('aria-hidden', true);
      icon.id = 'md__event-' + busytime._id + '-icon-' + this._instanceID;
      icon.setAttribute('data-l10n-id', 'icon-calendar-alarm');
      labels.push(icon.id);
      el.appendChild(icon);
      el.classList.add('has-alarms');
    }

    el.setAttribute('aria-labelledby', labels.join(' '));
    return el;
  },

  _renderAlldayEvent: function(record) {
    var el = this._buildEventElement(record);
    el.classList.add('is-allday');
    el.setAttribute('role', 'option');
    this._alldayEvents.appendChild(el);
  },

  destroy: function() {
    this.oninactive();
    this._detach();
  },

  _detach: function() {
    if (this._attached) {
      this._daysHolder.removeChild(this.day);
      this._alldaysHolder.removeChild(this.allday);
      this._attached = false;
    }
  },

  oninactive: function() {
    if (!this._isActive) {
      return;
    }
    dayObserver.off(this.date, this._render);
    window.removeEventListener('localized', this);
    this._isActive = false;
  },

  setVisibleForScreenReader: function(visibleRange) {
    var visible = visibleRange.contains(spanOfDay(this.date));
    this.day.setAttribute('aria-hidden', !visible);
    this.allday.setAttribute('aria-hidden', !visible);
  }
};

});
