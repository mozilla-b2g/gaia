/* global LockScreenBasicComponent, LockScreenClockWidgetSetup, mozIntl */
'use strict';

/**
 * The Clock widget on LockScreen.
 * Clock widget states:
 * ClockSetup, ClockTick, ClockStop
 **/
(function(exports) {
  var LockScreenClockWidget = function() {
    LockScreenBasicComponent.apply(this);
    this.resources.elements.time = 'lockscreen-clock-time';
    this.resources.elements.date = 'lockscreen-date';
    this.resources.elements.alarm = 'lockscreen-alarm';
    this.resources.elements.alarmtime = 'lockscreen-alarm-time';
    this.timeFormatter = null;
    this.dateFormatter = null;
    this.configs.logger.debug = false;  // turn on this when we're debugging
  };
  LockScreenClockWidget.prototype =
    Object.create(LockScreenBasicComponent.prototype);

  LockScreenClockWidget.prototype.setup = function() {
    return (new LockScreenClockWidgetSetup(this));
  };

  LockScreenClockWidget.prototype.updateFormatters = function() {
    this.dateFormatter = Intl.DateTimeFormat(navigator.languages, {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });

    // we're using mozIntl.DateTimeFormat to remove dayperiod
    this.timeFormatter = mozIntl.DateTimeFormat(navigator.languages, {
      hour12: navigator.mozHour12,
      dayperiod: false,
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  LockScreenClockWidget.prototype.updateClock =
  function() {
    var now = new Date();

    var timeText = this.timeFormatter.format(now);
    var dateText = this.dateFormatter.format(now);

    this.resources.elements.time.textContent = timeText;
    this.resources.elements.date.textContent = dateText;
    this.logger.debug('Clock updated', now);
  };

	LockScreenClockWidget.prototype.updateAlarm =
	function() {
    this.fetchAlarmData()
    .then((alarmData) => {

      // if there is no alarm
      if(!alarmData.hour && !alarmData.minute) {
        this.resources.elements.alarm.classList.add('no-alarms');
        return;
      }

      var type = 'AM',
          hour = parseInt(alarmData.hour, 10);

      // Decide wheter to use AM or PM
      if(hour > 12) {
        type = 'PM';
        hour = hour - 12;
      }

      var fullAlarmTime = hour + ':' + alarmData.minute + type;
      this.resources.elements.alarmtime.textContent = fullAlarmTime;
      this.resources.elements.alarm.classList.remove('no-alarms');
      this.logger.debug('Alarm updated to :', fullAlarmTime);
    }).catch(() => {
      this.resources.elements.alarm.classList.add('no-alarms');
    });
	};

  /*
   * Gets the Alarm Data from the DataStore.
   */
  LockScreenClockWidget.prototype.fetchAlarmData = function() {
    return new Promise((resolve, reject) => {
      navigator.getDataStores('alarms')
      .then((stores) => {

        return stores[0].getLength()
          .then((len) => {

            if(0 === len) {
              return;
            }

            return stores[0].get(1);
          });
      }).then((fetchedData) => {
        resolve(fetchedData.data);
      });
    });
  };

  exports.LockScreenClockWidget = LockScreenClockWidget;
})(window);

