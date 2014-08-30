'use strict';

var View = require('./view');

function EditEvent() {
  View.apply(this, arguments);
}
module.exports = EditEvent;

EditEvent.prototype = {
  __proto__: View.prototype,

  selector: '#modify-event-view',

  waitForDisplay: function() {
    // event details are loaded asynchronously, so we need to wait until the
    // "loading" class is removed from the view; this will avoid intermittent
    // failures on Travis (caused by race condition)
    var element = this.getElement();

    var selectIsReady = function() {
      // the calendar list is also loaded asynchronously from the database, so
      // we need to wait until it's ready as well
      var select = element.findElement('select[name="calendarId"]');
      return select.getAttribute('className').indexOf('loading') === -1;
    };

    this.client.waitFor(function() {
      return element.displayed() &&
        element.getAttribute('className').indexOf('loading') === -1 &&
        selectIsReady();
    });
  },

  get form() {
    return this.findElement('form');
  },

  get errors() {
    return this.form.findElement('.errors').text();
  },

  set title(value) {
    this.setFormValue('title', value);
  },

  set description(value) {
    this.setFormValue('description', value);
  },

  set location(value) {
    this.setFormValue('location', value);
  },

  set calendar(value) {
    var select = this.findElement('select[name="calendarId"]');
    this.client.helper.tapSelectOption(select, value);
  },

  set startDate(value) {
    this.setFormValue('startDate', value);
  },

  get startDate() {
    return this.getFormValue('startDate');
  },

  set startTime(value) {
    this.setFormValue('startTime', value);
  },

  get startTime() {
    return this.getFormValue('startTime');
  },

  get startTimeLocale() {
    return this.findElement('#start-time-locale');
  },

  set endDate(value) {
    this.setFormValue('endDate', value);
  },

  get endDate() {
    return this.getFormValue('endDate');
  },

  get endTimeLocale() {
    return this.findElement('#end-time-locale');
  },

  set endTime(value) {
    this.setFormValue('endTime', value);
  },

  get endTime() {
    return this.getFormValue('endTime');
  },

  set allDay(value) {
    var checkbox = this.findElement('input[name="allday"]');
    var checked = checkbox.getAttribute('checked');
    if (value !== checked) {
      // click needs to happen on label!
      this.client.helper.closest(checkbox, 'label').click();
    }
  },

  set reminders(value) {
    // Every event gets a 5 minute alarm. Since we want to "set" the alarms
    // with the parameter value, first remove the default alarm and then
    // add the parameter ones.
    var select = this.findElement('select[name="alarm[]"]');
    this.client.helper.tapSelectOption(select, 'None');

    value.forEach(function(reminder) {
      var alarmSelect = this.findElement('.alarms > *:last-child');
      this.client.helper.tapSelectOption(alarmSelect, reminder);
    }.bind(this));
  },

  cancel: function() {
    this
      .findElement('.cancel')
      .click();
  },

  delete: function() {
    this
      .findElement('.delete-record')
      .click();
  },

  save: function() {
    this
      .findElement('.save')
      .click();
  }
};
