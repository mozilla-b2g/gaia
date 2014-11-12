suite('chai', function() {

  test('expect interface', function() {
    assert.isFunction(expect, 'expect enable');
    expect(true).to.be.ok;
    expect(false).to.not.be.ok;
    expect('test').to.have.property('length', 4);
    expect('asd').to.have.property('constructor', String);
    expect({ 'foo.bar': 'baz' }).to.have.property('foo.bar');
  });

  test('should interface', function() {
    expect('test').to.have.property('should');
    true.should.be.ok;
    false.should.not.be.ok;
    'test'.should.have.property('length', 4);
    'asd'.should.have.property('constructor', String);
    ({ 'foo.bar': 'baz' }).should.have.property('foo.bar');
  });

  test('chai-as-promised plugin resolve', function(done) {
    assert.isFulfilled(Promise.resolve(), "Promise resolved").notify(done);
  });

  test('chai-as-promised plugin reject', function(done) {
    assert.isRejected(Promise.reject(), "Promise rejected").notify(done);
  });

});
