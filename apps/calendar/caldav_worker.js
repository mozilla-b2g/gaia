['calendar',
 'responder',
 'inspect',
 'presets',
 'worker/thread',
 'ext/ical',
 'ext/caldav',
 'ext/uuid',
 'service/mixins',
 'service/ical_recur_expansion',
 'service/caldav',
 'service/ical'].forEach(function(script) {
   // ?time= is for cache busting in development...
   // there have been cases where nightly would not
   // clear the cache of the worker.
   importScripts('./js/' + script + '.js?time=' + Date.now());
});

var thread = new Calendar.Thread(this);
this.console = new thread.console('caldav worker');

thread.addRole('caldav');
thread.addRole('ical');

var caldav = new Calendar.Service.Caldav(
  thread.roles.caldav
);

var ical = new Calendar.Service.Ical(
  thread.roles.ical
);
