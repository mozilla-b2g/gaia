'use strict';

/* global Dashboard */

require('/bower_components/evt/index.js');
require('/shared/js/smart-screen/key_navigation_adapter.js');
require('/js/dashboard.js');

suite('Dashboard', function() {
  var dashboard;

  setup(function() {
    dashboard = new Dashboard();
    dashboard.init();
  });

  test('should initialize keyNavigationAdapter', function() {
    assert.isDefined(dashboard.keyNavigationAdapter);
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
});
