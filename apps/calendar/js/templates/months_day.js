define(function(require, exports, module) {
'use strict';

var DateSpan = require('./date_span');
var create = require('template').create;

var MonthsDay = create({
  event: function() {
    var calendarId = this.h('calendarId');

    var sectionClassList = [
      'event',
      'calendar-id-' + calendarId,
      this.h('classes')
    ].join(' ');

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
      var result = '<h5>' + this.h('title') + '</h5>';
      var location = this.h('location');
      if (location && location.length > 0) {
        result += `<span class="details">
          <span class="location">${location}</span>
        </span>`;
      }
      return result;
    }.call(this));

    var busytimeId = this.h('busytimeId');

    return `<section class="${sectionClassList}" data-id="${busytimeId}">
      <div class="container calendar-id-${calendarId}">
        <div class="gaia-icon icon-calendar-dot calendar-text-color"></div>
        <div class="event-time">${eventTime}</div>
        <div class="event-details">${eventDetails}</div>
        <div class="gaia-icon icon-calendar-alarm calendar-text-color"></div>
      </div>
      </section>`;
  }
});
module.exports = MonthsDay;

function formatTime(time) {
  return DateSpan.time.render({
    time: time,
    format: 'shortTimeFormat'
  });
}

MonthsDay.eventSelector = '.event';
MonthsDay.hourEventsSelector = '.events';

});
