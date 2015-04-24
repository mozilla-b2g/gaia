define(function(require, exports, module) {
'use strict';

var Overlap = require('utils/overlap');
var buildElement = require('utils/dom').buildElement;
var dayObserver = require('day_observer');
var isSameDate = require('calc').isSameDate;
var localeFormat = require('date_format').localeFormat;
var relativeDuration = require('calc').relativeDuration;
var relativeOffset = require('calc').relativeOffset;
var spanOfDay = require('calc').spanOfDay;
var template = require('templates/multi_day');
var timeLabel = require('calc').getTimeL10nLabel;

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
    this.day = buildElement(template.day.render({
      date: this.date
    }));
    this.allday = buildElement(template.allday.render({
      date: this.date,
      id: this._instanceID
    }));
    this._dayName = this.allday.querySelector('.md__day-name');
    this._alldayEvents = this.allday.querySelector('.md__allday-events');

    this._updateDayName();

    this.onactive();
  },

  _updateDayName: function() {
    // we can't use [data-l10n-date-format] because format might change based
    // on locale
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

    var {busytime} = record;
    var {startDate, endDate} = busytime;

    // we don't set the height on the template because we use the same markup
    // for all day events as well
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
    var {title, location, alarms} = record.event.remote;
    var {startDate, endDate, _id} = record.busytime;

    // screen reader should be aware if the event spans multiple dates and also
    // know the event duration without having the open it
    var _ = navigator.mozL10n.get;
    var labelFormat = isSameDate(startDate, endDate) ? this._oneDayLabelFormat :
      'event-multiple-day-duration';
    var labelFormatArgs = JSON.stringify({
      startDate: localeFormat(startDate, _('longDateFormat')),
      startTime: localeFormat(startDate, _(timeLabel('shortTimeFormat'))),
      endDate: localeFormat(endDate, _('longDateFormat')),
      endTime: localeFormat(endDate, _(timeLabel('shortTimeFormat')))
    });

    return buildElement(template.event.render({
      id: _id,
      instance: this._instanceID,
      title: title,
      location: location,
      hasAlarms: alarms && alarms.length,
      color: record.color,
      labelFormat: labelFormat,
      labelFormatArgs: labelFormatArgs
    }));
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
