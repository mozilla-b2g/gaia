/* exported TimeManager */
'use strict';

var TimeManager = {
  name: 'datetime',

  elementIDs: [
    'tz-region',
    'tz-city',
    'date-configuration',
    'time-configuration'
  ],

  init: function tm_init() {
    if (window.navigator.mozTime) {
      this.time = window.navigator.mozTime;
    } else {
      console.log('There is no mozTime available in window');
    }

    this.elementIDs.forEach(function(elementID) {
      document.getElementById(elementID + '-button').addEventListener('click',
        function(evt) {
          evt.preventDefault();
          var input = document.getElementById(elementID);
          // Inspired by app/clock/js/form_button.js
          // It seems like setting focus instantly does not trigger the input/
          // select dialog.
          setTimeout(input.focus.bind(input), 10);
        });
    });
    var readyEvent = new CustomEvent('panelready', { detail: this });
    window.dispatchEvent(readyEvent);
  },

  set: function tm_set(date) {
    this.time.set(date);
  }
};
