/* global MocksHelper, BaseModule, MockLazyLoader */
'use strict';

requireApp('system/test/unit/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/geolocation_icon.js');
requireApp('system/js/geolocation_core.js');

var mocksForGeolocationCore = new MocksHelper([
  'LazyLoader'
]).init();

suite('system/GeolocationCore', function() {
  var subject;
  mocksForGeolocationCore.attachTestHelpers();

  setup(function() {
    MockLazyLoader.mLoadRightAway = true;
    subject = BaseModule.instantiate('GeolocationCore');
    this.sinon.spy(MockLazyLoader, 'load');
    subject.start();
  });

  teardown(function() {
    subject.stop();
  });

  test('Should lazy load icon', function() {
    assert.isTrue(MockLazyLoader.load.calledWith(['js/geolocation_icon.js']));
  });

  suite('Update icon', function() {
    setup(function() {
      this.sinon.stub(subject.icon, 'update');
    });

    test('Should be active if geolocation state changed to true', function() {
      window.dispatchEvent(new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'geolocation-status',
          active: true
        }
      }));
      assert.isTrue(subject.active);
      assert.isTrue(subject.icon.update.called);
    });

    test('Should be inactive if state changed to false', function() {
      window.dispatchEvent(new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'geolocation-status',
          active: true
        }
      }));
      window.dispatchEvent(new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'geolocation-status',
          active: false
        }
      }));
      assert.isFalse(subject.active);
      assert.isTrue(subject.icon.update.called);
    });
  });
});
