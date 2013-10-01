var Clock = require('./clock');

function Alarm() {
  Clock.apply(this, arguments);
}

module.exports = Alarm;

Alarm.prototype = Object.create(Clock.prototype);

// Amount of time to wait for Alarm creation banner to be hidden
Alarm.bannerTimeout = 5 * 1000;

// Ensure that the 'Countdown banner' element is eventually hidden.
Alarm.prototype.waitForBanner = function() {
   this.client.waitFor(function() {
     return !this.els.countdownBanner.displayed();
   }.bind(this), {
     timeout: Clock.bannerTimeout
   });
};

Alarm.prototype.submit = function() {
  this.els.alarmDoneBtn.tap();
  this._waitForSlideEnd(this.els.alarmForm);
};

// Open the alarm form for the given alarm item. If unspecified, open the
// "Create Alarm" form.
Alarm.prototype.openForm = function(alarmItem) {
  var openButton = alarmItem || this.els.alarmFormBtn;

  openButton.tap();
  this._waitForSlideEnd(this.els.alarmForm);
};
