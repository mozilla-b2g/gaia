'use strict';

var TimeManager = {
  init: function tm_init() {
    if (window.navigator.mozTime) {
      this.time = window.navigator.mozTime;
    } else {
      console.log('There is no mozTime available in window');
    }
  },
  set: function tm_set(date) {
    this.time.set(date);
  },
  // XXX This will be in /shared folder as 'timezones.json' as is described
  // here https://bugzilla.mozilla.org/show_bug.cgi?id=805780
  TZ: {
    '-8': 'GMT-08:00',
    '-7': 'GMT-07:00',
    '-6': 'GMT-06:00',
    '-5': 'GMT-05:00',
    '-4': 'GMT-04:00',
    '-3': 'GMT-03:00',
    '-2': 'GMT-02:00',
    '-1': 'GMT-01:00',
    '0': 'GMT+00:00 London, Dublin, Casablanca',
    '1': 'GMT+01:00 Madrid, Paris, Berlin, Stockholm',
    '2': 'GMT+02:00',
    '3': 'GMT+03:00',
    '4': 'GMT+04:00',
    '5': 'GMT+05:00',
    '6': 'GMT+06:00',
    '7': 'GMT+07:00',
    '8': 'GMT+08:00',
    '9': 'GMT+09:00',
    '10': 'GMT+10:00',
    '11': 'GMT+11:00',
    '12': 'GMT+12:00'
  },

  getTimeZone: function tm_getTZ(gmt) {
    return this.TZ[gmt];
  }

};
