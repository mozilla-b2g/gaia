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
  }
};

