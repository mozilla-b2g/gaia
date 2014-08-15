/* global MozActivity */
'use strict';

var FakeActivityCaller = {
  init: function() {
    this.callActicity();
  },

  callActicity: function() {
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

FakeActivityCaller.init();
