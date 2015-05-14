/* global assert */
'use strict';
suite('error_ipc', function() {
  var subject = require('../lib/error_ipc');

  test('roundtrip', function() {
    var error = new Error('xfoo');
    var out = subject.deserialize(subject.serialize(error));

    assert(out instanceof Error, 'instanceof Error');
    assert.equal(out.message, error.message);
    assert.equal(out.stack, error.stack);
  });

});
