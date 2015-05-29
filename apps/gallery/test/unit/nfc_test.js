/*jshint maxlen:false, sub:true*/
/*global NFC, MockShrinkingUI */
'use strict';

requireApp('/gallery/js/nfc.js');
requireApp('/gallery/shared/test/unit/mocks/mock_shrinking_ui.js');

suite('nfc', function() {

  var realMozNfc;
  var target;
  setup(function() {
    realMozNfc = navigator.mozNfc;
    navigator.mozNfc = {};
    window.ShrinkingUI = MockShrinkingUI;
    target = Object.create(NFC);
  });

  teardown(function() {
    navigator.mozNfc = realMozNfc;
    window.ShrinkingUI = null;
    target = null;
  });

  suite('share', function() {
    test('Should attach `onpeerready` event handler', function() {
      target.share();
      assert.equal(typeof navigator.mozNfc.onpeerready, 'function');
    });

    test('Should pass Blob to `peer.sendFile()`', function() {
      var event = {
        peer: {
          sendFile: sinon.spy()
        }
      };

      var blob = new Blob();

      target.share(blob);
      navigator.mozNfc.onpeerready(event);

      assert.ok(event.peer.sendFile.calledWith(blob));
    });

    test('Should resolve Promise to pass Blob to `peer.sendFile()`', function(done) {
      var event = {
        peer: {
          sendFile: sinon.spy()
        }
      };

      target.share(function() {
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

  suite('share, and shrinkingUI is handled by gallery itself', function() {
    var targetWithShrink;
    var testFile;
    setup(function() {
      targetWithShrink = target;
      testFile = 'testFile';
      targetWithShrink.share(testFile, {
        foregroundElement: null,
        backgroundElement: null
      });
    });

    test('Should attach `onpeerfound, onpeerlost` event handler', function() {
      assert.equal(typeof navigator.mozNfc.onpeerfound, 'function');
      assert.equal(typeof navigator.mozNfc.onpeerlost, 'function');
    });

    test('should send file when receiving shrinking-sent', function() {
      var event = {
        peer: {
          sendFile: sinon.spy()
        },
        preventDefault: function() {}
      };
      navigator.mozNfc.onpeerfound(event);
      window.dispatchEvent(new CustomEvent('shrinking-sent'));
      assert.ok(event.peer.sendFile.calledWith(testFile));
    });

    test('should start shrinking when onpeerfound', function() {
      this.sinon.stub(targetWithShrink.shrinkingUI, 'start');
      var event = {
        peer: {},
        preventDefault: function() {}
      };
      navigator.mozNfc.onpeerfound(event);
      assert.isTrue(targetWithShrink.shrinkingUI.start.calledOnce);
    });

    test('should stop shrinking when onpeerlost', function() {
      this.sinon.stub(targetWithShrink.shrinkingUI, 'stop');
      var event = {
        peer: {}
      };
      navigator.mozNfc.onpeerlost(event);
      assert.isTrue(targetWithShrink.shrinkingUI.stop.calledOnce);
    });

    test('should stop shrinking when unshare', function() {
      this.sinon.stub(targetWithShrink.shrinkingUI, 'stop');
      targetWithShrink.unshare();
      assert.equal(targetWithShrink.shrinkingUI, null);
    });
  });

  suite('unshare', function() {
    test('Should remove `onpeerready` event handler', function() {
      target.unshare();
      assert.equal(navigator.mozNfc.onpeerready, null);
    });
  });

});
