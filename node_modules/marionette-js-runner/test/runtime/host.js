suite('runtime/host', function() {
  var mock = mockProcessSend(),
      Host = require('../../lib/runtime/host').Host;

  var subject,
      hostId = 'magic_number',
      port = 2828;

  setup(function(done) {
    mock.sent.on('createHost', function(reqId) {
      process.emit(
        'message',
        ['response', reqId, null, { id: hostId, port: port }]
      );
    });

    Host.create({}, function(err, host) {
      if (err) return done(err);
      subject = host;
      done();
    });
  });

  test('.port', function() {
    assert.equal(subject.port, port);
  });

  test('.id', function() {
    assert.equal(subject.id, hostId);
  });

  test('#stop', function(done) {
    mock.sent.on('stopHost', function(reqId, gotId) {
      assert.equal(gotId, hostId);
      done();
    });

    subject.stop(function() {});
  });

  test('#restart', function(done) {
    mock.sent.on('restartHost', function(reqId, gotId) {
      assert.equal(gotId, hostId);
      done();
    });

    subject.restart({}, function() {});
  });

});
