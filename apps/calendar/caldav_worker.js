addEventListener('message', function prepare(e) {

  removeEventListener('message', prepare);

  var url = e.data.url;

  function require() {
    var args = Array.prototype.slice.call(arguments);

    args.forEach(function(script) {
      // ?time= is for cache busting in development...
      // there have been cases where nightly would not
      // clear the cache of the worker.
      importScripts(url + '/js/' + script + '.js?time=' + Date.now());
    });
  }

  require(
    'calendar', 'responder',
    'inspect', 'worker/thread',
    'ext/caldav',
    'service/caldav'
  );

  var thread = new Calendar.Thread(this);
  this.console = new thread.console();

  thread.addRole('caldav');

  var caldav = new Calendar.Service.Caldav(
    thread.roles.caldav
  );

  thread.send('ready');
});

