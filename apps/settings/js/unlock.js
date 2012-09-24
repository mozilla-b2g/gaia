/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var _ = navigator.mozL10n.get;

var SimPinUnLock = {
  activity: null,
  init: function spl_init() {
    var self = this;
    window.navigator.mozSetMessageHandler('activity',
      function spl_activityHandler(activityReq) {
        self.activity = activityReq;
        console.debug('In settings app to handle SIM PIN lock');
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

window.addEventListener('localized', function showPanel() {
  SimPinUnLock.init();
});

