/* globals BaseModule, MozActivity, Service */

'use strict';

(function(exports) {
  var CameraTrigger = function() {};

  CameraTrigger.EVENTS = [
    'holdcamera'
  ];

  BaseModule.create(CameraTrigger, {
    name: 'CameraTrigger',
    DEBUG: false,
    TRACE: false,

    _handle_holdcamera: function(event) {
      // Avoid triggering the Camera app multiple times if the lockscreen is
      // locked
      if (Service.query('locked')) {
        return;
      }

      this.debug('Received holdcamera');
      /* jshint unused:false */
      var activity = new MozActivity({
        name: 'record',
        data: {
          type: 'photos'
        }
      });
    }

  });
}());
