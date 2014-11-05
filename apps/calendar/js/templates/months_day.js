define(function(require, exports, module) {
'use strict';

var DateSpan = require('./date_span');
var create = require('template').create;

var MonthsDay = create({
  event: function() {
    var calendarId = this.h('calendarId');
    var busytimeId = this.h('busytimeId');

    var eventTime = (function() {
      if (this.arg('isAllDay')) {
        return '<div class="all-day" data-l10n-id="hour-allday"></div>';
      }
      var startTime = formatTime(this.arg('startTime'));
      var endTime = formatTime(this.arg('endTime'));
      return `<div class="start-time">${startTime}</div>
              <div class="end-time">${endTime}</div>`;
    }.call(this));

    var eventDetails = (function() {
      var title = this.h('title');
      var result = `<h5 role="presentation">${title}</h5>`;
      var location = this.h('location');
      if (location && location.length > 0) {
        result += `<span class="details">
          <span class="location">${location}</span>
        </span>`;
      }
      return result;
    }.call(this));

    var alarmClass = this.arg('hasAlarms') ? 'has-alarms' : '';

    return `<a href="/event/show/${busytimeId}/"
      class="event calendar-id-${calendarId} ${alarmClass}"
      role="option" aria-describedby="${busytimeId}-icon-calendar-alarm">
      <div class="container">
        <div class="gaia-icon icon-calendar-dot calendar-text-color"
          aria-hidden="true"></div>
        <div class="event-time">${eventTime}</div>
        <div class="event-details">${eventDetails}</div>
        <div id="${busytimeId}-icon-calendar-alarm" aria-hidden="true"
          class="gaia-icon icon-calendar-alarm calendar-text-color"
          data-l10n-id="icon-calendar-alarm"></div>
      </div>
      </a>`;
  }
});
module.exports = MonthsDay;

function formatTime(time) {
  return DateSpan.time.render({
    time: time,
    format: 'shortTimeFormat'
  });
}

});
