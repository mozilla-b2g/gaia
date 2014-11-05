/*jshint maxlen:false, sub:true*/
/*global NFC*/
'use strict';

requireApp('/gallery/js/nfc.js');

suite('nfc', function() {

  var realMozNfc;

  setup(function() {
    realMozNfc = navigator.mozNfc;

    navigator.mozNfc = {};
  });

  teardown(function() {
    navigator.mozNfc = realMozNfc;
  });

  suite('share', function() {
    test('Should attach `onpeerready` event handler', function() {
      NFC.share();
      assert.equal(typeof navigator.mozNfc.onpeerready, 'function');
    });

    test('Should pass Blob to `peer.sendFile()`', function() {
      var event = {
        peer: {
          sendFile: sinon.spy()
        }
      };

      var blob = new Blob();

      NFC.share(blob);
      navigator.mozNfc.onpeerready(event);

      assert.ok(event.peer.sendFile.calledWith(blob));
    });

    test('Should resolve Promise to pass Blob to `peer.sendFile()`', function(done) {
      var event = {
        peer: {
          sendFile: sinon.spy()
        }
      };

      NFC.share(function() {
        return {
          then: function(callback) {
            var blob = new Blob();
            callback(blob);

            assert.ok(event.peer.sendFile.calledWith(blob));
            done();
          }
        };
      });
      navigator.mozNfc.onpeerready(event);
    });
  });

  suite('unshare', function() {
    test('Should remove `onpeerready` event handler', function() {
      NFC.unshare();
      assert.equal(navigator.mozNfc.onpeerready, null);
    });
  });

});
