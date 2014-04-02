'use strict';

mocha.globals(['LockScreenMediator', 'LockScreenWidgetFactory',
               'LockScreenRouter', 'LockScreenBasicWidget',
               'LockScreenSlide', 'LockScreenSlideWidget']);

requireApp('system/js/lockscreen/widgets/basic.js');
requireApp('system/js/lockscreen/widgets/slide.js');

suite('system/lockscreen/widgets/LockScreenSlideWidget >', function() {
  var originalSlideComponent,
      mockSlideComponent,
      mockMediator,
      mockFactory,
      mockRouter,
      slideWidget;

  setup(function() {
    originalSlideComponent = window.LockScreenSlide;

    mockSlideComponent =
    mockFactory =
    mockRouter = function() {};
    mockMediator = function() {
      this.request = function(req) {
        if ('canvas' === req.type) {
          req.content.response();
        }
      };
      this.post = function() {};
    };

    window.LockScreenSlide = mockSlideComponent;
    slideWidget = new window.LockScreenSlideWidget(new mockMediator());
  });

  teardown(function() {
    window.LockScreenSlide = originalSlideComponent;
  });

  suite('events', function() {
    test('lockscreenslide-activate-left', function() {
      var stubRequestMethod = this.sinon.stub(slideWidget,
        'requestInvokeCamera');
      slideWidget.handleEvent(
        new CustomEvent('lockscreenslide-activate-left'));
      assert.isTrue(stubRequestMethod.called,
        'didn\'t forward the corresponding request');
    });
    test('lockscreenslide-activate-right', function() {
      var stubRequestMethod = this.sinon.stub(slideWidget,
        'requestUnlock');
      slideWidget.handleEvent(
        new CustomEvent('lockscreenslide-activate-right'));
      assert.isTrue(stubRequestMethod.called,
        'didn\'t forward the corresponding request');
    });
    test('lockscreenslide-unlocking-start', function() {
      var stubRequestMethod = this.sinon.stub(slideWidget,
        'notifyUnlockingStart');
      slideWidget.handleEvent(
        new CustomEvent('lockscreenslide-unlocking-start'));
      assert.isTrue(stubRequestMethod.called,
        'didn\'t forward the corresponding request');
    });
    test('lockscreenslide-unlocking-stop', function() {
      var stubRequestMethod = this.sinon.stub(slideWidget,
        'notifyUnlockingStop');
      slideWidget.handleEvent(
        new CustomEvent('lockscreenslide-unlocking-stop'));
      assert.isTrue(stubRequestMethod.called,
        'didn\'t forward the corresponding request');
    });
  });

  suite('notifications', function() {
    test('locked: from anything to will-unlock', function() {
      var stubDeactivate = this.sinon.stub(slideWidget,
        'deactivate');
      slideWidget.notify({
        'type': 'stateChanged',
        'content': {
          'name': 'locked',
          'oldVal': 'locked',
          'newVal': 'will-unlock'
        }
      });
      assert.isTrue(stubDeactivate.called,
        'should deactivate itself but it didn\'t happen');
    });
  });

  suite('methods', function() {
    test('activate', function() {
      var stubInitSlide = this.sinon.stub(slideWidget,
        'initSlide');
      slideWidget.activate();
      assert.isTrue(stubInitSlide.called,
        'activated the widget but didn\'t initialize the sliding component');
    });
    test('initSlide', function() {
      var stubComponent = this.sinon.stub(window, 'LockScreenSlide');
      slideWidget.initSlide();
      assert.isTrue(stubComponent.called,
        'initSlide should instantiate a sliding component but ' +
        'it didn\'t happen');
    });
    test('requestInvokeCamera', function() {
      var stubRequest = this.sinon.stub(slideWidget.mediator, 'request');
      slideWidget.requestInvokeCamera();
      assert.isTrue(stubRequest.calledWithMatch(sinon.match(function(req) {
        return 'activity' === req.content.method &&
               'record' === req.content.detail.content.name &&
               'photos' === req.content.detail.content.data.type;
      })),
        'the request to invoke the camera was not an correct activity');
    });
    test('notifyUnlockingStop', function() {
      var stubPost = this.sinon.stub(slideWidget.mediator, 'post');
      slideWidget.notifyUnlockingStop();
      assert.isTrue(stubPost.calledWith('unlocking-stop'),
        'the unlocking-stop notification was\'t triggered even after the ' +
        'method got called');
    });
  });
});
