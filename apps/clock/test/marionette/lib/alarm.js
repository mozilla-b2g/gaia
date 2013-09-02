var Clock = require('./clock');

function Alarm() {
  Clock.apply(this, arguments);
}

module.exports = Alarm;

Alarm.prototype = Object.create(Clock.prototype);

// Amount of time to wait for Alarm creation banner to be hidden
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
Alarm.prototype.waitForBannerHidden = function() {
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

Alarm.prototype.toggleAlarm = function(alarmIdx) {
  var check = this.isEnabled.bind(this, alarmIdx);
  var wasEnabled = check();
  var alarm = this.els.alarm.enabler[alarmIdx];
  alarm.tap();

  // Ensure that the toggle has completed before continuing. This prevents
  // code that follows from inspecting elements that the application has yet
  // to re-generate in response to the toggle operation.
  this.client.waitFor(function() {
    var isEnabled;
    // Due to the same race condition this `waitFor` call attempts to avoid,
    // the "enabled" check may fail with a "Stale element reference" error.In
    // these cases, simply re-try the check (since the error indicates that the
    // UI has been successfully updated to reflect the toggle operation)
    try {
      isEnabled = check();
    } catch (err) {
      isEnabled = check();
    }
    return wasEnabled !== isEnabled;
  }.bind(this));
};

Alarm.prototype.isEnabled = function(alarmIdx) {
  var checkbox = this.els.alarm.enabledCheck[alarmIdx];
  return !!checkbox.getAttribute('checked');
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
  dismissForm.call(this, 'doneBtn');
};

Alarm.prototype.formClose = function() {
  dismissForm.call(this, 'closeFormBtn');
};

Alarm.prototype.formDelete = function() {
  dismissForm.call(this, 'deleteBtn');
};

function dismissForm(btnName) {
  this.el.alarm[btnName].tap();
  this.waitForSlideEnd(this.el.alarm.form);
}
