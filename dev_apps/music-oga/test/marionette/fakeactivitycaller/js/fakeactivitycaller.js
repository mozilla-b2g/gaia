/* global MozActivity */
'use strict';

var FakeActivityCaller = {
  init: function() {
    this.openButton = document.getElementById('open');
    this.pickButton = document.getElementById('pick');

    this.openButton.addEventListener('click', this.openActivity);
    this.pickButton.addEventListener('click', this.pickActivity);
  },

  openActivity: function() {
    // NOOP
  },

  pickActivity: function() {
    var activity = new MozActivity({
      name: 'pick',
      data: {
        type: 'audio/*'
      }
    });

    activity.onerror = function(e) {
      console.warn('pick activity error:', activity.error.name);
    };
  }
};

window.addEventListener('DOMContentLoaded', function() {
  FakeActivityCaller.init();
});
