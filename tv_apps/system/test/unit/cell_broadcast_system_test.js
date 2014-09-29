'use strict';
/* global CarrierInfoNotifier */
/* global CellBroadcastSystem */
/* global MocksHelper */

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/js/carrier_info_notifier.js');
requireApp('system/js/cell_broadcast_system.js');
require('/shared/js/l10n.js');

var mocksForCellBroadcastSystem = new MocksHelper([
  'SettingsListener'
]).init();

suite('system/CellBroadcastSystem', function() {

  var subject;
  mocksForCellBroadcastSystem.attachTestHelpers();
  setup(function() {
    subject = new CellBroadcastSystem();
  });

  suite('settingsChangedHandler', function() {
    test('dispatches cellbroadcastmsgchanged event', function(done) {
      window.addEventListener('cellbroadcastmsgchanged', function() {
        done();
      });
      subject.settingsChangedHandler({
        settingValue: true
      });
    });
  });

  suite('show', function() {
    test('calls CarrierInfoNotifier', function() {
      var stub = this.sinon.stub(CarrierInfoNotifier, 'show');
      subject.show({
        message: {
          body: {}
        }
      });
      assert.ok(stub.calledOnce);
    });
  });
});
