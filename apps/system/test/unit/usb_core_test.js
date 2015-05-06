/* global MocksHelper, BaseModule, MockLazyLoader, UsbIcon */
'use strict';

requireApp('system/test/unit/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/usb_icon.js');
requireApp('system/js/usb_core.js');

var mocksForUsbCore = new MocksHelper([
  'LazyLoader'
]).init();

suite('system/UsbCore', function() {
  var subject;
  mocksForUsbCore.attachTestHelpers();

  setup(function() {
    MockLazyLoader.mLoadRightAway = true;
    subject = BaseModule.instantiate('UsbCore');
    this.sinon.spy(MockLazyLoader, 'load');
    subject.start();
    subject.icon = new UsbIcon(subject);
    this.sinon.stub(subject.icon, 'update');
  });

  teardown(function() {
    subject.stop();
  });

  test('Should lazy load icon', function() {
    assert.isTrue(MockLazyLoader.load.calledWith(['js/usb_icon.js']));
  });

  test('Should be active if volume state changed to true', function() {
    window.dispatchEvent(new CustomEvent('mozChromeEvent', {
      detail: {
        type: 'volume-state-changed',
        active: true
      }
    }));
    assert.isTrue(subject.umsActive);
    assert.isTrue(subject.icon.update.called);
  });

  test('Should be inactive if volume state changed to false', function() {
    window.dispatchEvent(new CustomEvent('mozChromeEvent', {
      detail: {
        type: 'volume-state-changed',
        active: true
      }
    }));
    window.dispatchEvent(new CustomEvent('mozChromeEvent', {
      detail: {
        type: 'volume-state-changed',
        active: false
      }
    }));
    assert.isFalse(subject.umsActive);
    assert.isTrue(subject.icon.update.called);
  });
});
