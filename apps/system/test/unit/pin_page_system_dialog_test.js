/* globals MockLazyLoader, PinPageSystemDialog, SystemDialog, Service */

'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/system_dialog.js');
requireApp('system/js/pin_page_system_dialog.js');
require('/shared/js/component_utils.js');
require('/shared/js/lazy_loader.js');
require('/shared/elements/gaia_pin_card/script.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

suite('Pin Page dialog', function() {
  var subject, container, stubPin, stubPinSite, realLazyLoader, toastStub;

  setup(function() {
    realLazyLoader = window.LazyLoader;
    window.LazyLoader = MockLazyLoader;
    stubPin = this.sinon.stub();
    stubPinSite = this.sinon.stub();
    toastStub = document.createElement('div');
    toastStub.show = this.sinon.stub();

    container = document.createElement('div');
    document.body.appendChild(container);

    PinPageSystemDialog.prototype.containerElement = container;

    var pElement = document.createElement('p');
    this.sinon.stub(document, 'createElement', function(name) {
      if (name === 'gaia-toast') {
        return toastStub;
      }

      return pElement;
    });

    this.sinon.stub(Service, 'query', function(name) {
      if (name === 'getTopMostWindow') {
        return {
          appChrome: {
            pinPage: stubPin,
            pinSite: stubPinSite
          }
        };
      }
    });
  });

  teardown(function() {
    document.body.removeChild(container);
    window.LazyLoader = realLazyLoader;
    subject && subject.destroy();
  });

  suite('initialization', function() {
    setup(function() {
      this.sinon.spy(PinPageSystemDialog.prototype, 'render');
      this.sinon.stub(PinPageSystemDialog.prototype, 'publish');
      subject = new PinPageSystemDialog();
    });

    test('it renders the view', function() {
      assert.isTrue(subject.render.called);
    });

    test('dispatches a created event', function() {
      assert.isTrue(subject.publish.calledWith('created'));
    });

    test('reuses the same instance on 2 creations', function() {
      var subject2 = new PinPageSystemDialog();
      assert.equal(subject, subject2);
    });
  });

  suite('show', function() {
    var data;

    setup(function() {
      data = {
        url: 'http://test.com'
      };
      subject = new PinPageSystemDialog();
      this.sinon.stub(SystemDialog.prototype, 'show');
    });

    test('updates the url', function() {
      subject.show(data);
      assert.equal(subject.pinURL.textContent, data.url);
    });

    test('shows the dialog', function() {
      subject.show(data);
      assert.isTrue(SystemDialog.prototype.show.called);
      assert.isTrue(subject._visible);
    });
  });

  suite('hide', function() {
    setup(function() {
      subject = new PinPageSystemDialog();
      this.sinon.stub(SystemDialog.prototype, 'hide');
    });

    test('hides the dialog', function() {
      subject.hide();
      assert.isTrue(SystemDialog.prototype.hide.called);
      assert.isFalse(subject._visible);
    });
  });

  suite('save', function() {
    setup(function() {
      subject = new PinPageSystemDialog();
      this.sinon.stub(subject, 'close');
    });

    test('saves the pinned url', function() {
      subject.pinButton.dispatchEvent(new CustomEvent('click'));
      assert.isTrue(stubPin.called);
    });

    test('shows the banner', function() {
      subject.pinButton.dispatchEvent(new CustomEvent('click'));
      assert.isTrue(toastStub.show.called);
    });

    test('saves the pinned site', function() {
      subject.pinSiteButton.dispatchEvent(new CustomEvent('click'));
      assert.isTrue(stubPinSite.called);
    });

    test('shows the banner', function() {
      subject.pinSiteButton.dispatchEvent(new CustomEvent('click'));
      assert.isTrue(toastStub.show.called);
    });
  });

  suite('destroy', function() {
    setup(function() {
      subject = new PinPageSystemDialog();
    });

    test('removes the element from the container', function() {
      assert.ok(container.querySelector('#pin-page-dialog'));
      subject.destroy();
      assert.isNull(container.querySelector('#pin-page-dialog'));
      subject = null;
    });
  });
});
