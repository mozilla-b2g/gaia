/* jshint nonew: false */
/* global AppWindow */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('mocks/mock_pages.js');
require('mocks/mock_app.js');
require('/js/window.js');

suite('AppWindow', () => {
  var appWindow;

  setup(() => {
    loadBodyHTML('_index.html');
    appWindow = new AppWindow();
  });

  suite('AppWindow#updatePanelIndicator()', () => {
    var indicatorToggleStubs;
    var realPanels;
    var mockPanels = {
      scrollLeft: 0,
      scrollLeftMax: 100
    };

    setup(() => {
      indicatorToggleStubs = [
        sinon.stub(appWindow.indicator.children[0].classList, 'toggle'),
        sinon.stub(appWindow.indicator.children[1].classList, 'toggle')];
      realPanels = appWindow.panels;
      appWindow.panels = mockPanels;
    });

    teardown(() => {
      indicatorToggleStubs.forEach((stub) => { stub.restore(); });
      appWindow.panels = realPanels;
    });

    test('should update indicator when apps visible', () => {
      appWindow.appsVisible = false;
      appWindow.updatePanelIndicator();
      assert.isTrue(indicatorToggleStubs[0].calledWith('active', true));
      assert.isTrue(indicatorToggleStubs[1].calledWith('active', false));
      assert.equal(appWindow.header.getAttribute('data-l10n-id'), 'apps-panel');
    });

    test('should update aria-hidden on both panels', () => {
      var appPanelSetAttributeStub =
        sinon.stub(appWindow.apps.panel, 'setAttribute');
      var pagesPanelSetAttributeStub =
        sinon.stub(appWindow.pages.panel, 'setAttribute');

      appWindow.appsVisible = false;
      appWindow.updatePanelIndicator();
      assert.isTrue(appPanelSetAttributeStub.calledWith('aria-hidden', false));
      assert.isTrue(pagesPanelSetAttributeStub.calledWith('aria-hidden', true));

      appPanelSetAttributeStub.restore();
      pagesPanelSetAttributeStub.restore();
    });

    test('should update indicator when pages visible', () => {
      var setAttributeSpy = sinon.spy(appWindow.indicator, 'setAttribute');
      var spy1 = setAttributeSpy.withArgs('aria-valuenow', 2);
      var spy2 = setAttributeSpy.withArgs('data-l10n-args', JSON.stringify({
        currentPage: 2,
        totalPages: 2
      }));

      mockPanels.scrollLeft = mockPanels.scrollLeftMax;
      appWindow.updatePanelIndicator();

      assert.isTrue(indicatorToggleStubs[0].calledWith('active', false));
      assert.isTrue(indicatorToggleStubs[1].calledWith('active', true));
      assert.isTrue(spy1.called);
      assert.isTrue(spy2.called);
      assert.equal(appWindow.header.getAttribute('data-l10n-id'),
                   'pages-panel');
    });

    test('should do nothing when visibility is unchanged', () => {
      var setAttributeSpy = sinon.spy(appWindow.indicator, 'setAttribute');
      appWindow.appsVisible = true;
      mockPanels.scrollLeft = 0;
      appWindow.updatePanelIndicator();
      assert.isFalse(indicatorToggleStubs[0].called);
      assert.isFalse(indicatorToggleStubs[1].called);
      assert.isFalse(setAttributeSpy.called);
      setAttributeSpy.restore();
    });
  });

  suite('AppWindow#handleEvent()', () => {
    suite('keypress', () => {
      var scrollObject, realPanels;
      var event = {
        type: 'keypress',
        ctrlKey: true,
        DOM_VK_RIGHT: 'right',
        DOM_VK_LEFT: 'left'
      };
      var mockPanels = {
        scrollLeftMax: 100,
        scrollTo: obj => { scrollObject = obj; }
      };

      setup(() => {
        realPanels = appWindow.panels;
        appWindow.panels = mockPanels;
      });

      teardown(() => {
        appWindow.panels = realPanels;
      });

      test('right should display pinned pages', () => {
        event.keyCode = 'right';
        appWindow.handleEvent(event);
        assert.equal(scrollObject.left, appWindow.panels.scrollLeftMax);
        assert.equal(scrollObject.top, 0);
        assert.equal(scrollObject.behavior, 'smooth');
      });

      test('left should display apps', () => {
        event.keyCode = 'left';
        appWindow.handleEvent(event);
        assert.equal(scrollObject.left, 0);
        assert.equal(scrollObject.top, 0);
        assert.equal(scrollObject.behavior, 'smooth');
      });
    });

    suite('scroll', () => {
      test('should show and hide the drop shadow accordingly', () => {
        appWindow.appsVisible = true;
        appWindow.apps.scrollable = {
          scrollTop: 50
        };
        appWindow.handleEvent(new CustomEvent('scroll'));
        assert.isTrue(appWindow.shadow.classList.contains('visible'));

        appWindow.apps.scrollable.scrollTop = 0;
        appWindow.handleEvent(new CustomEvent('scroll'));
        assert.isFalse(appWindow.shadow.classList.contains('visible'));

        appWindow.appsVisible = false;
        appWindow.pages.scrollable = {
          scrollTop: 50
        };
        appWindow.handleEvent(new CustomEvent('scroll'));
        assert.isTrue(appWindow.shadow.classList.contains('visible'));

        appWindow.pages.scrollable.scrollTop = 0;
        appWindow.handleEvent(new CustomEvent('scroll'));
        assert.isFalse(appWindow.shadow.classList.contains('visible'));
      });

      test('should update the panel indicator', () => {
        var updatePanelStub = sinon.stub(appWindow, 'updatePanelIndicator');

        appWindow.panels.dispatchEvent(new CustomEvent('scroll'));
        assert.isTrue(updatePanelStub.called);

        updatePanelStub.restore();
      });
    });

    suite('hashchange', () => {
      var realDocumentHidden;
      setup(() => {
        realDocumentHidden =
          Object.getOwnPropertyDescriptor(document, 'hidden');
        Object.defineProperty(document, 'hidden', {
          value: false,
          configurable: true
        });
      });

      teardown(() => {
        if (realDocumentHidden) {
          Object.defineProperty(document, 'hidden', realDocumentHidden);
        } else {
          delete document.hidden;
        }
      });

      test('should scroll to the top of the apps page when visible', done => {
        var realScrollable = appWindow.apps.scrollable;
        appWindow.apps.scrollable = {
          scrollTo: (obj) => {
            done(() => {
              assert.equal(obj.top, 0);
              assert.equal(obj.left, 0);
            });
          },
          scrollLeft: 0,
          parentNode: {
            offsetLeft: 0
          }
        };

        appWindow.appsVisible = true;
        appWindow.handleEvent(new CustomEvent('hashchange'));
        appWindow.apps.scrollable = realScrollable;
      });

      test('should scroll to the top of the pages page when visible', done => {
        var realScrollable = appWindow.pages.scrollable;
        appWindow.pages.scrollable = {
          scrollTop: 0,
          scrollLeft: 0,
          parentNode: {
            offsetLeft: 0
          }
        };

        var realPanels = appWindow.panels;
        appWindow.panels = {
          scrollTo: (obj) => {
            done(() => {
              assert.equal(obj.top, 0);
              assert.equal(obj.left, 0);
            });
          },
        };

        appWindow.appsVisible = false;
        appWindow.handleEvent(new CustomEvent('hashchange'));
        appWindow.pages.scrollable = realScrollable;
        appWindow.panels = realPanels;
      });

      test('should scroll to apps panel when at top of pages panel', done => {
        var realScrollable = appWindow.pages.scrollable;
        appWindow.pages.scrollable = {
          scrollTo: (obj) => {
            done(() => {
              assert.equal(obj.top, 0);
              assert.equal(obj.left, 0);
            });
          },
          scrollLeft: 0,
          parentNode: {
            offsetLeft: 0
          }
        };

        appWindow.appsVisible = false;
        appWindow.handleEvent(new CustomEvent('hashchange'));
        appWindow.pages.scrollable = realScrollable;
      });

      test('should cancel apps-panel dialogs', done => {
        var realDialogs = appWindow.apps.dialogs;
        appWindow.apps.dialogs = [{
          close: () => { done(); },
          opened: () => { return true; }
        }];
        appWindow.handleEvent(new CustomEvent('hashchange'));
        appWindow.apps.dialogs = realDialogs;
      });

      test('should cancel pages-panel dialogs', done => {
        var realDialogs = appWindow.pages.dialogs;
        appWindow.pages.dialogs = [{
          close: () => { done(); },
          opened: () => { return true; }
        }];
        appWindow.handleEvent(new CustomEvent('hashchange'));
        appWindow.pages.dialogs = realDialogs;
      });

      test('should exit edit mode', () => {
        var exitEditModeStub;

        appWindow.apps.editMode = true;
        exitEditModeStub = sinon.stub(appWindow.apps, 'exitEditMode');
        appWindow.handleEvent(new CustomEvent('hashchange'));
        assert.isTrue(exitEditModeStub.called);
        exitEditModeStub.restore();

        appWindow.ignoreHashChangeTimeout = null;
        appWindow.apps.editMode = false;

        appWindow.pages.editMode = true;
        exitEditModeStub = sinon.stub(appWindow.pages, 'exitEditMode');
        appWindow.handleEvent(new CustomEvent('hashchange'));
        assert.isTrue(exitEditModeStub.called);
        exitEditModeStub.restore();
      });
    });

    suite('visibilitychange', () => {
      var appsExitEditModeStub, pagesExitEditModeStub;
      setup(() => {
        appsExitEditModeStub = sinon.stub(appWindow.apps, 'exitEditMode');
        pagesExitEditModeStub = sinon.stub(appWindow.pages, 'exitEditMode');
        Object.defineProperty(document, 'hidden', {
          value: true,
          configurable: true
        });
      });

      teardown(() => {
        appsExitEditModeStub.restore();
        pagesExitEditModeStub.restore();
        delete document.hidden;
      });

      test('should exit edit mode', () => {
        appWindow.handleEvent(new CustomEvent('visibilitychange'));
        assert.isTrue(appsExitEditModeStub.called);
        assert.isTrue(pagesExitEditModeStub.called);
      });
    });
  });
});
