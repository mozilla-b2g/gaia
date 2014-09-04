'use strict';
requireLib('register_system_messages.js');

suite('#registerSystemMessages', function() {
  var subject, onSetMessageHandler;

  setup(function() {
    navigator.mozSetMessageHandler = function(topic, callback) {
      onSetMessageHandler = callback;
    };

    subject = Calendar.registerSystemMessages();
  });

  test('sync', function(done) {
    subject.on('sync', done);
    onSetMessageHandler({ data: { type: 'sync' } });
  });

  test('alarm', function(done) {
    var alarm = { lolcats: { count: 314 } };

    subject.on('alarm', function(data) {
      assert.deepEqual(alarm, data.alarm);
      done();
    });

    onSetMessageHandler({ data: { type: 'alarm', alarm: alarm } });
  });
});
