/* globals attentionWindowManager, AttentionWindowManager,
            AttentionWindow, MocksHelper */
'use strict';

requireApp('system/test/unit/mock_attention_window.js');

var mocksForAttentionWindowManager = new MocksHelper([
  'AttentionWindow'
]).init();

suite('system/AttentionWindowManager', function() {
  mocksForAttentionWindowManager.attachTestHelpers();
  var stubById;
  var att1, att2, att3;
  setup(function(done) {
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));

    att1 = new AttentionWindow(fakeAttentionConfig);
    att2 = new AttentionWindow(fakeAttentionConfig);
    att3 = new AttentionWindow(fakeAttentionConfig);

    requireApp('system/js/attention_window_manager.js', done);
  });

  teardown(function() {
    stubById.restore();
  });

  var fakeAttentionConfig = {
    url: 'app://www.fakef/index.html',
    manifest: {},
    manifestURL: 'app://www.fakef/ManifestURL',
    origin: 'app://www.fakef'
  };

  suite('Handle events', function() {
    setup(function() {
      window.attentionWindowManager = new AttentionWindowManager();
    });
    teardown(function() {
      window.attentionWindowManager = null;
    });
    test('Keyboard show', function() {
      attentionWindowManager._activeAttentionWindow = att1;
      var stubResize = this.sinon.stub(att1, 'resize');
      attentionWindowManager.handleEvent(
        new CustomEvent('keyboardchange')
      );
      assert.isTrue(stubResize.called);
    });

    test('Keyboard hide', function() {
      attentionWindowManager._activeAttentionWindow = att2;
      var stubResize = this.sinon.stub(att2, 'resize');
      attentionWindowManager.handleEvent(
        new CustomEvent('keyboardhide')
      );
      assert.isTrue(stubResize.called);
    });

    test('Home button', function() {
      attentionWindowManager._activeAttentionWindow = att3;
      var stubClose = this.sinon.stub(att3, 'close');
      attentionWindowManager.handleEvent(new CustomEvent('home'));
      assert.isTrue(stubClose.called);
    });

    test('Emergency alert is shown', function() {
      attentionWindowManager._activeAttentionWindow = att1;
      var stubClose = this.sinon.stub(att1, 'close');
      attentionWindowManager.handleEvent(
        new CustomEvent('emergencyalert')
      );
      assert.isTrue(stubClose.called);
    });
  });
});
