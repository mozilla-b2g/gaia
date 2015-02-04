suite('options/profile', function() {
  var subject = require('../../lib/options/profile'),
      createprofile = require('../../lib/createprofile');

  var sinon;
  setup(function() {
    sinon = global.sinon.sandbox.create();
  });

  teardown(function() {
    sinon.restore();
  });

  test('profile as string', function(done) {
    var stub = sinon.stub(createprofile, 'profile'),
        target = 'xxx',
        result = 'yyy';

    stub.callsArgWith(1, null, result);

    subject({ profile: target }, function(err, path) {
      assert.calledWith(stub, target);
      assert.ok(!err);
      assert.equal(path, result);
      done();
    });
  });

  test('no profile', function(done) {
    var stub = sinon.stub(createprofile, 'tmp'),
        result = 'yyy';

    stub.callsArgWith(0, null, result);
    subject({}, function(err, path) {
      assert.ok(!err);
      assert.equal(path, result);
      done();
    });
  });

  test('invalid profile', function() {
    assert.throws(function() {
      subject({ profile: 1111 });
    }, /\.profile/);
  });

  suite('with an array value', function() {
    function testType(type, value) {
      test('profile [' + type + ', ' + value + ']', function(done) {
        var stub = sinon.stub(createprofile, type),
            result = 'yyy';

        stub.callsArgWith(1, null, result);

        subject({ profile: [type, value] }, function(err, path) {
          assert.calledWith(stub, value);

          assert.ok(!err);
          assert.equal(path, result);
          done();
        });
      });
    }

    testType('gaia', '/path/2/runtime');
    testType('baseProfile', '/path/2/base');
  });
});
