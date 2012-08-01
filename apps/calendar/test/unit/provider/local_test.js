requireApp('calendar/test/unit/helper.js', function() {
  requireLib('provider/abstract.js');
  requireLib('provider/local.js');
});

suite('provider/local', function() {

  var subject;

  setup(function() {
    subject = new Calendar.Provider.Local();
  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.Provider.Abstract);
  });

  test('#getAccount', function(done) {
    subject.getAccount({}, function(err, success) {
      assert.ok(!err);
      assert.deepEqual(success, {});
      done();
    });
  });

  test('#findCalendars', function(done) {
    // local will always return the same
    // calendar id

    subject.findCalendars({}, function(err, list) {
      done(function() {
        var first = list['local-first'];
        assert.equal(first.id, 'local-first');
        assert.equal(first.name, 'Offline Calendar');
      });
    });
  });

});
