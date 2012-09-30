/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SimPinUnLock = {
  activity: null,
  init: function spl_init() {
    var self = this;
    window.navigator.mozSetMessageHandler('activity',
      function spl_activityHandler(activityReq) {
        self.activity = activityReq;
        SimPinDialog.show('unlock',
          function() {
            self.activity.postResult({unlock: true});
          },
          function() {
            self.activity.postResult({unlock: false});
          }
        );
      }
    );
  }

};

SimPinUnLock.init();
