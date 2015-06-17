/*global
  bridge,
  BridgeServiceMixin,
  MocksHelper
 */

'use strict';

require('/services/test/unit/mock_bridge.js');
require('/shared/test/unit/mocks/mocks_helper.js');

require('/services/js/bridge_service_mixin.js');

var mocksHelperForServiceMixin = new MocksHelper([
  'bridge'
]).init();

suite('BridgeServiceMixin >', function() {
  mocksHelperForServiceMixin.attachTestHelpers();

  var target, service;

  setup(function() {
    service = {
      method: sinon.stub(),
      stream: sinon.stub(),
      broadcast: sinon.stub()
    };

    target = {
      usefulMethod: sinon.stub(),
      usefulStream: sinon.stub()
    };

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
  });

  test('Methods and streams are exposed', function() {
    service.method.withArgs('usefulMethod').yield(1);

    sinon.assert.calledWith(target.usefulMethod, 1);
    sinon.assert.calledOn(target.usefulMethod, target);

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

});

