'use strict';

/* global MocksHelper, InputFrameManager, MockKeyboardManager */

require('/test/unit/mock_keyboard_manager.js');
require('/js/input_frame_manager.js');

var mocksForInputFrameManager = new MocksHelper([
  'KeyboardManager'
]).init();

suite('InputFrameManager', function() {
  mocksForInputFrameManager.attachTestHelpers();

  test('mozbrowserresize event', function() {
    var inputFrameManager = new InputFrameManager(MockKeyboardManager);
    var evt = {
      type: 'mozbrowserresize',
      detail: {
        height: 123
      },
      stopPropagation: function() {}
    };
    this.sinon.stub(MockKeyboardManager, 'resizeKeyboard');
    inputFrameManager.handleEvent(evt);
    assert.isTrue(MockKeyboardManager.resizeKeyboard.calledWith(evt));
  });

  suite('setup & reset frame', function() {
    var layout;
    var frame;
    var stubSetFrameActive;
    var inputFrameManager;
    setup(function(){
      layout = {
        manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
        id: 'en',
      };

      frame = {
        classList: {
          add: this.sinon.spy(),
          remove: this.sinon.spy(),
        },
        addEventListener: this.sinon.spy(),
        removeEventListener: this.sinon.spy()
      };

      inputFrameManager = new InputFrameManager(MockKeyboardManager);
      inputFrameManager.runningLayouts[layout.manifestURL] = {};
      inputFrameManager.runningLayouts[layout.manifestURL][layout.id] =
        frame;

      stubSetFrameActive = sinon.stub(inputFrameManager, '_setFrameActive');
    });
    test('setupFrame', function(){
      inputFrameManager.setupFrame(layout);
      assert.isTrue(frame.classList.remove.calledWith('hide'));
      assert.isTrue(stubSetFrameActive.calledWith(frame, true));
      assert.isTrue(
        frame.addEventListener.calledWith(
          'mozbrowserresize', inputFrameManager, true
        )
      );
    });
    test('resetFrame', function(){
      inputFrameManager.resetFrame(layout);
      assert.isTrue(frame.classList.add.calledWith('hide'));
      assert.isTrue(stubSetFrameActive.calledWith(frame, false));
      assert.isTrue(
        frame.removeEventListener.calledWith(
          'mozbrowserresize', inputFrameManager, true
        )
      );
    });
  });

  test('setFrameActive', function(){
    var inputFrameManager = new InputFrameManager(MockKeyboardManager);

    var frame = {
      setVisible: this.sinon.spy(),
      setInputMethodActive: this.sinon.spy(),
      dataset: {
        frameManifestURL: null,
        framePath: null
      }
    };

    var stubSetHasActiveKB =
      this.sinon.stub(MockKeyboardManager, 'setHasActiveKeyboard');

    inputFrameManager._setFrameActive(frame, true);

    assert.isTrue(frame.setVisible.calledWith(true));
    assert.isTrue(frame.setInputMethodActive.calledWith(true));
    assert.isTrue(stubSetHasActiveKB.calledWith(true));

    frame.setVisible.reset();
    frame.setInputMethodActive.reset();
    stubSetHasActiveKB.reset();

    inputFrameManager._setFrameActive(frame, false);

    assert.isTrue(frame.setVisible.calledWith(false));
    assert.isTrue(frame.setInputMethodActive.calledWith(false));
    assert.isTrue(stubSetHasActiveKB.calledWith(false));
  });

  suite('launchFrame', function() {
    var inputFrameManager;
    var layout;
    var frame;
    setup(function(){
      inputFrameManager = new InputFrameManager(MockKeyboardManager);

      layout = {
        manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
        id: 'en',
        path: '/index.html#en'
      };

      frame = {
        classList: {
          add: this.sinon.spy()
        },
        dataset: {
          frameName: null,
          framePath: null,
          frameManifestURL: null
        }
      };
    });
    test('layout is already running', function(){
      var stubIsRunningLayout =
        this.sinon.stub(inputFrameManager, '_isRunningLayout').returns(true);

      var stubIsRunningKeyboard =
        this.sinon.stub(inputFrameManager, '_isRunningKeyboard');

      inputFrameManager.launchFrame(layout);

      assert.isTrue(stubIsRunningLayout.calledWith(layout));
      assert.isFalse(stubIsRunningKeyboard.called);
    });

    test('layout not running, keyboard running, getExistingFrame succeeds',
      function(){
      this.sinon.stub(inputFrameManager, '_isRunningLayout').returns(false);

      var stubIsRunningKeyboard =
        this.sinon.stub(inputFrameManager, '_isRunningKeyboard')
        .returns(true);

      var stubInsertFrameRef =
        this.sinon.stub(inputFrameManager, '_insertFrameRef');

      var stubGetFrame =
        this.sinon.stub(inputFrameManager, '_getFrameFromExistingKeyboard')
        .returns(frame);

      var stubLoadKeyboardLayout =
        this.sinon.stub(inputFrameManager, '_loadKeyboardLayoutToFrame');

      inputFrameManager.launchFrame(layout);

      assert.isTrue(stubIsRunningKeyboard.calledWith(layout));
      assert.isTrue(stubGetFrame.calledWith(layout));

      assert.isFalse(stubLoadKeyboardLayout.called);

      assert.equal(frame.dataset.frameName, layout.id);
      assert.equal(frame.dataset.framePath, layout.path);

      assert.isTrue(stubInsertFrameRef.calledWith(layout, frame));
    });

    test('layout not running, keyboard running, getExistingFrame fails',
      function(){
      this.sinon.stub(inputFrameManager, '_isRunningLayout').returns(false);

      this.sinon.stub(inputFrameManager, '_isRunningKeyboard').returns(true);

      this.sinon.stub(inputFrameManager, '_insertFrameRef');

      this.sinon.stub(inputFrameManager, '_getFrameFromExistingKeyboard')
      .returns(null);

      var stubLoadKeyboardLayout =
        this.sinon.stub(inputFrameManager, '_loadKeyboardLayoutToFrame')
        .returns(frame);

      var stubSetFrameActive =
        this.sinon.stub(inputFrameManager, '_setFrameActive');

      inputFrameManager.launchFrame(layout);

      assert.isTrue(stubLoadKeyboardLayout.calledWith(layout));
      assert.isTrue(stubSetFrameActive.calledWith(frame, false));
      assert.isTrue(frame.classList.add.calledWith('hide'));
      assert.equal(frame.dataset.frameManifestURL, layout.manifestURL);
    });

    test('layout & keyboard not running', function(){
      this.sinon.stub(inputFrameManager, '_isRunningLayout').returns(false);
      this.sinon.stub(inputFrameManager, '_isRunningKeyboard')
        .returns(false);

      var stubGetFrame =
        this.sinon.stub(inputFrameManager, '_getFrameFromExistingKeyboard');

      var stubLoadKeyboardLayout =
        this.sinon.stub(inputFrameManager, '_loadKeyboardLayoutToFrame')
        .returns(frame);

      this.sinon.stub(inputFrameManager, '_setFrameActive');
      this.sinon.stub(inputFrameManager, '_insertFrameRef');

      inputFrameManager.launchFrame(layout);

      assert.isFalse(stubGetFrame.called);
      assert.isTrue(stubLoadKeyboardLayout.calledWith(layout));
    });
  });

  test('loadKeyboardLayoutToFrame', function(){
    var inputFrameManager = new InputFrameManager(MockKeyboardManager);

    var stubConstructFrame =
      this.sinon.stub(inputFrameManager, '_constructFrame').returns('kb');

    var oldKBFrameContainer = MockKeyboardManager.keyboardFrameContainer;
    MockKeyboardManager.keyboardFrameContainer = {
      appendChild: this.sinon.spy()
    };

    var k = inputFrameManager._loadKeyboardLayoutToFrame('layout');

    assert.equal(k, 'kb');
    assert.isTrue(stubConstructFrame.calledWith('layout'));
    assert.isTrue(
      MockKeyboardManager.keyboardFrameContainer.appendChild.calledWith('kb')
    );

    MockKeyboardManager.keyboardFrameContainer = oldKBFrameContainer;
  });

  test('destroyFrame', function(){
    var inputFrameManager = new InputFrameManager(MockKeyboardManager);
    var layout = {
      manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
      id: 'en'
    };
    var frame = {
      parentNode: {
        removeChild: this.sinon.spy()
      }
    };

    inputFrameManager.runningLayouts[layout.manifestURL] = {};
    inputFrameManager.runningLayouts[layout.manifestURL][layout.id] = frame;

    inputFrameManager.destroyFrame(layout.manifestURL, layout.id);

    assert.isTrue(frame.parentNode.removeChild.calledWith(frame));
  });

  suite('constructFrame', function() {
    var inputFrameManager;
    var fakeKeyboardElem = {
      src: null,
      setAttribute: sinon.spy()
    };
    var oldWindowApplications;
    var layout = {
      origin: 'app://keyboard.gaiamobile.org',
      path: '/index.html#en',
      manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp'
    };
    suiteSetup(function() {
      sinon.stub(console, 'log');
    });
    setup(function() {
      inputFrameManager = new InputFrameManager(MockKeyboardManager);
      this.sinon.stub(document, 'createElement').returns(fakeKeyboardElem);
      oldWindowApplications = window.applications;
      window.applications = {
        getByManifestURL: function() {}
      };
    });
    teardown(function() {
      fakeKeyboardElem.src = null;
      fakeKeyboardElem.setAttribute.reset();
      window.applications = oldWindowApplications;
    });
    test('constructFrame, OOP enabled, uncertified, memory >= 512', function(){
      var oldIsOutOfProcessEnabled = MockKeyboardManager.isOutOfProcessEnabled;
      var oldTotalMemory = MockKeyboardManager.totalMemory;
      MockKeyboardManager.isOutOfProcessEnabled = true;
      MockKeyboardManager.totalMemory = 1024;

      var manifest = {
        type: 'unknown'
      };
      var stubGetManifestURL =
        this.sinon.stub(window.applications, 'getByManifestURL').returns({
          manifest: manifest
        });

      var k = inputFrameManager._constructFrame(layout);

      assert.equal(k, fakeKeyboardElem);
      assert.equal(k.src, layout.origin + layout.path);
      assert.isTrue(k.setAttribute.calledWith('mozapptype', 'inputmethod'));
      assert.isTrue(k.setAttribute.calledWith('mozbrowser', 'true'));
      assert.isTrue(k.setAttribute.calledWith('mozpasspointerevents', 'true'));
      assert.isTrue(k.setAttribute.calledWith('mozapp', layout.manifestURL));

      assert.isTrue(k.setAttribute.calledWith('remote', 'true'));
      assert.isTrue(k.setAttribute.calledWith('ignoreuserfocus', 'true' ));

      assert.isTrue(stubGetManifestURL.calledWith(layout.manifestURL));

      MockKeyboardManager.isOutOfProcessEnabled = oldIsOutOfProcessEnabled;
      MockKeyboardManager.totalMemory = oldTotalMemory;
    });
    test('constructFrame (partial), OOP enabled, certified, memory < 512',
      function(){
      var oldIsOutOfProcessEnabled = MockKeyboardManager.isOutOfProcessEnabled;
      var oldTotalMemory = MockKeyboardManager.totalMemory;
      MockKeyboardManager.isOutOfProcessEnabled = true;
      MockKeyboardManager.totalMemory = 256;

      var manifest = {
        type: 'certified'
      };
      this.sinon.stub(window.applications, 'getByManifestURL').returns({
        manifest: manifest
      });

      var k = inputFrameManager._constructFrame(layout);

      assert.equal(k, fakeKeyboardElem);
      assert.isFalse(k.setAttribute.calledWith('remote', 'true'));
      assert.isFalse(k.setAttribute.calledWith('ignoreuserfocus', 'true' ));

      MockKeyboardManager.isOutOfProcessEnabled = oldIsOutOfProcessEnabled;
      MockKeyboardManager.totalMemory = oldTotalMemory;
    });
    test('constructFrame (partial), OOP disabled', function(){
      var oldIsOutOfProcessEnabled = MockKeyboardManager.isOutOfProcessEnabled;
      MockKeyboardManager.isOutOfProcessEnabled = false;

      var manifest = {
        type: 'unknown'
      };
      this.sinon.stub(window.applications, 'getByManifestURL').returns({
        manifest: manifest
      });

      var k = inputFrameManager._constructFrame(layout);

      assert.equal(k, fakeKeyboardElem);
      assert.isFalse(k.setAttribute.calledWith('remote', 'true'));
      assert.isFalse(k.setAttribute.calledWith('ignoreuserfocus', 'true' ));

      MockKeyboardManager.isOutOfProcessEnabled = oldIsOutOfProcessEnabled;
    });
  });

  suite('getFrameFromExistingKeyboard', function() {
    var inputFrameManager;
    var newLayout;
    setup(function() {
      inputFrameManager = new InputFrameManager(MockKeyboardManager);
      newLayout = {
        manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
        id: 'en',
        path: '/index.html#en'
      };
    });
    test('found existing keyboard to use', function(){
      var frame = {
        dataset: {
          framePath: newLayout.path
        }
      };
      inputFrameManager.runningLayouts[newLayout.manifestURL] = {};
      inputFrameManager
      .runningLayouts[newLayout.manifestURL][newLayout.id] = frame;

      var stubFrameManagerDelete =
        this.sinon.stub(inputFrameManager, 'deleteRunningFrameRef');
      var f = inputFrameManager._getFrameFromExistingKeyboard(newLayout);

      assert.equal(f, frame);
      assert.equal(f.src, newLayout.origin + newLayout.path);
      assert.isTrue(
        stubFrameManagerDelete.calledWith(newLayout.manifestURL, newLayout.id)
      );
    });
    test('didn\'t find existing keyboard to use', function(){
      var oldLayout = {
        manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
        id: 'fr',
        path: '/other.html#fr'
      };

      var frame = {
        dataset: {
          framePath: oldLayout.path
        }
      };

      inputFrameManager.runningLayouts[oldLayout.manifestURL] = {};
      inputFrameManager
      .runningLayouts[oldLayout.manifestURL][oldLayout.id] = frame;

      var stubFrameManagerDelete =
        this.sinon.stub(inputFrameManager, 'deleteRunningFrameRef');

      var f = inputFrameManager._getFrameFromExistingKeyboard(newLayout);

      assert.strictEqual(f, null);
      assert.isFalse(stubFrameManagerDelete.called);
    });
  });

  suite('runningLayouts helpers', function() {
    var inputFrameManager;
    setup(function() {
      inputFrameManager = new InputFrameManager(MockKeyboardManager);
    });
    test('insertFrameRef: existing manifest', function(){
      var layout = {
        manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
        id: 'en'
      };
      var layout2 = {
        manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
        id: 'fr'
      };
      inputFrameManager.runningLayouts[layout.manifestURL] = {};
      inputFrameManager
      .runningLayouts[layout.manifestURL][layout.id] = 'dummy';

      inputFrameManager._insertFrameRef(layout2, 'frame2');

      assert.equal(
        inputFrameManager.runningLayouts[layout2.manifestURL][layout2.id],
        'frame2'
      );
    });
    test('insertRunningLayout: existing manifest', function(){
      var layout = {
        manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
        id: 'en'
      };
      inputFrameManager._insertFrameRef(layout, 'frame');

      assert.equal(
        inputFrameManager.runningLayouts[layout.manifestURL][layout.id],
        'frame'
      );
    });
    test('deleteRunningFrameRef', function(){
      var layout = {
        manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
        id: 'en'
      };
      inputFrameManager.runningLayouts = {};

      inputFrameManager.runningLayouts[layout.manifestURL] = {};
      inputFrameManager.runningLayouts[layout.manifestURL][layout.id] =
        'dummy';

      inputFrameManager.deleteRunningFrameRef(layout.manifestURL, layout.id);

      assert.isFalse(
        inputFrameManager.runningLayouts[layout.manifestURL]
        .hasOwnProperty(layout.id)
      );
    });
    test('deleteRunningKeyboardRef', function(){
      var layout = {
        manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
        id: 'en'
      };
      inputFrameManager.runningLayouts = {};

      inputFrameManager.runningLayouts[layout.manifestURL] = {};

      inputFrameManager.deleteRunningKeyboardRef(layout.manifestURL);

      assert.isFalse(
        inputFrameManager.runningLayouts.hasOwnProperty(layout.manifestURL)
      );
    });
  });

});
