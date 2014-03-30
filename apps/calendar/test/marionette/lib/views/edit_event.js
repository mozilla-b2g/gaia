'use strict';

var View = require('./view');

function EditEvent() {
  View.apply(this, arguments);
}
module.exports = EditEvent;

EditEvent.prototype = {
  __proto__: View.prototype,

  selector: '#modify-event-view',

  get form() {
    return this.findElement('form');
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

  set startDate(value) {
    this.setFormValue('startDate', value);
  },

  set startTime(value) {
    this.setFormValue('startTime', value);
  },

  set endDate(value) {
    this.setFormValue('endDate', value);
  },

  set endTime(value) {
    this.setFormValue('endTime', value);
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
