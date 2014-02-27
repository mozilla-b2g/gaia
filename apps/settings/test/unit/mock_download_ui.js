
'use strict';

/* exported MockDownloadUI */
var MockDownloadUI = {

  show: function() {
    return {
      set onconfirm(cb) {cb();},
      get onconfirm() {return;}
    };
  },

  showActions: function() {
    return {
      set onconfirm(cb) {cb();},
      get onconfirm() {return;},
      get result() {
        return {
          name: 'open'
        };
      },
      set result(value) {}
    };
  },

  TYPE: {
    STOP: 'stop',
    STOPPED: 'stopped'
  }

};
