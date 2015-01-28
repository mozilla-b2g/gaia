'use strict';

/* global TelemetryRequest */

require('/shared/js/telemetry.js');

suite('Telemetry:', function() {
  var xhr, XHR;

  suiteSetup(function() {
    XHR = sinon.useFakeXMLHttpRequest();
    XHR.onCreate = function(instance) { xhr = instance; };
  });

  suiteTeardown(function() {
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
});
