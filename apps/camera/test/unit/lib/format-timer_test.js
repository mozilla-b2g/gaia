/*
  Formattimer Test.
*/
'use strict';

require('/shared/js/format.js');

suite('Format Timer Unit Tests', function() {
  var require = window.req;
  var subject;

  suiteSetup(function(done) {
    require([
      'lib/format-timer'
    ], function(formattimer) {
      subject = formattimer;
      done();
    });
  });

  suite('#exports', function() {
    test('=> pads minutes and seconds', function() {
      assert.equal(subject(0), '00:00');
      assert.equal(subject(60000), '01:00');
      assert.equal(subject(1000000), '16:40');
    });
  });
});
