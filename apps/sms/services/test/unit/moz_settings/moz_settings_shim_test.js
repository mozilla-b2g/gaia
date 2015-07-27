/*global bridge,
         MockNavigatorSettings,
         MocksHelper,
         MozSettingsShim
*/

'use strict';

require('/services/test/unit/mock_bridge.js');
require('/services/js/bridge_service_mixin.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/services/js/moz_settings/moz_settings_shim.js');

var MocksHelperForAttachment = new MocksHelper([
  'bridge'
]).init();

suite('MozSettingsShim >', function() {
  var serviceStub;

  MocksHelperForAttachment.attachTestHelpers();

  setup(function() {
    serviceStub = sinon.stub({
      method: () => {},
      listen: () => {}
    });

    this.sinon.stub(bridge, 'service').returns(serviceStub);
  });

  test('service is correctly initialized with settings provided', function() {
    MozSettingsShim.init(MockNavigatorSettings);

    sinon.assert.calledOnce(bridge.service);
    sinon.assert.calledWith(bridge.service, 'moz-settings-shim');
  });

  test('service isn\'t initialized without settings', function() {
    this.sinon.stub(console, 'error');

    MozSettingsShim.init();

    sinon.assert.notCalled(bridge.service);
    sinon.assert.called(console.error);
  });

  suite('Settings methods >', function() {
    var lockStub;

    setup(function() {
      lockStub = sinon.stub({
        get: () => {},
        set: () => {}
      });
      this.sinon.stub(MockNavigatorSettings, 'createLock').returns(lockStub);
      MozSettingsShim.init(MockNavigatorSettings);
    });

    suite('get >', function() {

      test('returns value successfully', function(done) {
        var key = 'key';
        var value = 'result';
        lockStub.get.withArgs(key).returns(Promise.resolve(value));
        MozSettingsShim.get(key).then((result) => {
          sinon.assert.calledWith(lockStub.get, key);
          assert.equal(result, value);
        }).then(done, done);
      });

      test('returns reject while error', function(done) {
        var error = new Error('moz settings get error');
        lockStub.get.returns(Promise.reject(error));
        MozSettingsShim.get().then(() => {
          throw new Error('Should not be resolved');
        }, (result) => {
          sinon.assert.called(lockStub.get);
          assert.equal(result, error);
        }).then(done, done);
      });
    });

    suite('set >', function() {

      test('returns revolve successfully', function(done) {
        var settings = { 'key': 'value' };
        lockStub.set.withArgs(settings).returns(Promise.resolve());
        MozSettingsShim.set(settings).then(() => {
          sinon.assert.calledWith(lockStub.set, settings);
        }).then(done, done);
      });

      test('returns reject while error', function(done) {
        var error = new Error('moz settings set error');
        lockStub.set.returns(Promise.reject(error));
        MozSettingsShim.set().then(() => {
          throw new Error('Should not be resolved');
        }, (result) => {
          sinon.assert.called(lockStub.set);
          assert.equal(result, error);
        }).then(done, done);
      });
    });
  });
});
