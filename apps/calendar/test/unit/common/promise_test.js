define(function(require) {
'use strict';

var promise = require('common/promise');

function errorOrFive(shouldError, callback) {
  var error;
  if (shouldError) {
    error = new Error('You told me to error!');
  } else {
    error = null;
  }

  return callback(error, !shouldError && 5);
}

suite('denodeify', function() {
  var subject;

  setup(function() {
    subject = promise.denodeify(errorOrFive);
  });

  test('node-style error', function(done) {
    subject(true /* shouldError */, function(error) {
      assert.instanceOf(error, Error);
      assert.strictEqual(error.message, 'You told me to error!');
      done();
    });
  });

  test('node-style without error', function(done) {
    subject(false /* shouldError */, function(error, result) {
      assert.isNull(error);
      assert.strictEqual(result, 5);
      done();
    });
  });

  test('promise with error', function(done) {
    subject(true /* shouldError */)
    .catch(function(error) {
      assert.instanceOf(error, Error);
      assert.strictEqual(error.message, 'You told me to error!');
      done();
    });
  });

  test('promise without error', function(done) {
    subject(false /* shouldError */)
    .then(function(value) {
      assert.strictEqual(value, 5);
      done();
    });
  });

  test('no callback and no promise', function() {
    // Should not hiccup.
    subject(false /* shouldError */);
  });
});

function SlowCalculator() {
  this.currentValue = 0;
  promise.denodeifyAll(this, [
    'add',
    'multiply'
  ]);
}

SlowCalculator.prototype = {
  add: function(x, callback) {
    var error = null;
    if (typeof x !== 'number') {
      error = new Error('Can only add numbers!');
    }

    this.currentValue += x;
    setTimeout(function() {
      callback(error, error || this.currentValue);
    }.bind(this), 10);
  },

  multiply: function(x, callback) {
    var error = null;
    if (typeof x !== 'number') {
      error = new Error('Can only multiply numbers!');
    }

    this.currentValue *= x;
    setTimeout(function() {
      callback(error, error || this.currentValue);
    }.bind(this), 10);
  }
};

suite('denodeifyAll', function() {
  var subject;

  setup(function() {
    subject = new SlowCalculator();
  });

  test('node-style error', function(done) {
    subject.multiply('lolcats', function(error) {
      assert.instanceOf(error, Error);
      assert.strictEqual(error.message, 'Can only multiply numbers!');
      done();
    });
  });

  test('node-style without error', function(done) {
    subject.add(5, function(error, result) {
      assert.isNull(error);
      assert.strictEqual(result, 5);
      done();
    });
  });

  test('promise with error', function(done) {
    subject.add(/\s+/).catch(function(error) {
      assert.instanceOf(error, Error);
      assert.strictEqual(error.message, 'Can only add numbers!');
      done();
    });
  });

  test('promise without error', function(done) {
    subject.add(9)
    .then(function(value) {
      assert.strictEqual(value, 9);
      return subject.multiply(8);
    })
    .then(function(value) {
      assert.strictEqual(value, 72);
      done();
    });
  });

  test('no callback and no promise', function() {
    // Should not hiccup.
    subject.multiply(3.14);
  });
});

});
