'use strict';

[
 'calendar',
 'inspect',
 'extend',
 'log',
 'ns',
 'presets',
 'responder',
 'worker/thread',
 'ext/caldav',
 'ext/ical',
 'ext/uuid',
 'service/caldav',
 'service/ical_recur_expansion'
].forEach(function(script) {
   // ?time= is for cache busting in development...
   // there have been cases where nightly would not
   // clear the cache of the worker.
   importScripts('./' + script + '.js?time=' + Date.now());
});

var thread = new Calendar.Thread(window);
window.console = new thread.console('caldav worker');

thread.addRole('caldav');

/*jshint unused:true */
/*exported caldav */
var caldav = new Calendar.Service.Caldav(
  thread.roles.caldav
);
