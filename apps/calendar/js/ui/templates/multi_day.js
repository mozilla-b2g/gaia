define(function(require, exports, module) {
'use strict';

var DateSpan = require('./date_span');
var colorUtils = require('utils/color');
var create = require('template').create;

var multiday = {};

multiday.hour = function() {
  var hour = this.arg('hour');

  var html = DateSpan.hour.render({
    hour: hour,
    format: this.arg('format'),
    addAmPmClass: this.arg('addAmPmClass'),
    className: 'md__display-hour'
  });

  // we use this temporary element just to grab the textContent
  var tmp = document.createElement('div');
  tmp.innerHTML = html;
  var text = tmp.textContent;

  return `<li aria-label="${text}" class="md__hour md__hour-${hour}">
    ${html}
  </li>`;
};

multiday.day = function() {
  return `<div class="md__day" data-date="${this.h('date')}"></div>`;
};

multiday.allday = function() {
  return `<div class="md__allday" data-date="${this.h('date')}">
    <h1 class="md__day-name" aria-level="2"
      id="md__day-name-${this.h('id')}"></h1>
    <div class="md__allday-events"></div>
  </div>`;
};

multiday.event = function() {
  var labels = [];
  var id = this.h('id');
  var instance = this.h('instance');
  var color = this.h('color');
  var bgColor = colorUtils.hexToBackground(color);

  var titleId = `md__event-${id}-title-${instance}`;
  labels.push(titleId);

  var location = this.h('location');
  var locationHtml = '';
  if (location) {
    var locationId = `md__event-${id}-location-${instance}`;
    labels.push(locationId);
    locationHtml = `<bdi class="md__event-location" id="${locationId}">
      ${location}
    </bdi>`;
  }

  var alarmIcon = '';
  if (this.arg('hasAlarms')) {
    var iconId = `md__event-${id}-icon-${instance}`;
    labels.push(iconId);
    alarmIcon = `<i class="gaia-icon icon-calendar-alarm"
      style="color: ${color}" aria-hidden="true" id="${iconId}"
      data-l10n-id="icon-calendar-alarm">
    </i>`;
  }

  var className = ['md__event'];
  if (alarmIcon) {
    className.push('has-alarms');
  }

  var descriptionId = `md__event-${id}-description-${instance}`;
  labels.push(descriptionId);

  return `<a href="/event/show/${id}"
    class="${className.join(' ')}"
    style="border-color: ${color}; background-color: ${bgColor}"
    aria-labelledby="${labels.join(' ')}">
    <bdi class="md__event-title" id="${titleId}">${this.h('title')}</bdi>
    ${locationHtml}
    ${alarmIcon}
    <span id="${descriptionId}" aria-hidden="true"
      data-l10n-id="${this.h('labelFormat')}"
      data-l10n-args="${this.h('labelFormatArgs')}">
    </span>
  </a>`;
};

module.exports = create(multiday);

});
