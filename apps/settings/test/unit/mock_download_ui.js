
'use strict';

/* exported MockDownloadUI */
var MockDownloadUI = {

  show: function() {
    return {
      set onconfirm(cb) {cb();},
      get onconfirm() {return;}
    };
  },

  TYPE: {
    STOP: 'stop',
    STOPPED: 'stopped'
  }

};
