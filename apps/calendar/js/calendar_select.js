/**
 * @fileoverview <select> with <option>s for each
 *     of the user's calendars for which events can be created.
 *     Obeys the default setting set by the user in advanced settings.
 */
define(function(require, exports, module) {
'use strict';

var Local = require('provider/local');
var Responder = require('responder');
var calendarObserver = require('calendar_observer');
var debug = require('debug')('calendar_select');
var forEach = require('object').forEach;
var settingsObserver = require('settings_observer');

function CalendarSelect(element) {
  Responder.call(this);
  this.element = element;
  this.render = this.render.bind(this);
}
module.exports = CalendarSelect;

CalendarSelect.prototype = {
  __proto__: Responder.prototype,

  init: function() {
    calendarObserver.on('change', this.render);
    settingsObserver.on('defaultCalendar', this.render);
  },

  render: function() {
    debug('Will render calendar <select>!');
    var calendarList = calendarObserver.calendarList;
    var defaultCalendar = settingsObserver.setting.defaultCalendar;
    debug('Default calendar is now', defaultCalendar);

    if (!Object.keys(calendarList).length) {
      return;
    }

    var element = this.element;
    element.innerHTML = '';
    forEach(calendarList, (id, object) => {
      var calendar = object.calendar;
      var capabilities = object.capabilities;
      if (!capabilities.canCreateEvent) {
        return;
      }

      var l10n = navigator.mozL10n;
      var option = document.createElement('option');
      if (id === Local.calendarId) {
        option.text = l10n.get('calendar-local');
        option.setAttribute('data-l10n-id', 'calendar-local');
      } else {
        option.text = calendar.remote.name;
      }

      option.value = id;
      if (defaultCalendar != null) {
        option.selected = (defaultCalendar === id);
      }

      element.add(option);
    });

    this.emit('render');
  }
};

});
