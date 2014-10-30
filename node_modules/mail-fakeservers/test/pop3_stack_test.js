suite('pop3_stack', function() {
  var fakeserver = require('../');
  var creds = { username: 'testy', password: 'testy' };

  var subject;
  var server;
  setup(function(done) {
    fakeserver.create(function(err, _server) {
      if (err) return done(err);
      server = _server;
      server.createPop3Stack({ credentials: creds }, function(err, stack) {
        subject = stack;
        done(err);
      });
    });
  });

  teardown(function() {
    server.kill();
  });

  suite('#runs', function() {
    test('runs', function(done) {
      done(); // for now just make sure that the server was created
    });
  });
});
