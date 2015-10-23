/* globals TrackingNotice, MocksHelper, MockNavigatorSettings */

'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/system_dialog.js');
requireApp('system/js/tracking_notice.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/js/component_utils.js');
require('/shared/elements/gaia_switch/script.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

var mocksForTrackingNotice = new MocksHelper([
  'LazyLoader'
]).init();

const TRACKING_ENABLED = 'privacy.trackingprotection.enabled';
const TRACKING_SHOWN = 'privacy.trackingprotection.shown';

suite('Tracking notice', function() {
  var subject, container, realMozSettings;

  mocksForTrackingNotice.attachTestHelpers();

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    MockNavigatorSettings.mSetup();
    MockNavigatorSettings.mSyncRepliesOnly = true;
    container = document.createElement('div');
    document.body.appendChild(container);

    TrackingNotice.prototype.containerElement = container;
  });

  teardown(function() {
    document.body.removeChild(container);
    subject && subject.destroy();
  });

  suite('initialization', function() {
    setup(function() {
      this.sinon.spy(TrackingNotice.prototype, 'render');
      this.sinon.stub(TrackingNotice.prototype, 'publish');
    });

    test('it renders the dialog if not shown', function() {
      subject = new TrackingNotice();
      assert.isTrue(subject.render.called);
    });

    test('it listens on appopened event', function() {
      var listenerStub = this.sinon.stub(window, 'addEventListener');
      subject = new TrackingNotice();
      assert.isTrue(listenerStub.calledWith('appopened'));
    });
  });

  suite('show', function() {
    setup(function() {
      subject = new TrackingNotice();
      this.sinon.stub(subject, 'publish');
    });

    test('shows the dialog', function() {
      subject.show();
      assert.isFalse(subject.element.classList.contains('hidden'));
      assert.isTrue(subject.publish.calledWith('show'));
    });

    test('updates the switch to match the current settings value', function() {
      assert.isFalse(subject.setting.checked);
      MockNavigatorSettings.mSet({
        [TRACKING_ENABLED]: true
      });
      subject.show();
      MockNavigatorSettings.mReplyToRequests();
      assert.isTrue(subject.setting.checked);
    });
  });

  suite('hide', function() {
    setup(function() {
      subject = new TrackingNotice();
      this.sinon.stub(subject, 'publish');
    });

    test('hides the dialog', function() {
      subject.hide();
      assert.isTrue(subject.element.classList.contains('hidden'));
      assert.isTrue(subject.publish.calledWith('hide'));
    });
  });

  suite('confirmNotice', function() {
    setup(function() {
      subject = new TrackingNotice();
      this.sinon.stub(subject, 'destroy');
    });

    test('saves the flag for not showing again', function() {
      subject.confirmNotice();
      assert.isTrue(MockNavigatorSettings.mSettings[TRACKING_SHOWN]);
    });

    test('hides the dialog', function() {
      subject.show();
      subject.confirmNotice();
      assert.isTrue(subject.destroy.called);
    });
  });

  suite('onAppopened', function() {
    var fakeEvent;

    setup(function() {
      subject = new TrackingNotice();
      this.sinon.stub(subject, 'show');
      fakeEvent = {
        detail: {
          isBrowser: function() {},
          isSearch: function() {},
          element: document.createElement('div')
        }
      };
    });

    test('does nothing if is not a search or the browser app', function() {
      this.sinon.stub(fakeEvent.detail, 'isBrowser').returns(false);
      this.sinon.stub(fakeEvent.detail, 'isSearch').returns(false);
      window.dispatchEvent(new CustomEvent('appopened', fakeEvent));
      assert.isFalse(subject.show.called);
    });

    test('opens the dialog if Browser app', function() {
      this.sinon.stub(fakeEvent.detail, 'isBrowser').returns(true);
      this.sinon.stub(fakeEvent.detail, 'isSearch').returns(false);
      window.dispatchEvent(new CustomEvent('appopened', fakeEvent));
      assert.isTrue(subject.show.called);
    });

    test('opens the dialog if search app', function() {
      this.sinon.stub(fakeEvent.detail, 'isBrowser').returns(false);
      this.sinon.stub(fakeEvent.detail, 'isSearch').returns(true);
      window.dispatchEvent(new CustomEvent('appopened', fakeEvent));
      assert.isTrue(subject.show.called);
    });
  });
});
