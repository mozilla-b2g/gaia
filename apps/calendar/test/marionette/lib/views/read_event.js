'use strict';

var View = require('./view');

function ReadEvent() {
  View.apply(this, arguments);
}
module.exports = ReadEvent;

ReadEvent.prototype = {
  __proto__: View.prototype,

  selector: '#event-view',

  waitForDisplay: function() {
    // event details are loaded asynchronously, so we need to wait until the
    // "loading" class is removed from the view; this will avoid intermittent
    // failures on Travis (caused by race condition)
    var element = this.getElement();
    this.client.waitFor(function(){
      return element.displayed() &&
        element.getAttribute('className').indexOf('loading') === -1;
    });
  },

  get alarms() {
    return this
      .findElements('.alarms > .content > div')
      .map(function(element) {
        return element.text();
      });
  },

  get calendarColor() {
    return this
      .findElement('.current-calendar > .icon-calendar-dot')
      .cssProperty('color');
  },

  get calendar() {
    return this
      .findElement('.current-calendar > .content')
      .text();
  },

  get description() {
    return this
      .findElement('.description > .content')
      .text();
  },

  get descriptionContainer() {
    return this.findElement('.description');
  },

  get durationTime() {
    return this
      .findElement('.duration-time > .content')
      .text();
  },

  get location() {
    return this
      .findElement('.location > .content')
      .text();
  },

  get locationContainer() {
    return this.findElement('.location');
  },

  get reminders() {
    return this.findElements('.alarms > .content > div');
  },

  get title() {
    return this
      .findElement('.title .content')
      .text();
  },

  get titleContainer() {
    return this.findElement('.title');
  },

  get editable() {
    return this
      .findElement('.edit')
      .enabled();
  },

  cancel: function() {
    return this
      .findElement('.cancel')
      .click();
  },

  edit: function() {
    return this
      .findElement('.edit')
      .click();
  }
};
