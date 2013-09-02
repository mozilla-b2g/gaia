'use strict';

var Clock = require('./clock');
var clockAssert = require('./assert');

function Alarm() {
  Clock.apply(this, arguments);
}

module.exports = Alarm;

Alarm.prototype = Object.create(Clock.prototype);

// Amount of time (in milliseconds) to wait for Alarm creation banner to be
// hidden
Alarm.bannerTimeout = 5 * 1000;

[
  'analogClock', 'digitalClock', 'countdownBanner'
].forEach(function(name) {
  Object.defineProperty(Alarm.prototype, name + 'Displayed', {
    get: function() {
      return this.el.alarm[name].displayed();
    }
  });
});

// Ensure that the 'Countdown banner' element is eventually hidden.
// This method contains a race condition: if the banner has already been
// displayed *and* hidden before the initial invocation of
// `this.client.waitFor`, this method will time out. This is unfortunately
// unavoidable because it is impossible to differentiate between these two
// application states at the onset of this method:
//
// 1. The banner is not displayed, but it scheduled to be displayed
// 2. The banner is not displayed, and it has already been displayed and hidden
Alarm.prototype.waitForBannerHidden = function() {
   this.client.waitFor(function() {
     return this.el.alarm.countdownBanner.displayed();
   }.bind(this));

   this.client.waitFor(function() {
     return !this.el.alarm.countdownBanner.displayed();
   }.bind(this), {
     timeout: Clock.bannerTimeout
   });
};

Alarm.prototype.readItems = function() {
  return this.els.alarm.listItem.map(function(el) {
    return el.text();
  });
};

Alarm.prototype.toggleClock = function() {
  var target;

  ['analog', 'digital'].forEach(function(clockType) {
    var el = this.el.alarm[clockType + 'Clock'];
    if (el.displayed()) {
      target = el;
    }
  }, this);

  if (!target) {
    throw new Error('Unable to toggle clock face: no clock is displayed.');
  }

  target.tap();
};

/**
 * Insert data into the Alarm form.
 *
 * @param settings {Object} settings - An object literal whose keys describe
 *                                     the name of a "*Input" element in the
 *                                     Alarm's entry in `selectors.json` and
 *                                     whose values describe the corresponding
 *                                     value to enter into the input element.
 */
Alarm.prototype.fill = function(settings) {
  Object.keys(settings).forEach(function(name) {
    var value = settings[name];
    this.client.forms.fill(this.el.alarm[name + 'Input'], value);
  }, this);
};

Alarm.prototype.readForm = function() {
  var vals = {};
  Array.prototype.forEach.call(arguments, function(name) {
    vals[name] = this.el.alarm[name + 'Input'].getAttribute('value');
  }, this);
  return vals;
};

Alarm.prototype.toggleAlarm = function(options) {
  var alarmIdx = options.index;
  var wasEnabled = this.isEnabled({ index: alarmIdx });

  this.safeInteract(
    function() { return this.els.alarm.enabler[alarmIdx]; },
    function(el) { el.tap(); }
  );

  // Ensure that the toggle has completed before continuing. This prevents
  // code that follows from inspecting elements that the application has yet
  // to re-generate in response to the toggle operation.
  this.client.waitFor(function() {
    return wasEnabled !== this.isEnabled({ index: alarmIdx });
  }.bind(this));
};

Alarm.prototype.isEnabled = function(options) {
  var alarmIdx = options.index;
  return this.safeInteract(
    function() { return this.els.alarm.enabledCheck[alarmIdx]; },
    function(checkbox) { return !!checkbox.getAttribute('checked'); }
  );
};

// Open the alarm form for the given alarm item. If unspecified, open the
// "Create Alarm" form.
Alarm.prototype.openForm = function(alarmIdx) {
  var openButton = this.el.alarm.openFormBtn;

  if (arguments.length) {
    openButton = this.els.alarm.listItem[alarmIdx];
  }

  openButton.tap();
  this.waitForSlideEnd(this.el.alarm.form);
};

Alarm.prototype.formSubmit = function() {
  var formVals = this.readForm('name', 'time');
  var timeParts = formVals.time.split(':');
  var formTime = new Date();
  formTime.setHours.apply(formTime, timeParts);

  this.dismissForm('doneBtn');

  // Ensure that an Alarm with the same name and time are present in the DOM
  // before considering the "formSubmit" operation complete.
  this.client.waitFor(function() {
    return this.readItems().some(function(item) {
      var hasName = item.indexOf(formVals.name) > -1;
      var hasTime = false;
      try {
        clockAssert.hasTime(item, formTime);
        hasTime = true;
      } catch (err) {}
      return hasName && hasTime;
    });
  }.bind(this));
};

Alarm.prototype.formClose = function() {
  this.dismissForm('closeFormBtn');
};

Alarm.prototype.formDelete = function() {
  var withDeleted = this.readItems().length;
  this.dismissForm('deleteBtn');

  // Ensure that the number of alarms has decreased before considering the
  // "formDelete" operation complete.
  this.client.waitFor(function() {
    return withDeleted > this.readItems().length;
  }.bind(this));
};

Alarm.prototype.dismissForm = function(btnName) {
  this.el.alarm[btnName].tap();
  this.waitForSlideEnd(this.el.panels.alarm);
};
