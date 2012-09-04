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

  require('calendar', 'responder', 'inspect', 'worker/thread');

  var thread = new Calendar.Thread(this);
  this.console = new thread.console('W1');

  thread.addRole('test');

  thread.roles.test.on('relay', function() {
    var args = Array.prototype.slice.call(arguments);
    var callback = args.pop();

    callback.apply(this, args);
  });

  thread.roles.test.on('error', function(callback) {
    var err;
    try {
      throw new Error('message');
    } catch (e) {
      err = e;
    }
    callback(err);
  });

  thread.roles.test.on('stream', function(data, stream, callback) {
    var args = Array.prototype.slice.call(arguments);
    args.pop();
    args.pop();

    setTimeout(function() {
      callback(args);
    }, 0);

    stream.emit('data', 1);
    stream.emit('data', 2);
    stream.emit('error', 'err');
  });

  thread.send('ready');

});
