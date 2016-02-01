/* globals PinPageSystemDialog, SystemDialog, Service,
   MocksHelper, BookmarksDatabase, process */

'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/system_dialog.js');
requireApp('system/js/pin_page_system_dialog.js');
require('/shared/js/component_utils.js');
require('/shared/js/lazy_loader.js');
require('/shared/elements/gaia_pin_card/script.js');
requireApp('system/test/unit/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_bookmarks_database.js');

var mocksForPinDialog = new MocksHelper([
  'BookmarksDatabase', 'LazyLoader'
]).init();

suite('Pin Page dialog', function() {
  var subject, container, stubPin, stubPinSite, stubUnpinSite,
      toastStub, bookmark, inScopeStub, scope, mockPin;

  mocksForPinDialog.attachTestHelpers();

  setup(function() {
    bookmark = null;
    scope = 'test';
    stubPin = this.sinon.stub();
    stubPinSite = this.sinon.stub();
    stubUnpinSite = this.sinon.stub();
    inScopeStub = this.sinon.stub();
    toastStub = document.createElement('div');
    toastStub.show = this.sinon.stub();

    mockPin = {
      url: 'http://test.com',
      meta: {}
    };

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
          inScope: inScopeStub,
          appChrome: {
            pinPage: stubPin,
            pinSite: stubPinSite,
            unpinSite: stubPinSite
          }
        };
      }

      if (name === 'getScope') {
        return scope;
      }
    });

    this.sinon.stub(BookmarksDatabase, 'get', () => {
      return Promise.resolve(bookmark);
    });
  });

  teardown(function() {
    document.body.removeChild(container);
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
  });

  suite('requestopen', function() {
    setup(function() {
      this.sinon.stub(PinPageSystemDialog.prototype, 'publish');
      this.sinon.stub(SystemDialog.prototype, 'show');
      subject = new PinPageSystemDialog();
      subject.start();
      subject.element.open = this.sinon.stub();
    });

    test('shows the dialog when requestopen', function() {
      window.dispatchEvent(new CustomEvent('pin-page-dialog-requestopen', {
        detail: mockPin
      }));
      assert.isTrue(SystemDialog.prototype.show.called);
      assert.isTrue(subject.element.open.called);
      assert.isTrue(subject.publish.calledWith('started'));
    });

    test('does not show the dialog when requestopen and stopped', function() {
      subject.stop();
      window.dispatchEvent(new CustomEvent('pin-page-dialog-requestopen', {
        detail: mockPin
      }));
      assert.isFalse(SystemDialog.prototype.show.called);
      assert.isFalse(subject.element.open.called);
      assert.isTrue(subject.publish.calledWith('stopped'));
    });
  });

  suite('show', function() {
    var data;

    setup(function() {
      data = mockPin;
      subject = new PinPageSystemDialog();
      this.sinon.stub(SystemDialog.prototype, 'show');
      subject.element.open = this.sinon.stub();
    });

    test('updates the title', function() {
      data.title = 'title';
      subject.show(data);
      assert.equal(subject.pageTitle.textContent, data.title);
    });

    test('shows the dialog', function() {
      subject.show(data);
      assert.isTrue(SystemDialog.prototype.show.called);
      assert.isTrue(subject._visible);
      assert.equal(subject.pinSiteButton.dataset.action, 'pin-site');
    });

    suite('show unpin button', function() {
      test('unpin the site exact url', function() {
        bookmark = {url: 'test'};
        subject.show(data);
        process.nextTick(function() {
          assert.equal(subject.pinSiteButton.dataset.action, 'unpin-site');
        });
      });

      test('unpin the site in scope', function() {
        inScopeStub.returns(true);
        subject.show(data);
        process.nextTick(function() {
          assert.equal(subject.pinSiteButton.dataset.action, 'unpin-site');
        });
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
        subject.element.close = this.sinon.stub();
      });

      test('saves the pinned url', function() {
        subject.pinPageButton.dispatchEvent(new CustomEvent('click'));
        assert.isTrue(stubPin.called);
      });

      test('saves the pinned site', function() {
        subject.pinSiteButton.dispatchEvent(new CustomEvent('click'));
        assert.isTrue(stubPinSite.called);
        assert.isFalse(stubUnpinSite.called);
      });
    });
  });

});
