addEventListener('message', function prepare(e) {
'use strict';

requirejs(['worker/thread'], (Thread) => {

var thread = new Thread(this);
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

});
