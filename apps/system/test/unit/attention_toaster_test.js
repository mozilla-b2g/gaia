/* global MocksHelper, MockAppWindow, MockService, AttentionToaster */
'use strict';

requireApp('system/test/unit/mock_app_window.js');
require('/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_rocketbar.js');

var mocksForAttentionToaster = new MocksHelper([
  'AppWindow', 'Service'
]).init();

suite('system/AttentionToaster', function() {
  var stubById;
  mocksForAttentionToaster.attachTestHelpers();
  setup(function(done) {
    this.sinon.stub(window, 'requestAnimationFrame');
    this.sinon.useFakeTimers();
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/attention_toaster.js', done);
  });

  teardown(function() {
    stubById.restore();
  });

  var fakeAppConfig1 = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake'
  };

  test('Enter uninit state while the attention window is closed.', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var at1 = new AttentionToaster(app1);
    assert.isTrue(at1._currentToasterState === 'uninit');
  });

  test('Enter uninit state while the attention window requests to open.',
    function() {
      var app1 = new MockAppWindow(fakeAppConfig1);
      var at1 = new AttentionToaster(app1);
      assert.isTrue(at1._currentToasterState === 'uninit');
      app1.element.dispatchEvent(new CustomEvent('_requestopen'));
      assert.equal(at1._currentToasterState, 'uninit');
    });

  test('Enter closed state while the attention window is closed.',
    function() {
      var app1 = new MockAppWindow(fakeAppConfig1);
      var at1 = new AttentionToaster(app1);
      at1.start();
      assert.isTrue(at1._currentToasterState === 'uninit');
      app1.element.dispatchEvent(new CustomEvent('_closed'));
      assert.notEqual(at1._currentToasterState, 'closed');
      window.requestAnimationFrame.yield();
      assert.equal(at1._currentToasterState, 'closed');
    });

  test('Enter opening state while open event comes.',
    function() {
      var app1 = new MockAppWindow(fakeAppConfig1);
      var at1 = new AttentionToaster(app1);
      at1._currentToasterState = 'closed';
      at1.processStateChange('open');
      assert.equal(at1._currentToasterState, 'opening');
    });

  test('Enter opened state while the attention window transition ends.',
    function() {
      var app1 = new MockAppWindow(fakeAppConfig1);
      var at1 = new AttentionToaster(app1);
      at1.start();
      at1._currentToasterState = 'opening';
      app1.element.dispatchEvent(new CustomEvent('transitionend'));
      assert.equal(at1._currentToasterState, 'opened');
    });

  test('Enter closing state while the attention window display timeout.',
    function() {
      var app1 = new MockAppWindow(fakeAppConfig1);
      var at1 = new AttentionToaster(app1);
      at1.start();
      at1._currentToasterState = 'opened';
      at1._enter_opened();
      MockService.locked = false;
      MockService.mTopMostWindow = {
        CLASS_NAME: 'AppWindow'
      };
      this.sinon.clock.tick(at1.TOASTER_TIMEOUT);
      assert.equal(at1._currentToasterState, 'closing');
    });

  test('Enter opening state if being at closed state for 30sec.',
    function() {
      var app1 = new MockAppWindow(fakeAppConfig1);
      var at1 = new AttentionToaster(app1);
      at1.start();
      at1._currentToasterState = 'closing';
      at1._enter_closed('complete');
      this.sinon.clock.tick(at1.RESPAWN_TIMEOUT);
      assert.equal(at1._currentToasterState, 'opening');
    });

  test('Enter closed state while the attention window transition ends.',
    function() {
      var app1 = new MockAppWindow(fakeAppConfig1);
      var at1 = new AttentionToaster(app1);
      at1.start();
      at1._currentToasterState = 'closing';
      app1.element.dispatchEvent(new CustomEvent('transitionend'));
      assert.equal(at1._currentToasterState, 'closed');
    });

  test('Enter opening state again while lockscreen window is opened.',
    function() {
      var app1 = new MockAppWindow(fakeAppConfig1);
      var at1 = new AttentionToaster(app1);
      at1.start();
      at1._currentToasterState = 'closed';
      app1.element.dispatchEvent(new CustomEvent('_lockscreen-appopened'));
      assert.equal(at1._currentToasterState, 'opening');
    });

  test('Enter opening state again while secure window is closed.',
    function() {
      var app1 = new MockAppWindow(fakeAppConfig1);
      var at1 = new AttentionToaster(app1);
      at1.start();
      at1._currentToasterState = 'closed';
      app1.element.dispatchEvent(new CustomEvent('_secure-appclosed'));
      assert.equal(at1._currentToasterState, 'opening');
    });

  test('Enter closing state while lockscreen window is closed.',
    function() {
      var app1 = new MockAppWindow(fakeAppConfig1);
      var at1 = new AttentionToaster(app1);
      at1.start();
      at1._currentToasterState = 'opened';
      app1.element.dispatchEvent(new CustomEvent('_lockscreen-appclosed'));
      assert.isTrue(at1._currentToasterState === 'closing');
    });

  test('Enter closing state while secure window is opened.',
    function() {
      var app1 = new MockAppWindow(fakeAppConfig1);
      var at1 = new AttentionToaster(app1);
      at1.start();
      at1._currentToasterState = 'opened';
      app1.element.dispatchEvent(new CustomEvent('_secure-appopened'));
      assert.equal(at1._currentToasterState, 'closing');
    });

  test('Should not enter closing state if system is locked', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var at1 = new AttentionToaster(app1);
    MockService.locked = true;
    MockService.mTopMostWindow = {
      isFullScreen: function() {
        return false;
      }
    };
    at1._currentToasterState = 'opened';
    at1._enter_opened();
    this.sinon.clock.tick(at1.TOASTER_TIMEOUT);
    assert.equal(at1._currentToasterState, 'opened');
  });

  test('Should enter closing state if fullscreen secure app is opened',
    function() {
      var app1 = new MockAppWindow(fakeAppConfig1);
      var at1 = new AttentionToaster(app1);
      MockService.locked = true;
      MockService.mTopMostWindow = {
        isFullScreen: function() {
          return true;
        }
      };
      at1._currentToasterState = 'opened';
      at1._enter_opened();
      this.sinon.clock.tick(at1.TOASTER_TIMEOUT);
      assert.equal(at1._currentToasterState, 'closing');
    });

  test('Should not trigger state change if the app is hidden or active',
    function() {
      var app1 = new MockAppWindow(fakeAppConfig1);
      var at1 = new AttentionToaster(app1);
      this.sinon.stub(app1, 'isActive').returns(true);
      app1.element.dispatchEvent(new CustomEvent('_lockscreen-appopened'));
      assert.equal(at1._currentToasterState, 'uninit');
    });

  test('becomeToaster()', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var at1 = new AttentionToaster(app1);
    at1.becomeToaster();
    assert.isTrue(app1.element.classList.contains('toaster-mode'));
    assert.isTrue(app1.resized);
  });

  test('recoverLayout()',
    function() {
      var app1 = new MockAppWindow(fakeAppConfig1);
      var at1 = new AttentionToaster(app1);
      var stubRealResize = this.sinon.stub(app1, '_resize');
      var stubPublish = this.sinon.stub(app1, 'publish');
      at1.becomeToaster();
      app1.element.classList.add('displayed');
      at1.recoverLayout();
      assert.isFalse(app1.element.classList.contains('toaster-mode'));
      assert.isFalse(app1.element.classList.contains('displayed'));
      assert.isTrue(stubPublish.calledWith('recovering'));
      assert.isTrue(stubRealResize.called);
      assert.isFalse(app1.resized);
    });

  test('open the toaster after resize and repaint', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var at1 = new AttentionToaster(app1);
    var stubTryWaitForFullRepaint =
      this.sinon.stub(app1, 'tryWaitForFullRepaint');
    var stubSetVisible = this.sinon.stub(app1, 'setVisible');
    var stubProcessStateChange = this.sinon.stub(at1, 'processStateChange');
    at1._currentToasterState = 'closed';
    at1._enter_closed('init');
    stubTryWaitForFullRepaint.getCall(0).args[0]();
    assert.isTrue(stubProcessStateChange.calledWith('open'));
    assert.isFalse(stubSetVisible.called);
  });

  test('Only open the toaster while we are from uninit state.', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var at1 = new AttentionToaster(app1);
    var stubProcessStateChange = this.sinon.stub(at1, 'processStateChange');
    at1._currentToasterState = 'closed';
    at1._enter_closed('complete');
    assert.isFalse(stubProcessStateChange.called);
  });

  test('Send the app to background once closed.', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var at1 = new AttentionToaster(app1);
    var stubSetVisible = this.sinon.stub(app1, 'setVisible');
    at1._currentToasterState = 'closed';
    at1._enter_closed('complete');
    assert.isTrue(stubSetVisible.calledWith(false));
  });

  test('Bring the app to foreground once opening.', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var at1 = new AttentionToaster(app1);
    var stubSetVisible = this.sinon.stub(app1, 'setVisible');
    at1._currentToasterState = 'opening';
    at1._enter_opening();
    assert.isTrue(stubSetVisible.calledWith(true));
  });
});
