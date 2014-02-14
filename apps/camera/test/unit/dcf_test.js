/*
  Dcf Test.
*/
'use strict';

require('/shared/js/format.js');

suite('Format Timer Unit Tests', function() {

  var subject;

  suiteSetup(function(done) {
    req([
      'dcf'
    ], function(dcf) {
      subject = dcf;
      done();
    });
  });

  suite('#createDCFFilename', function() {

    setup(function() {
      var stub = this.sinon.stub(asyncStorage,
        'getItem');
      subject.init();
      // Trigger the callback
      stub.getCall(0).args[1]({
        file: 'moz',
        dir: '1'
      });
    });

    test('=> pads the filename', function() {
      var result;
      var storage = {
        get: function(filename) {
          result = filename;
          return {};
        }
      };

      subject.createDCFFilename(storage, 'image');
      assert.equal(result, 'DCIM/1MZLLA/IMG_0moz.jpg');
    });
  });
});
