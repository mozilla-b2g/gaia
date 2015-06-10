/* globals BaseModule, MozActivity */

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
