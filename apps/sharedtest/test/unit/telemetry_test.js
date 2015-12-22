'use strict';

/* global TelemetryRequest, MockNavigatorMozWifiManager,
          MockNavigatorMozTelephony */

require('/shared/js/telemetry.js');
require('/shared/test/unit/mocks/mock_navigator_moz_wifi_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');


function stubDial(self, retVal) {
  self.sinon.stub(navigator.mozTelephony, 'dial', function() {
    return Promise.resolve({
      result: Promise.resolve({
        success: true,
        serviceCode: 'scImei',
        statusMessage: retVal
      })
    });
  });
}

suite('Telemetry:', function() {
  var xhr, XHR;
  var realMozTelephony, realMozWifiManager;

  suiteSetup(function() {
    realMozTelephony = navigator.mozTelephony;
    realMozWifiManager = navigator.mozWifiManager;

    navigator.mozTelephony = MockNavigatorMozTelephony;
    navigator.mozWifiManager = MockNavigatorMozWifiManager;

    XHR = sinon.useFakeXMLHttpRequest();
    XHR.onCreate = function(instance) { xhr = instance; };
  });

  suiteTeardown(function() {
    navigator.mozTelephony = realMozTelephony;
    navigator.mozWifiManager = realMozWifiManager;

    XHR.restore();
  });

  test('ctor required args', function() {
    var x;
    assert.throws(function() { x = new TelemetryRequest(); });
    assert.throws(function() { x = new TelemetryRequest({ deviceID: 'x' }); });
    assert.throws(function() { x = new TelemetryRequest({ reason: 'x' }); });

    assert.doesNotThrow(function() {
      x = new TelemetryRequest({ reason: 'x', deviceID: 'x' });
    });
  });

  suite('request args', function() {
    var req;
    setup(function() {
      req = new TelemetryRequest({
        deviceID: 1,
        reason: 'a reason',
        ver: 3,
        appName: '+name',
        appUpdateChannel: 'channel',
        appBuildID: 'buildID',
        appVersion: 'version',
        url: 'http://foobar'
      });
    });

    test('sets packet version', function() {
      assert.equal(req.packet.ver, 3);
    });

    test('fills info', function() {
      assert.ok(req.info);
      assert.equal(req.info.reason, 'a reason');
      assert.equal(req.info.appName, '+name');
      assert.equal(req.info.appUpdateChannel, 'channel');
      assert.equal(req.info.appVersion, 'version');
      assert.equal(req.info.appBuildID, 'buildID');
    });

    test('builds proper URL', function() {
      assert.equal(req.url,
        'http://foobar/1/a%20reason/%2Bname/version/channel/buildID');
    });
  });

  test('copies info', function() {
    var req = new TelemetryRequest({
      deviceID: 1,
      reason: 'reason'
    }, { x: '1', y: '2' });

    assert.deepEqual(req.info, req.packet.info);
    assert.equal(req.info.x, '1');
    assert.equal(req.info.y, '2');
  });

  suite('send', function() {
    var req, clock;
    setup(function() {
      req = new TelemetryRequest({
        deviceID: 1,
        reason: 'reason',
        url: 'http://foobar'
      }, { x: '1', y: '2' });

      clock = this.sinon.useFakeTimers();
    });

    test('sends proper JSON request', function() {
      req.send();

      assert.ok(xhr);
      assert.equal(xhr.method, 'POST');

      var url = new URL(xhr.url);
      assert.equal(url.protocol, 'http:');
      assert.equal(url.hostname, 'foobar');
      assert.ok(url.pathname.indexOf('/1/reason') === 0);

      var payload = JSON.parse(xhr.requestBody);
      assert.ok(payload);
      assert.deepEqual(payload, req.packet);
    });

    test('calls onload', function() {
      var loaded = sinon.spy();
      req.send({
        onload: loaded
      });

      xhr.respond(200, 'OK');
      assert.ok(loaded.called);
    });

    test('sets error callbacks', function() {
      var xhr = req.send({
        ontimeout: function(){},
        onerror: function(){},
        onabort: function(){}
      });

      assert.ok(xhr.ontimeout);
      assert.ok(xhr.onerror);
      assert.ok(xhr.onabort);
    });
  });

  suite('getDeviceID', function () {

    setup(function() {
    });

    teardown(function() {
    });

    test('Should resolve with hash identifier', function() {
      MockNavigatorMozWifiManager.setMacAddress('00:0a:f5:cb:63:dc');
      // Simulate a 15 digit IMEI
      stubDial(this, '012345678901234');
      TelemetryRequest.getDeviceID().then(function(value) {
        assert.equal(value, '5E375E21');
      }).catch(function(value) {
        assert(0);
      });
    });

    test('Should reject if dialing fails', function (done) {
      this.sinon.stub(navigator.mozTelephony, 'dial', function () {
        return Promise.resolve({
          result: Promise.reject({
            success: false,
            statusMessage: 'error'
          })
        });
      });

      TelemetryRequest.getDeviceID().then(function(value) {
      }).catch(function(value) {
        assert.equal(value.statusMessage, 'error');
        done();
      });
    });
  });
});
