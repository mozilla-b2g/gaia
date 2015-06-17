'use strict';

/* global Dashboard, MocksHelper */

require('/bower_components/evt/index.js');
require('/shared/js/smart-screen/key_navigation_adapter.js');
require('mock_app_widget.js');
require('mock_digital_clock.js');
require('/js/dashboard.js');

var MocksHelperForUnitTest = new MocksHelper([
  'AppWidget',
  'DigitalClock'
]).init();

suite('Dashboard', function() {
  var dashboard;
  var mainSection;
  var clock;

  MocksHelperForUnitTest.attachTestHelpers();

  setup(function() {
    clock = this.sinon.useFakeTimers();

    mainSection = document.createElement('div');
    mainSection.id = 'main-section';
    document.body.appendChild(mainSection);

    dashboard = new Dashboard();
    dashboard.init();
  });

  teardown(function() {
    document.body.removeChild(mainSection);
  });

  test('should initialize keyNavigationAdapter and digitalClock', function() {
    assert.isDefined(dashboard.keyNavigationAdapter);
    assert.isDefined(dashboard.digitalClock);
  });

  test('should change body dataset.activeDirection ' +
       'to up when dashboard.onMove is called with up', function() {
    dashboard.onMove('up');
    assert.equal(document.body.dataset.activeDirection, 'up');
    dashboard.onMove('down');
    assert.equal(document.body.dataset.activeDirection, '');
  });

  test('should change body dataset.activeDirection ' +
       'to right when dashboard.onMove is called with right', function() {
    dashboard.onMove('right');
    assert.equal(document.body.dataset.activeDirection, 'right');
    dashboard.onMove('left');
    assert.equal(document.body.dataset.activeDirection, '');
  });

  test('should change body dataset.activeDirection ' +
       'to down when dashboard.onMove is called with down', function() {
    dashboard.onMove('down');
    assert.equal(document.body.dataset.activeDirection, 'down');
    dashboard.onMove('up');
    assert.equal(document.body.dataset.activeDirection, '');
  });

  test('should change body dataset.activeDirection ' +
       'to left when dashboard.onMove is called with left', function() {
    dashboard.onMove('left');
    assert.equal(document.body.dataset.activeDirection, 'left');
    dashboard.onMove('right');
    assert.equal(document.body.dataset.activeDirection, '');
  });

  test('should not change body dataset.activeDirection ' +
       'when activeDirection is up and dashboard.onMove is ' +
       'called with up',function () {
    dashboard.onMove('up');
    assert.equal(document.body.dataset.activeDirection, 'up');
    dashboard.onMove('up');
    assert.equal(document.body.dataset.activeDirection, 'up');
  });

  test('should not change body dataset.activeDirection ' +
       'when activeDirection is up and dashboard.onMove is ' +
       'called with right or left',function () {
    dashboard.onMove('up');
    assert.equal(document.body.dataset.activeDirection, 'up');
    dashboard.onMove('right');
    assert.equal(document.body.dataset.activeDirection, 'up');
    dashboard.onMove('left');
    assert.equal(document.body.dataset.activeDirection, 'up');
  });

  test('should expand bottom widget when moving down,' +
       ' then shrink when moving back', function() {
    dashboard.onMove('down');
    assert.isTrue(
                dashboard.widgets.down.toggleExpand.withArgs(true).calledOnce);
    dashboard.onMove('up');
    assert.isTrue(
                dashboard.widgets.down.toggleExpand.withArgs(false).calledOnce);
  });

  test('should focus on bottom widget when moving down', function () {
    var mainSectionFocusSpy = this.sinon.spy(mainSection, 'focus');
    dashboard.onMove('down');
    assert.isTrue(mainSectionFocusSpy.calledOnce);
    clock.tick();
    assert.isTrue(dashboard.widgets.down.focus.calledOnce);
  });

  suite('visibilityChange >', function() {
    function setFakeVisibility(value) {
      Object.defineProperty(document, 'visibilityState', {
        get: function(){
          return value;
        },
        configurable: true
      });
    }

    teardown(function() {
      delete document.visibilityState;
    });

    test('should move to center if visibility becomes hidden', function() {
      dashboard.onMove('down');
      setFakeVisibility('hidden');
      var mainSectionFocusSpy = this.sinon.spy(mainSection, 'focus');
      dashboard.onVisibilityChange();

      assert.equal(document.body.dataset.activeDirection, '');
      assert.isTrue(mainSectionFocusSpy.calledOnce);
    });

    test('should toggle body class "expand" with visibility', function() {
      setFakeVisibility('hidden');
      dashboard.onVisibilityChange();
      assert.isFalse(document.body.classList.contains('active'));

      setFakeVisibility('visible');
      dashboard.onVisibilityChange();
      assert.isTrue(document.body.classList.contains('active'));
    });
  });
});
