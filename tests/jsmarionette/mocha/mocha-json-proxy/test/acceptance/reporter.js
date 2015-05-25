/* global assert, forkFixture */
'use strict';
suite('reporter', function() {
  var msgs = [];
  var child;

  setup(function(done) {
    this.timeout('10s');
    child = forkFixture('pass');
    child.on('message', function(content) {
      if (Array.isArray(content) && content[0] === 'mocha-proxy') {
        var msg = content[1];
        msgs.push(msg[0]);
        if (msg[0] === 'end') {
          return done();
        }
      }
    });

  });

  test('got messages', function() {
    var expectedMsgs = [
      'start',
      'suite',
      'suite',
      'test',
      'pass',
      'test end',
      'test',
      'pass',
      'test end',
      'suite end',
      'suite',
      'test',
      'pass',
      'test end',
      'suite end',
      'suite end',
      'end'
    ];

    assert.deepEqual(msgs, expectedMsgs);
  });

});
