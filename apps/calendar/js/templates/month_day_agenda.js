define(function(require, exports, module) {
'use strict';

var DateSpan = require('./date_span');
var create = require('template').create;

var MonthDayAgenda = create({
  event: function() {
    var busytimeId = this.h('busytimeId');
    var color = this.h('color');

    var eventTime;
    if (this.arg('isAllDay')) {
      eventTime = '<div class="all-day" data-l10n-id="hour-allday"></div>';
    } else {
      var startTime = formatTime(this.arg('startTime'));
      var endTime = formatTime(this.arg('endTime'));
      eventTime = `<div class="start-time">${startTime}</div>
        <div class="end-time">${endTime}</div>`;
    }

    var title = this.h('title');
    var eventDetails = `<h5 role="presentation">${title}</h5>`;
    var location = this.h('location');
    if (location && location.length > 0) {
      eventDetails += `<span class="details">
        <span class="location">${location}</span>
      </span>`;
    }

    var alarmClass = this.arg('hasAlarms') ? 'has-alarms' : '';

    return `<a href="/event/show/${busytimeId}/" class="event ${alarmClass}"
      role="option" aria-describedby="${busytimeId}-icon-calendar-alarm">
      <div class="container">
      <div class="gaia-icon icon-calendar-dot" style="color:${color}"
          aria-hidden="true"></div>
        <div class="event-time">${eventTime}</div>
        <div class="event-details" dir="auto">${eventDetails}</div>
        <div id="${busytimeId}-icon-calendar-alarm" aria-hidden="true"
          class="gaia-icon icon-calendar-alarm" style="color:${color}"
          data-l10n-id="icon-calendar-alarm"></div>
      </div>
      </a>`;
  }
});
module.exports = MonthDayAgenda;

function formatTime(time) {
  return DateSpan.time.render({
    time: time,
    format: 'shortTimeFormat'
  });
}

});
