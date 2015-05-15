'use strict';

/* global Dashboard */

require('/bower_components/evt/index.js');
require('/shared/js/smart-screen/key_navigation_adapter.js');
require('/js/dashboard.js');

suite('Dashboard', function() {
  var dashboard;
  var element;

  setup(function() {
    element = document.createElement('div');
    element.id = 'main-section';
    document.body.appendChild(element);
    dashboard = new Dashboard();
    dashboard.init();
  });

  teardown(function() {
    document.body.removeChild(element);
  });

  test('should initialize keyNavigationAdapter', function() {
    assert.isDefined(dashboard.mainSection);
  });

  test('should change #main-section dataset.activeDirection to up ' +
       'when dashboard.onMove is called with up', function() {
    dashboard.onMove('up');
    assert.equal(dashboard.mainSection.dataset.activeDirection, 'up');
    dashboard.onMove('down');
    assert.equal(dashboard.mainSection.dataset.activeDirection, '');
  });

  test('should change #main-section dataset.activeDirection to right ' +
       'when dashboard.onMove is called with right', function() {
    dashboard.onMove('right');
    assert.equal(dashboard.mainSection.dataset.activeDirection, 'right');
    dashboard.onMove('left');
    assert.equal(dashboard.mainSection.dataset.activeDirection, '');
  });

  test('should change #main-section dataset.activeDirection to down ' +
       'when dashboard.onMove is called with down', function() {
    dashboard.onMove('down');
    assert.equal(dashboard.mainSection.dataset.activeDirection, 'down');
    dashboard.onMove('up');
    assert.equal(dashboard.mainSection.dataset.activeDirection, '');
  });

  test('should change #main-section dataset.activeDirection to left ' +
       'when dashboard.onMove is called with left', function() {
    dashboard.onMove('left');
    assert.equal(dashboard.mainSection.dataset.activeDirection, 'left');
    dashboard.onMove('right');
    assert.equal(dashboard.mainSection.dataset.activeDirection, '');
  });

  test('should not change #main-section dataset.activeDirection ' +
       'when activeDirection is up and dashboard.onMove is called with up',
    function () {
      dashboard.onMove('up');
      assert.equal(dashboard.mainSection.dataset.activeDirection, 'up');
      dashboard.onMove('up');
      assert.equal(dashboard.mainSection.dataset.activeDirection, 'up');
  });

  test('should not change #main-section dataset.activeDirection when ' +
      'activeDirection is up and dashboard.onMove is called with right or left',
    function () {
      dashboard.onMove('up');
      assert.equal(dashboard.mainSection.dataset.activeDirection, 'up');
      dashboard.onMove('right');
      assert.equal(dashboard.mainSection.dataset.activeDirection, 'up');
      dashboard.onMove('left');
      assert.equal(dashboard.mainSection.dataset.activeDirection, 'up');
  });
});
