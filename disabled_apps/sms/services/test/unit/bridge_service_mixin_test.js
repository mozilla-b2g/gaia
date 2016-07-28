/*global
  bridge,
  BridgeServiceMixin,
  MocksHelper,
  streamService
 */

'use strict';

require('/services/test/unit/mock_bridge.js');
require('/shared/test/unit/mocks/mocks_helper.js');

require('/services/js/bridge_service_mixin.js');

var mocksHelperForServiceMixin = new MocksHelper([
  'bridge',
  'streamService'
]).init();

suite('BridgeServiceMixin >', function() {
  mocksHelperForServiceMixin.attachTestHelpers();

  var target, service;

  setup(function() {
    service = sinon.stub({
      method() {},
      stream() {},
      broadcast() {},
      listen() {},
      on() {},
      plugin() {}
    });

    target = sinon.stub({
      usefulMethod() {},
      usefulStream() {}
    });

    var methods = ['usefulMethod'];
    var streams = ['usefulStream'];
    var events = ['useful-event'];
    var name = 'my-service';

    this.sinon.stub(bridge, 'service').withArgs(name).returns(service);

    BridgeServiceMixin.mixin(
      target, name,
      { methods, streams, events }
    );

    target.initService();
  });

  test('Service is exposed', function() {
    sinon.assert.calledWith(bridge.service, 'my-service');
    sinon.assert.calledOnce(service.listen);
    // Does not subscribe for any bridge event if target does not need it.
    sinon.assert.notCalled(service.on);
  });

  test('Methods and streams are exposed', function() {
    service.method.withArgs('usefulMethod').yield(1);

    sinon.assert.calledWith(target.usefulMethod, 1);
    sinon.assert.calledOn(target.usefulMethod, target);

    sinon.assert.calledWith(service.plugin, streamService);

    service.stream.withArgs('usefulStream').yield(2);
    sinon.assert.calledWith(target.usefulStream, 2);
    sinon.assert.calledOn(target.usefulStream, target);
  });

  test('Events are properly checked', function() {
    var data = {};
    target.broadcast('useful-event', data);
    sinon.assert.calledWith(service.broadcast, 'useful-event', data);

    assert.throws(() => target.broadcast('unknown-event'));
  });

  test('subscribes to "connected" event if target has corresponding handler',
  function() {
    var newTarget = sinon.stub({
      usefulMethod() {},
      onConnected() {}
    });

    BridgeServiceMixin.mixin(
      newTarget, 'my-service', { methods: ['usefulMethod'] }
    );

    newTarget.initService();

    sinon.assert.calledOnce(service.on);
    sinon.assert.calledWith(service.on, 'connected');
    sinon.assert.notCalled(newTarget.onConnected);

    service.on.withArgs('connected').yield();
    sinon.assert.calledOnce(newTarget.onConnected);

    service.on.withArgs('connected').yield();
    sinon.assert.calledTwice(newTarget.onConnected);
  });
});

