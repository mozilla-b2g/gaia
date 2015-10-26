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
    var activity = new MozActivity({
      name: 'open',
      data: {
        type:     'audio/ogg',
        filename: 'test_media/samples/Music/treasure_island_01-02_stevenson.ogg'
      }
    });

    activity.onerror = function(e) {
      console.warn('open activity error:', activity.error.name);
    };

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
