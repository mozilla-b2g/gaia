var utils = require('./utils');

function Clock(client) {
  this.client = client;

  this.els = utils.deepMap(Clock.selectors, function(key, value) {
    var getOne = function() {
      return client.findElement(value);
    };
    var getMany = function() {
      return client.findElements(value);
    };
    Object.defineProperty(this, key, {
      get: /S$/.test(key) ? getMany : getOne
    });
  });
}

module.exports = Clock;

Clock.ORIGIN = 'app://clock.gaiamobile.org';

// Amount of time to wait for Alarm creation banner to be hidden
Clock.bannerTimeout = 5 * 1000;

// Create a Date object whose value is the supplied number of milliseconds from
// the current system time.
Clock.fromNow = function(ms) {
  ms = ms || 0;
  return new Date(Date.now() + ms);
};

// Heads up! Magic here: key names that end with a capital S will be used to
// select element collections and will therefor return an array.
Clock.selectors = {
  tabs: {
    alarm: '#alarm-tab a',
    timer: '#timer-tab a',
    stopwatch: '#stopwatch-tab a'
  },
  panels: {
    alarm: '#alarm-panel',
    timer: '#timer-panel',
    stopwatch: '#stopwatch-panel'
  },
  analogClock: '#analog-clock',
  digitalClock: '#digital-clock',
  alarmFormBtn: '#alarm-new',
  alarmForm: '#alarm-edit-panel',
  alarmFormCloseBtn: '#alarm-close',
  alarmDoneBtn: '#alarm-done',
  alarmNameInput: '#edit-alarm [name="alarm.label"]',
  timeInput: '#time-select',
  alarmList: '#alarms',
  alarmListItemS: '.alarm-cell',
  countdownBanner: '#banner-countdown'
};

Clock.prototype.launch = function() {
  this.client.apps.launch(Clock.ORIGIN);
  this.client.apps.switchToApp(Clock.ORIGIN);

  this.client.waitFor(this.ready.bind(this));
};

Clock.prototype.ready = function() {
  return this.els.analogClock.displayed() || this.els.digitalClock.display();
};

Clock.prototype.navigate = function(panelName) {
  var button, panel;
  if (panelName === 'alarmForm') {
    button = this.els.alarmFormBtn;
    panel = this.els.alarmForm;
  } else {
    button = this.els.tabs[panelName];
    panel = this.els.panels[panelName];
  }

  button.tap();
  this._waitForSlideEnd(panel);
};

Clock.prototype.submitAlarm = function() {
  this.els.alarmDoneBtn.tap();
  this._waitForSlideEnd(this.els.alarmForm);
};

// Open the alarm form for the given alarm item. If unspecified, open the
// "Create Alarm" form.
Clock.prototype.openAlarmForm = function(alarmItem) {
  var openButton = alarmItem || this.els.alarmFormBtn;

  openButton.tap();
  this._waitForSlideEnd(this.els.alarmForm);
};

// Ensure that the 'Countdown banner' element is eventually hidden.
Clock.prototype.waitForBanner = function() {
   this.client.waitFor(function() {
     return !this.els.countdownBanner.displayed();
   }.bind(this), {
     timeout: Clock.bannerTimeout
   });
};

Clock.prototype._waitForSlideEnd = function(element) {
  this.client.waitFor(function() {
    return element.scriptWith(function(element) {
      return !!element.className.match(/\bslide-(in|out)-(right|left)\b/);
    });
  });

  this.client.waitFor(function() {
    return element.scriptWith(function(element) {
      return !element.className.match(/\bslide-(in|out)-(right|left)\b/);
    });
  });
};
