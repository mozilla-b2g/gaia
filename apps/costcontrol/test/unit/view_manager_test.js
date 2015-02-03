/* global ViewManager, MocksHelper, LazyLoader */

'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');

require('/test/unit/mock_date.js');
require('/test/unit/mock_debug.js');
require('/test/unit/mock_moz_l10n.js');
require('/js/common.js');
require('/js/utils/toolkit.js');
require('/js/view_manager.js');

var unitTestsMockHelper = new MocksHelper([
  'LazyLoader'
]).init();

suite('ViewManager suite >', function() {
  unitTestsMockHelper.attachTestHelpers();

  var realMozL10n, viewManager;
  var view1, view2;

  if (!window.navigator.mozL10n) {
    window.navigator.mozL10n = null;
  }

  suiteSetup(function() {
    realMozL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = window.MockMozL10n;

    viewManager = new ViewManager();

    view1 = document.createElement('div');
    view1.id = 'view-1';

    view2 = document.createElement('div');
    view2.id = 'view-2';

    document.body.appendChild(view1);
    document.body.appendChild(view2);
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realMozL10n;

    document.body.removeChild(view1);
    document.body.removeChild(view2);
  });

  suite('Basic tests >', function() {
    var realLoadPanel;

    setup(function() {
      realLoadPanel = viewManager.loadPanel;
      viewManager.loadPanel = sinon.spy();
    });

    teardown(function() {
      viewManager.loadPanel = realLoadPanel;
    });

    test('Check if a view is a tab', function() {
      viewManager._tabs['is-a-tab'] = {};

      assert.ok(viewManager._isTab('is-a-tab'));
      assert.ok(!viewManager._isTab('not-a-tab'));
    });

    test('Change to a new view', function() {
      viewManager.changeViewTo('view-1');
      assert.ok(viewManager.loadPanel.calledWith(view1));
    });

    test('Trigger viewchanged event when changing to a new view',
      function(done) {
        viewManager.loadPanel = realLoadPanel;

        window.addEventListener('viewchanged',
          function onviewchanged(evt) {
            window.removeEventListener('viewchanged', onviewchanged);
            assert.equal(evt.detail.id, 'view-1');
            done();
          }
        );

        viewManager.changeViewTo('view-1');
      }
    );

    test('Pass parameters when changing to a new view',
      function(done) {
        viewManager.loadPanel = realLoadPanel;

        window.addEventListener('viewchanged',
          function onviewchanged(evt) {
            window.removeEventListener('viewchanged', onviewchanged);
            assert.equal(evt.detail.id, 'view-2');
            assert.equal(evt.detail.params.foo, 'bar');
            done();
          }
        );

        viewManager.changeViewTo('view-2?foo=bar');
      }
    );

    test('Obscured view gets "behind" class',
      function(done) {
        viewManager.loadPanel = realLoadPanel;
        viewManager.changeViewTo('view-1', '#view-2', function() {
          assert.ok(view2.classList.contains('behind'));
          viewManager.closeCurrentView();
          assert.ok(!view2.classList.contains('behind'));
          done();
        });
      }
    );
  });

  suite('loadPanel >', function() {
    var panel, callbackStub;

    function fillPanelWithScriptLinks(panel) {
      return [1, 2, 3].map((number) => {
        var scriptLinkNode = document.createElement('script');
        scriptLinkNode.src = 'app://script-' + number + '/';
        scriptLinkNode.type = 'text/javascript';
        panel.appendChild(scriptLinkNode);

        return scriptLinkNode;
      });
    }

    function fillPanelWithStyleLinks(panel) {
      return [1, 2, 3].map((number) => {
        var styleLinkNode = document.createElement('link');
        styleLinkNode.href = 'app://style-' + number + '/';
        styleLinkNode.type = 'text/css';
        panel.appendChild(styleLinkNode);

        return styleLinkNode;
      });
    }

    function fillPanelWithGaiaHeaders(panel) {
      return [1, 2, 3].map((number) => {
        var gaiaHeader = document.createElement('gaia-header');
        gaiaHeader.setAttribute('action', 'close');
        gaiaHeader.setAttribute('id', 'header-' + number);

        panel.appendChild(gaiaHeader);

        return gaiaHeader;
      });
    }

    setup(function() {
      this.sinon.stub(LazyLoader, 'load');

      panel = document.createElement('div');
      panel.hidden = true;

      callbackStub = sinon.stub();
    });

    test('immediately calls callback if panel is visible', function() {
      panel.hidden = false;

      viewManager.loadPanel(panel, callbackStub);

      sinon.assert.notCalled(LazyLoader.load);
      sinon.assert.calledOnce(callbackStub);
      assert.isFalse(panel.hidden);
    });

    test('tries to lazy load panel if it is hidden', function() {
      viewManager.loadPanel(panel, callbackStub);
      sinon.assert.notCalled(callbackStub);

      LazyLoader.load.callArg(1);

      sinon.assert.calledOnce(callbackStub);
      assert.isFalse(panel.hidden);
    });

    test('activates nested resources', function() {
      // Remember how many links we had in document before
      var styleLinkCount = document.querySelectorAll('head > link').length;
      var scriptLinkCount = document.querySelectorAll('head > script').length;

      var scriptLinks = fillPanelWithScriptLinks(panel);
      var styleLinks = fillPanelWithStyleLinks(panel);

      viewManager.loadPanel(panel, callbackStub);
      LazyLoader.load.callArg(1);

      // Callback shouldn't be called if resources aren't loaded yet
      sinon.assert.notCalled(callbackStub);
      assert.equal(
        document.querySelectorAll('head > link').length,
        styleLinkCount + styleLinks.length
      );
      assert.equal(
        document.querySelectorAll('head > script').length,
        scriptLinkCount + scriptLinks.length
      );

      scriptLinks.concat(styleLinks).forEach((link, index) => {
        var headLink = null;
        if (link.type === 'text/css') {
          headLink = document.head.querySelector(
            'link[href="' + link.href + '"]'
          );
        } else {
          headLink = document.head.querySelector(
            'script[src="' + link.src + '"]'
          );
        }

        assert.isFalse(document.contains(link));
        assert.isNotNull(headLink);

        headLink.dispatchEvent(new CustomEvent('load'));

        // Callback should be called only once all links are loaded
        if (index < scriptLinks.length + styleLinks.length - 1) {
          sinon.assert.notCalled(callbackStub);
        } else {
          sinon.assert.called(callbackStub);
        }
      });
    });

    test('does not activate already activated nested resources', function() {
      var scriptLinks = fillPanelWithScriptLinks(panel);
      var styleLinks = fillPanelWithStyleLinks(panel);
      var allResourceLinks = scriptLinks.concat(styleLinks);

      // Register resources in head, so that they are considered as activated
      allResourceLinks.forEach((link) => {
        document.head.appendChild(link.cloneNode());
      });

      // Remember how many links we had before
      var styleLinkCount = document.querySelectorAll('head > link').length;
      var scriptLinkCount = document.querySelectorAll('head > script').length;

      viewManager.loadPanel(panel, callbackStub);
      sinon.assert.notCalled(callbackStub);

      LazyLoader.load.callArg(1);

      // No new resources are added, so callback is called immediately
      sinon.assert.calledOnce(callbackStub);
      assert.equal(
        document.querySelectorAll('head > link').length,
        styleLinkCount
      );
      assert.equal(
        document.querySelectorAll('head > script').length,
        scriptLinkCount
      );

      // Resource links should be removed from panel anyway
      allResourceLinks.forEach(
        (link) => assert.isFalse(document.contains(link))
      );
    });

    test('attaches gaia-header close action callbacks', function() {
      var gaiaHeaders = fillPanelWithGaiaHeaders(panel);

      gaiaHeaders.forEach(
        (header) => this.sinon.stub(header, 'addEventListener')
      );

      viewManager.loadPanel(panel, callbackStub);
      LazyLoader.load.callArg(1);

      sinon.assert.calledOnce(callbackStub);

      gaiaHeaders.forEach((header) => {
        sinon.assert.calledWithExactly(
          header.addEventListener, 'action', sinon.match.func
        );
      });
    });
  });
});
