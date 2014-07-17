'use strict';

importScripts('./ext/alameda.js?time=' + Date.now());

/*globals require */
require([
 'worker/thread',
 'service/caldav'
], function(Thread, Caldav) {
  var thread = new Thread(window);
  window.console = new thread.console('caldav worker');

  thread.addRole('caldav');

  /*jshint unused:false */
  /*exported caldav */
  var caldav = new Caldav(
    thread.roles.caldav
  );
});

