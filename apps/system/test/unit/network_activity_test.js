/* global BaseModule, MockLazyLoader, NetworkActivityIcon, MocksHelper */
'use strict';

requireApp('system/test/unit/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/network_activity_icon.js');
requireApp('system/js/network_activity.js');

var mocksForNetworkActivity = new MocksHelper([
  'LazyLoader'
]).init();

suite('system/NetworkActivity', function() {
  var subject, realHidden;
  mocksForNetworkActivity.attachTestHelpers();

  setup(function() {
    MockLazyLoader.mLoadRightAway = true;
    this.sinon.spy(MockLazyLoader, 'load');
    this.sinon.stub(document, 'getElementById')
        .returns(document.createElement('img'));
    subject = BaseModule.instantiate('NetworkActivity');
    subject.start();
  });

  suiteTeardown(function() {
    subject.stop();
  });

  test('Should lazy load icons', function() {
    assert.isTrue(MockLazyLoader.load.calledWith(
      ['js/network_activity_icon.js']));
  });

  suite('Icon toggle', function() {
    var isDocumentHidden;
    realHidden = Object.getOwnPropertyDescriptor(document, 'hidden');
    suiteSetup(function() {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: function() {
          return isDocumentHidden;
        }
      });
    });

    suiteTeardown(function() {
      if (realHidden) {
        Object.defineProperty(document, 'hidden', realHidden);
      } else {
        delete document.hidden;
      }
    });

    setup(function() {
      subject.icon = new NetworkActivityIcon(subject);
      this.sinon.stub(subject.icon, 'start');
      this.sinon.stub(subject.icon, 'stop');
    });

    test('Should toggle icon when visibility changes', function() {
      isDocumentHidden = false;
      window.dispatchEvent(new CustomEvent('visibilitychange'));
      assert.isTrue(subject.icon.start.called);
    });

    test('Should toggle icon when visibility changes', function() {
      isDocumentHidden = true;
      window.dispatchEvent(new CustomEvent('visibilitychange'));
      assert.isTrue(subject.icon.stop.called);
    });
  });

  suite('Icon update', function() {
    setup(function() {
      subject.icon = new NetworkActivityIcon(subject);
      this.sinon.stub(subject.icon, 'update');
    });

    test('Upload event should update the icon', function() {
      window.dispatchEvent(new CustomEvent('moznetworkupload'));
      assert.isTrue(subject.icon.update.called);
    });

    test('Download event should update the icon', function() {
      window.dispatchEvent(new CustomEvent('moznetworkdownload'));
      assert.isTrue(subject.icon.update.called);
    });

    test('Download event should update the icon', function() {
      window.dispatchEvent(new CustomEvent('moznetworkdownload'));
      assert.isTrue(subject.icon.update.called);
    });

    test('Should not update icon while stopped', function() {
      subject.stop();
      window.dispatchEvent(new CustomEvent('moznetworkdownload'));
      assert.isFalse(subject.icon.update.called);
    });
  });
});
