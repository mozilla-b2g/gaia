'use strict';

var TimeManager = {
  init: function tm_init() {
    if (window.navigator.mozTime) {
      this.mozTime = window.navigator.mozTime;
    } else {
      console.log('There is no mozTime available in window');
    }
  },
  set: function tm_set(date) {
    this.mozTime.set(date);
  },
  getTimeZone: function tm_getTZ(gmt) {
    var gmt = parseInt(gmt);
    switch (gmt) {
      case -8:
        return 'GMT-08:00';
        break;
      case -7:
        return 'GMT-07:00';
        break;
      case -6:
        return 'GMT-06:00';
        break;
      case -5:
        return 'GMT-05:00';
        break;
      case -4:
        return 'GMT-04:00';
        break;
      case -3:
        return 'GMT-03:00';
        break;
      case -2:
        return 'GMT-02:00';
        break;
      case -1:
        return 'GMT-01:00';
        break;
      case 0:
        return 'GMT+00:00 London, Dublin, Casablanca';
        break;
      case 1:
        return 'GMT+01:00 Madrid, Paris, Berlin, Stockholm';
        break;
      case 2:
        return 'GMT+02:00';
        break;
      case 3:
        return 'GMT+03:00';
        break;
      case 4:
        return 'GMT+04:00';
        break;
      case 5:
        return 'GMT+05:00';
        break;
      case 6:
        return 'GMT+06:00';
        break;
      case 7:
        return 'GMT+07:00';
        break;
      case 8:
        return 'GMT+08:00';
        break;
      case 9:
        return 'GMT+09:00';
        break;
      case 10:
        return 'GMT+10:00';
        break;
      case 11:
        return 'GMT+11:00';
        break;
      case 12:
        return 'GMT+12:00';
        break;
    }
    // TODO Include TIMEZONE management once it will be available in platform

  }

};
