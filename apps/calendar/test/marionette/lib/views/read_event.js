'use strict';

var View = require('./view');

function ReadEvent() {
  View.apply(this, arguments);
}
module.exports = ReadEvent;

ReadEvent.prototype = {
  __proto__: View.prototype,

  selector: '#event-view',

  get alarms() {
    return this
      .findElements('.alarms > .content > div')
      .map(function(element) {
        return element.text();
      });
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

  get endDate() {
    return this
      .findElement('.end-date > .content')
      .text();
  },

  get endTime() {
    return this
      .findElement('.end-date > .end-time > .content')
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

  get startDate() {
    return this
      .findElement('.start-date > .content')
      .text();
  },

  get startTime() {
    return this
      .findElement('.start-date > .start-time > .content')
      .text();
  },

  get title() {
    return this
      .findElement('.title .content')
      .text();
  },

  get titleContainer() {
    return this.findElement('.title');
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
