'use strict';

mocha.globals(['LockScreenMediator', 'LockScreenWidgetFactory',
               'LockScreenRouter', 'LockScreenBasicWidget',
               'LockScreenSlideWidget']);

requireApp('system/js/lockscreen/factory.js');

suite('system/LockScreenFactory >', function() {
  var originalSlideWidget,
      mockSlideWidget,
      mockMediator,
      factory;

  setup(function() {
    originalSlideWidget = window.LockScreenSlideWidget;
    mockMediator = function() {};
    mockSlideWidget = function() {};
    window.LockScreenSlideWidget = mockSlideWidget;
    factory = new window.LockScreenWidgetFactory(
      new mockMediator());
  });

  teardown(function() {
    window.LockScreenSlideWidget = originalSlideWidget;
  });

  test('launch', function() {
    // Can't stub a non-exist function so we need a mock before this.
    var stubWidget = this.sinon.stub(window, 'LockScreenSlideWidget');
    factory.configs.classes.Slide = stubWidget;
    factory.launch('Slide');
    assert.isTrue(stubWidget.called);
  });
});
