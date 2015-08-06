'use strict';

suite('RPP PassPhrase module', function() {
  setup(function(done) {
    require(['rpp/passphrase'], PassPhrase => {
      this.subject = new PassPhrase('salt', 'mac');
      done();
    });
  });

  test('should notify us about empty passphrase', function(done) {
    this.subject.exists().then(function(status) {
      assert.isFalse(status);
      done();
    });
  });

  test('should give us ability to save passphrase', function(done) {
    this.subject.change('mypass').then(function(value) {
      assert.isNotNull(value);
      done();
    });
  });

  test('should give us flag that passphrase exists', function(done) {
    this.subject.exists().then(function(status) {
      assert.isTrue(status);
      done();
    });
  });

  test('should allow us to verify our passphrase', function(done) {
    this.subject.verify('mypass').then(function(status) {
      assert.isTrue(status);
      done();
    });
  });

  test('should not allow us to verify random passphrase', function(done) {
    this.subject.verify('random').then(function(status) {
      assert.isFalse(status);
      done();
    });
  });
});
