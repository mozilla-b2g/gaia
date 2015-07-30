/* exported MockActivityHandler */
'use strict';

var MockActivityHandler = {
  currentlyHandling: false,
  activityName: 'view',
  currentActivityIs: function(list) {
    return this.currentlyHandling && list.indexOf(this.activityName) !== -1;
  },
  currentActivityIsNot: function(list) {
    return this.currentlyHandling && list.indexOf(this.activityName) === -1;
  },
  postPickSuccess: function(data) {},
  postCancel: function() {},
  dataPickHandler: function() {},
  isCancelable: function() {
    return {
      then: function(cb) {
        cb();
      }
    };
  }
};
