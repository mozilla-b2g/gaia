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

  get allDayCheckbox() {
    return this.findElement('input[name="allday"]');
  },

  get allDay() {
    // checked is a boolean attribute, should return "null" when not checked
    return this.allDayCheckbox.getAttribute('checked') != null;
  },

  set allDay(value) {
    if (value !== this.allDay) {
      // click needs to happen on label!
      this.client.helper.closest(this.allDayCheckbox, 'label').click();
    }
  },

  set reminders(values) {
    if (!values || !values.length) {
      values = ['None'];
    }
    values.forEach(this.setReminderValue, this);
  },

  setReminderValue: function(value, index) {
    // maximum amount of reminders is 5
    var nth = Math.min(index, 4) + 1;
    // we are using this complex selector, instead of querying for all the
    // available <select> elements, because client.helper.tapSelectOption
    // will wait for element to be displayed before trying to click on it; that
    // way we avoid potential race conditions
    var el = this.findElement('.alarms > *:nth-child(' + nth + ') select');
    this.client.helper.tapSelectOption(el, value);
  },

  get reminders() {
    return this.findElements('[name="alarm[]"]').map(function(select) {
      return select.scriptWith(function(el) {
        return el.options[el.options.selectedIndex].textContent.trim();
      });
    });
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

  get saveButton() {
    return this.findElement('.save');
  },

  save: function() {
    this.saveButton.click();
  }
};
