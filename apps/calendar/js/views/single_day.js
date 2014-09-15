Calendar.ns('Views').SingleDay = (function() {
'use strict';

var dayObserver = Calendar.dayObserver;
var isAllDay = Calendar.Calc.isAllDay;
var relativeDuration = Calendar.Calc.relativeDuration;
var relativeOffset = Calendar.Calc.relativeOffset;

function SingleDay(config) {
  this.date = config.date;
  this._hourHeight = config.hourHeight;
  this._daysHolder = config.daysHolder;
  this._alldaysHolder = config.alldaysHolder;
  this._render = this._render.bind(this);
  this.overlaps = new Calendar.Utils.Overlap();
}

SingleDay.prototype = {

  _isActive: false,
  _borderWidth: 0.1,
  _attached: false,

  setup: function() {
    this.day = document.createElement('div');
    this.day.className = 'day';
    this.day.dataset.date = this.date;

    this.allday = document.createElement('div');
    this.allday.className = 'allday';
    this.allday.dataset.date = this.date;

    this._dayName = document.createElement('h1');
    this._dayName.className = 'day-name';
    this.allday.appendChild(this._dayName);

    this._alldayEvents = document.createElement('div');
    this._alldayEvents.className = 'allday-events';
    this.allday.appendChild(this._alldayEvents);

    this._updateDayName();

    this.onactive();
  },

  _updateDayName: function() {
    // we can't use [data-l10n-date-format] because format might change
    var format = window.navigator.mozL10n.get('week-day');
    this._dayName.textContent = Calendar.App.dateFormat.localeFormat(
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
    // we always remove all elements and then again since it's simpler and we
    // should not have that many busytimes on a single day.
    this.overlaps.reset();
    this.day.innerHTML = '';
    this._alldayEvents.innerHTML = '';
    records.forEach(this._renderRecord, this);
  },

  _renderRecord: function(record) {
    var {startDate, endDate} = record.busytime;
    if (isAllDay(startDate, endDate)) {
      this._renderAlldayEvent(record);
    } else {
      this._renderEvent(record);
    }
  },

  _renderEvent: function(record) {
    var el = this._buildEventElement(record);

    var busytime = record.busytime;
    var {startDate, endDate} = busytime;
    var duration = relativeDuration(this.date, startDate, endDate);
    // we subtract border to keep a margin between consecutive events
    var hei = duration * this._hourHeight - this._borderWidth;
    el.style.height = hei + 'px';

    if (duration < 1) {
      el.classList.add('partial-hour');
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
        el.classList.add('partial-hour-' + size);
      }
    }

    var offset = relativeOffset(this.date, startDate);
    el.style.top = (offset * this._hourHeight) + 'px';

    this.overlaps.add(busytime, el);
    this.day.appendChild(el);
  },

  _buildEventElement: function(record) {
    var {event, busytime} = record;
    var {remote} = event;

    var el = document.createElement('a');
    el.href = '/event/show/' + busytime._id;
    el.className = [
      'event',
      'calendar-id-' + event.calendarId,
      'calendar-border-color',
      'calendar-bg-color'
    ].join(' ');

    var title = document.createElement('span');
    title.className = 'event-title';
    // since we use "textContent" there is no risk of XSS
    title.textContent = remote.title;
    el.appendChild(title);

    if (remote.location) {
      var location = document.createElement('span');
      location.className = 'event-location';
      // since we use "textContent" there is no risk of XSS
      location.textContent = remote.location;
      el.appendChild(location);
    }

    if (remote.alarms && remote.alarms.length) {
      var icon = document.createElement('i');
      icon.className = 'gaia-icon icon-calendar-alarm calendar-text-color';
      el.appendChild(icon);
      el.classList.add('has-alarms');
    }

    return el;
  },

  _renderAlldayEvent: function(record) {
    var el = this._buildEventElement(record);
    el.classList.add('is-allday');
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
  }

};

return SingleDay;

}());
