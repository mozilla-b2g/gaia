/* global MockNavigatorMozWifiManager */
'use strict';

requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_wifi_manager.js');

suite('WifiItem', function() {
  var subject;
  var element;
  var realWifiManager;

  var map = {
    '*': {
      'modules/wifi_context': 'MockWifiContext'
    }
  };

  var modules = [
    'panels/root/wifi_item'
  ];

  setup(function(done) {
    // Define MockAppStorage
    this.MockWifiContext = {
      isMock: true,
      wifiStatusText: {id: 'disabled'},
      addEventListener: function() {},
      removeEventListener: function() {}
    };

    define('MockWifiContext', function() {
      return this.MockWifiContext;
    }.bind(this));

    var requireCtx = testRequire([], map, function() {});
    requireCtx(modules, function(WifiItem) {
      realWifiManager = navigator.mozWifiManager;
      navigator.mozWifiManager = MockNavigatorMozWifiManager;
      MockNavigatorMozWifiManager.mSetup();
      element = document.createElement('small');
      subject = WifiItem(element);
      done();
    });
  });

  teardown(function() {
    navigator.mozWifiManager = realWifiManager;
  });

  test('when enabled = true', function() {
    this.sinon.stub(this.MockWifiContext, 'addEventListener');
    this.sinon.stub(subject, '_boundUpdateWifiDesc');
    subject.enabled = true;

    sinon.assert.called(subject._boundUpdateWifiDesc);
    this.MockWifiContext.addEventListener.calledWith(
      'wifiStatusTextChange', subject._boundUpdateWifiDesc
    );
    // assert.isTrue(this.MockAppStorage.observe.calledWith('freeSize',
      // this.subject._boundUpdateAppFreeSpace));
  });

  test('when enabled = false', function() {
    this.sinon.stub(this.MockWifiContext, 'removeEventListener');
    this.sinon.stub(subject, '_boundUpdateWifiDesc');
    // The default enabled value is false. Set to true first.
    subject._enabled = true;
    subject.enabled = false;

    this.MockWifiContext.removeEventListener.calledWith(
      'wifiStatusTextChange', subject._boundUpdateWifiDesc
    );
  });

  test('when _updateWifiDesc', function() {
    this.sinon.spy(window, 'dispatchEvent');
    subject._updateWifiDesc(element);

    assert.ok(window.dispatchEvent.called);
  });
});
