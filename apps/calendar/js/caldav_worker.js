'use strict';

importScripts('./ext/alameda.js?time=' + Date.now());

/*globals require */
require([
 'calendar',
 'responder',
 'inspect',
 'presets',
 'worker/thread',
 'ext/ical',
 'ext/caldav',
 'ext/uuid',
 'service/ical_recur_expansion',
 'service/caldav'
], function() {
  var thread = new Calendar.Thread(window);
  window.console = new thread.console('caldav worker');

  thread.addRole('caldav');

  /*jshint unused:false */
  /*exported caldav */
  var caldav = new Calendar.Service.Caldav(
    thread.roles.caldav
  );
});

