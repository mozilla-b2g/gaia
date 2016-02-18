/* jshint nonew: false */
/* global Pages, PagesStore */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('mocks/mock_pagesmetadata.js');
require('mocks/mock_datastore.js');
require('mocks/mock_settings.js');
require('/js/pages.js');

suite('Pages', () => {
  var pages;

  setup(() => {
    window.PagesStore = window.Datastore;
    loadBodyHTML('_index.html');
    pages = new Pages();
  });

  suite('Pages constructor', () => {
    var stub;

    teardown(() => {
      stub.restore();
    });

    test('should initialise the pages store', done => {
      stub = sinon.stub(PagesStore.prototype, 'init', () => {
        done();
        return Promise.reject();
      });
      new Pages();
    });

    test('should get the list of pinned pages', done => {
      stub = sinon.stub(PagesStore.prototype, 'getAll', () => {
        done();
        return Promise.reject();
      });
      new Pages();
    });

    test('should mark the pages panel empty if no pages', done => {
      new Pages();

      setTimeout(() => {
        var pagesPanel = document.getElementById('pages-panel');
        assert.isTrue(pagesPanel.classList.contains('empty'));
        done();
      });
    });
  });

  suite('Pages#addPinnedPage()', () => {
    var pinCard;
    var createElementStub;
    var updatePinnedPageStub;
    var appendChildStub;

    setup(() => {
      pinCard = document.createElement('div');
      createElementStub = sinon.stub(document, 'createElement', () => pinCard);
      updatePinnedPageStub = sinon.stub(pages, 'updatePinnedPage');
      appendChildStub = sinon.stub(pages.pages, 'appendChild');
    });

    teardown(() => {
      createElementStub.restore();
      updatePinnedPageStub.restore();
      appendChildStub.restore();
    });

    test('should remove .empty from the pages panel', () => {
      var pagesPanel = document.getElementById('pages-panel');
      assert.isTrue(pages.empty);
      assert.isTrue(pagesPanel.classList.contains('empty'));
      pages.addPinnedPage();
      assert.isFalse(pages.empty);
      assert.isFalse(pagesPanel.classList.contains('empty'));
    });

    test('should add a card to the pages list', () => {
      pages.addPinnedPage();
      assert.isTrue(createElementStub.calledWith('gaia-pin-card'));
      assert.isTrue(updatePinnedPageStub.calledOnce);
    });

    test('should make card accessible', () => {
      pages.addPinnedPage();
      assert.equal(pinCard.tabIndex, 0);
      assert.equal(pinCard.getAttribute('role'), 'link');
    });
  });

  suite('Pages#updatePinnedPage()', () => {
    var clock;
    var createObjectURLStub;

    var mockPinnedPage = {
      title: 'Mock pinned page',
      url: 'Mock URL',
      pinTime: 4242,
      screenshot: 'Mock screenshot',
      meta: {
        'theme-color': 'Mock color'
      }
    };

    var mockCard = document.createElement('div');
    mockCard.title = null;
    mockCard.dataset.id = null;
    mockCard.style.order = 0;
    mockCard.background = null;
    mockCard.meta = null;
    mockCard.con = null;

    var mockIconBlob = 'Mock icon blob';

    setup(() => {
      clock = sinon.useFakeTimers();
      createObjectURLStub = sinon.stub(URL, 'createObjectURL', blob => blob);
    });

    teardown(() => {
      clock.restore();
      createObjectURLStub.restore();
    });

    test('should set title, url and order', () => {
      pages.updatePinnedPage(mockCard, mockPinnedPage);
      assert.equal(mockCard.title, mockPinnedPage.title);
      assert.equal(mockCard.dataset.id, mockPinnedPage.url);
      assert.equal(mockCard.style.order, 0);
    });

    test('should set screenshot, themeColor and icon after timeout', done => {
      window.IconsHelper = {
        getIconBlob: (url, size, page) => {
          return {
            then: (callback) => {
              callback({ blob: mockIconBlob });
              assert.equal(mockCard.icon, 'url(' + mockIconBlob + ')');
              done();
              return { catch: () => {} };
            }
          };
        }
      };

      pages.updatePinnedPage(mockCard, mockPinnedPage);
      clock.tick();
      var meta = mockCard.meta;
      assert.equal(meta['theme-color'], mockPinnedPage.meta['theme-color']);
      assert.equal(meta.screenshot, mockPinnedPage.screenshot);
    });

    test('should insert a pin card in the right order', () => {
      pages.startupMetadata = [
        { id: 'abc', order: 1 },
        { id: 'def', order: 2 },
        { id: 'ghi', order: 3 }
      ];

      var pinCard1 = document.createElement('div');
      var pinCard2 = document.createElement('div');
      var pinCard3= document.createElement('div');
      pinCard1.id = 'abc';
      pinCard2.id = 'def';
      pinCard3.id = 'ghi';

      var page1 = Object.create(mockPinnedPage);
      var page2 = Object.create(mockPinnedPage);
      var page3 = Object.create(mockPinnedPage);
      page1.id = 'abc';
      page2.id = 'def';
      page3.id = 'ghi';

      pages.updatePinnedPage(pinCard1, page1);
      pages.updatePinnedPage(pinCard3, page3);

      assert.equal(pages.pages.children.length, 2);

      pages.updatePinnedPage(pinCard2, page2);

      assert.equal(pages.pages.children.length, 3);
      assert.equal(pages.pages.children[0].order, 2);
      assert.equal(pages.pages.children[0].id, 'def');
      assert.equal(pages.pages.children[1].order, 3);
      assert.equal(pages.pages.children[1].id, 'ghi');
      assert.equal(pages.pages.children[2].order, 1);
      assert.equal(pages.pages.children[2].id, 'abc');
    });

    test('should prepend a new pin card to the stack', () => {
      var pinCard1 = document.createElement('div');
      var pinCard2 = document.createElement('div');
      pinCard1.id = 'abc';
      pinCard2.id = 'def';

      pages.updatePinnedPage(pinCard1, {});

      assert.equal(pages.pages.children.length, 1);
      assert.equal(pages.pages.children[0].id, 'abc');

      pages.updatePinnedPage(pinCard2, {});

      assert.equal(pages.pages.children.length, 2);
      assert.equal(pages.pages.children[0].id, 'def');
      assert.equal(pages.pages.children[1].id, 'abc');
    });
  });

  suite('Pages#launchCard()', () => {
    test('should call window.open', () => {
      var stub = sinon.stub(window, 'open');

      pages.launchCard({ title: 'abc', dataset: { id: 'http://example.com' } });
      assert.isTrue(stub.calledOnce);
      stub.restore();
    });
  });

  suite('Pages#enterEditMode()', () => {
    var mockCard;
    setup(() => {
      mockCard = document.createElement('div');
      pages.enterEditMode(mockCard);
    });

    teardown(() => {
      pages.exitEditMode();
    });

    test('card is marked as selected', () => {
      assert.isTrue(mockCard.classList.contains('selected'));
    });

    test('document is marked as in edit-mode', () => {
      assert.isTrue(document.body.classList.contains('edit-mode'));
    });

    test('delete button is activated', () => {
      assert.isTrue(pages.remove.classList.contains('active'));
    });

    test('previous card is unselected', () => {
      var mockCard2 = document.createElement('div');
      pages.enterEditMode(mockCard2);
      assert.isFalse(mockCard.classList.contains('selected'));
      assert.isTrue(mockCard2.classList.contains('selected'));
    });
  });

  suite('Pages#exitEditMode()', () => {
    var mockCard;
    setup(() => {
      mockCard = document.createElement('div');
      pages.enterEditMode(mockCard);
      pages.exitEditMode();
    });

    test('card is not marked as selected', () => {
      assert.isFalse(mockCard.classList.contains('selected'));
      assert.equal(pages.selectedCard, null);
    });

    test('document is not marked as in edit-mode', () => {
      assert.isFalse(document.body.classList.contains('edit-mode'));
    });

    test('delete button is not activated', () => {
      assert.isFalse(pages.remove.classList.contains('active'));
    });
  });

  suite('Pages#removeCard()', () => {
    var mockCard;
    setup(() => {
      mockCard = document.createElement('div');
    });

    test('removes child from container', () => {
      var removeStub = sinon.stub(pages.pages, 'removeChild');
      pages.removeCard(mockCard);
      assert.isTrue(removeStub.calledWith(mockCard));
    });

    test('deselects card if card is selected', () => {
      pages.selectedCard = mockCard;
      var removeStub = sinon.stub(pages.pages, 'removeChild');
      pages.removeCard(mockCard);
      assert.equal(pages.selectedCard, null);
      removeStub.restore();
    });

    test('shows the empty pinned pages panel when removing last card', done => {
      pages.empty = false;
      Object.defineProperty(pages.pages, 'children', {
        value: { length: 0 },
        configurable: true
      });
      var removeChildStub = sinon.stub(pages.pages, 'removeChild',
        (card, callback) => {
          callback();
          done(() => {
            delete pages.pages.children;
            removeChildStub.restore();
            assert.isTrue(pages.empty);
            assert.isTrue(pages.panel.classList.contains('empty'));
          });
        });
      pages.removeCard(mockCard);
    });

    test('exits edit mode when removing last card', done => {
      pages.empty = false;
      pages.editMode = true;
      Object.defineProperty(pages.pages, 'children', {
        value: { length: 0 },
        configurable: true
      });
      var removeChildStub = sinon.stub(pages.pages, 'removeChild',
        (card, callback) => {
          callback();
          done(() => {
            delete pages.pages.children;
            removeChildStub.restore();
            assert.isFalse(pages.editMode);
          });
        });
      pages.removeCard(mockCard);
    });
  });

  suite('Pages#unpinSelectedCard()', () => {
    var removeCardStub, storeGetStub, storePutStub, mockEntry, callback;
    var mockCard = {
      dataset: {
        id: 'abc'
      }
    };

    setup(() => {
      mockEntry = { data: { pinned: true } };
      removeCardStub = sinon.stub(pages, 'removeCard');
      storeGetStub =
        sinon.stub(pages.pagesStore, 'get', () => {
          return Promise.resolve(mockEntry);
        });
      storePutStub =
        sinon.stub(pages.pagesStore.datastore, 'put', (data, id) => {
          if (callback) {
            callback(data, id);
          }
          return Promise.resolve();
        });
      pages.selectedCard = mockCard;
    });

    teardown(() => {
      removeCardStub.restore();
      storeGetStub.restore();
      storePutStub.restore();
      pages.selectedCard = null;
    });

    test('removes card from container', () => {
      pages.unpinSelectedCard();
      assert.isTrue(removeCardStub.calledWith(mockCard));
    });

    test('unpins card in datastore', done => {
      callback = (data, id) => {
        done(() => {
          assert.equal(id, mockCard.dataset.id);
          assert.isFalse(mockEntry.data.pinned);
        });
      };
      pages.unpinSelectedCard();
    });
  });

  suite('Pages#storePagesOrder()', () => {
    setup(() => {
      pages.metadata.mSetup();
    });

    test('should persist pages in sorted order', () => {
      var pinCard1 = document.createElement('div');
      var pinCard2 = document.createElement('div');
      var pinCard3 = document.createElement('div');
      pinCard1.id = 'abc';
      pinCard2.id = 'def';
      pinCard3.id = 'ghi';

      pages.pages.appendChild(pinCard1);
      pages.pages.appendChild(pinCard2);
      pages.pages.appendChild(pinCard3);
      pages.storePagesOrder();

      assert.equal(pages.metadata._data.length, 3);
      assert.equal(pages.metadata._data[0].order, 0);
      assert.equal(pages.metadata._data[1].order, 1);
      assert.equal(pages.metadata._data[2].order, 2);
    });
  });

  suite('Pages#refreshGridSize()', () => {
    var realScrollable;
    setup(() => {
      realScrollable = pages.scrollable;
      pages.scrollable = {
        clientHeight: 200,
        style: {}
      };
    });

    teardown(() => {
      pages.scrollable = realScrollable;
    });

    suite('without pinned pages', () => {
      var realPages;
      setup(() => {
        realPages = pages.pages;
        pages.pages = {
          children: [],
          style: {}
        };
      });

      teardown(() => {
        pages.pages = realPages;
      });

      test('should reset snap points when there are no pinned pages', () => {
        pages.refreshGridSize();
        assert.equal(pages.scrollable.style.scrollSnapPointsY, 'repeat(200px)');
        assert.equal(pages.pages.style.backgroundSize, '100% 400px');
      });
    });
  });

  suite('Pages#snapScrollPosition()', () => {
    var realScrollable, scrollToSpy;
    setup(() => {
      realScrollable = pages.scrollable;
      pages.scrollable = {
        clientHeight: 100,
        scrollTop: 0,
        style: {},
        scrollTo: () => {}
      };
      scrollToSpy = sinon.spy(pages.scrollable, 'scrollTo');
      pages.settings.scrollSnapping = true;
    });

    teardown(() => {
      pages.settings.scrollSnapping = false;
      pages.scrollable = realScrollable;
    });

    test('should do nothing if already aligned', () => {
      pages.pendingGridHeight = 500;
      pages.pageHeight = 100;

      pages.scrollable.scrollTop = 0;
      pages.snapScrollPosition();
      assert.isFalse(scrollToSpy.called);

      pages.scrollable.scrollTop = 100;
      pages.snapScrollPosition();
      assert.isFalse(scrollToSpy.called);
    });

    test('should do nothing if nearly aligned', () => {
      pages.pendingGridHeight = 500;
      pages.pageHeight = 100;
      pages.scrollable.scrollTop = 101;

      pages.snapScrollPosition();
      assert.isFalse(scrollToSpy.called);
    });

    test('should remove overflow and scroll to nearest snap point', () => {
      pages.pendingGridHeight = 500;
      pages.pageHeight = 100;
      pages.scrollable.scrollTop = 10;

      pages.snapScrollPosition();
      assert.equal(pages.scrollable.style.overflow, '');
      assert.isTrue(scrollToSpy.calledWith(
        { left: 0, top: 0, behavior: 'smooth' }));
    });

    test('should do nothing if snapping disabled', () => {
      pages.settings.scrollSnapping = false;
      pages.pendingGridHeight = 500;
      pages.pageHeight = 100;
      pages.scrollable.scrollTop = 10;

      pages.snapScrollPosition();
      assert.isFalse(scrollToSpy.called);
    });
  });

  suite('Pages#handleEvent()', () => {
    var mockCard = {
      nodeName: 'GAIA-PIN-CARD',
      title: 'Mock title',
      icon: 'Mock icon',
      dataset: {
        id: 'Mock URL'
      }
    };

    var mockNotCard = {
      nodeName: 'MOCK-NOT-CARD'
    };

    suite('click', () => {
      test('clicking a card should launch a remote window', () => {
        var windowOpenStub = sinon.stub(window, 'open',
          (url, target, features) => {
            assert.equal(url, mockCard.dataset.id);
            assert.equal(target, '_blank');

            var expectedFeatures = {
              name: mockCard.title,
              icon: mockCard.icon,
              remote: true
            };
            expectedFeatures = Object.keys(expectedFeatures).
              map((key) => encodeURIComponent(key) + '=' +
                encodeURIComponent(expectedFeatures[key])
              ).join(',');

            assert.equal(features, expectedFeatures);
          });
        pages.handleEvent({ type: 'click', target: mockCard });
        windowOpenStub.restore();
      });

      test('clicking outside a card should do nothing', () => {
        var windowOpenStub = sinon.stub(window, 'open');
        pages.handleEvent({ type: 'click', target: mockNotCard });
        assert.isFalse(windowOpenStub.called);
        windowOpenStub.restore();
      });

      test('pressing a card in edit mode selects it', () => {
        var editModeStub = sinon.stub(pages, 'enterEditMode');
        pages.editMode = true;
        pages.handleEvent({ type: 'click', target: mockCard });
        assert.isTrue(editModeStub.calledWith(mockCard));
        editModeStub.restore();
      });

      test('pressing delete in edit mode unpins a card', () => {
        var unpinStub = sinon.stub(pages, 'unpinSelectedCard');
        pages.selectedCard = mockCard;
        pages.remove.dispatchEvent(new CustomEvent('click'));
        assert.isTrue(unpinStub.called);
      });
    });

    suite('contextmenu', () => {
      var editModeStub;
      setup(() => {
        editModeStub = sinon.stub(pages, 'enterEditMode');
      });

      teardown(() => {
        editModeStub.restore();
      });

      test('long-pressing a card initiates edit mode', () => {
        pages.handleEvent({ type: 'contextmenu', target: mockCard });
        assert.isTrue(editModeStub.calledWith(mockCard));
      });

      test('long-pressing not on a card does nothing', () => {
        pages.handleEvent({ type: 'contextmenu', target: mockNotCard });
        assert.isFalse(editModeStub.called);
      });
    });

    suite('drag-move', () => {
      var setIntervalStub, clearIntervalStub;

      setup(() => {
        pages.lastWindowWidth = pages.lastWindowHeight = 500;
        setIntervalStub = sinon.stub(window, 'setInterval');
        clearIntervalStub = sinon.stub(window, 'clearInterval');

        pages.draggingRemovable = pages.draggingEditable = true;
      });

      teardown(() => {
        setIntervalStub.restore();
        clearIntervalStub.restore();
      });

      test('Auto-scroll is activated at the top of the screen', () => {
        pages.handleEvent(new CustomEvent('drag-move', { detail: {
          clientX: 0,
          clientY: 0
        }}));

        assert.isTrue(setIntervalStub.called);
      });

      test('Auto-scroll is activated at the bottom of the screen', () => {
        pages.handleEvent(new CustomEvent('drag-move', { detail: {
          clientX: 0,
          clientY: 500
        }}));

        assert.isTrue(setIntervalStub.called);
      });

      test('Auto-scroll is cancelled when not at the top or bottom', () => {
        pages.autoScrollInterval = 'abc';
        pages.pages.getChildFromPoint = () => { return null; };

        pages.handleEvent(new CustomEvent('drag-move', { detail: {
          clientX: 0,
          clientY: 250
        }}));

        assert.isTrue(clearIntervalStub.calledWith('abc'));
        delete pages.pages.getChildFromPoint;
      });
    });

    suite('drag-finish', () => {
      test('auto-scroll interval should be cancelled', () => {
        var clearIntervalStub = sinon.stub(window, 'clearInterval');
        pages.autoScrollInterval = 'abc';
        pages.handleEvent(new CustomEvent('drag-finish'));
        clearIntervalStub.restore();

        assert.isTrue(clearIntervalStub.calledWith('abc'));
        assert.equal(pages.autoScrollTimeout, null);
      });
    });

    suite('drag-end', () => {
      var realInnerHeight, realInnerWidth, realPages, reorderChildSpy;
      var mockIconContainer = { firstElementChild: 'icon',
        dataset: { id: 'abc'} };

      setup(() => {
        realInnerHeight =
          Object.getOwnPropertyDescriptor(window, 'innerHeight');
        realInnerWidth =
          Object.getOwnPropertyDescriptor(window, 'innerWidth');
        Object.defineProperty(window, 'innerHeight', {
          value: 500,
          configurable: true
        });
        Object.defineProperty(window, 'innerWidth', {
          value: 500,
          configurable: true
        });

        realPages = pages.pages;
        pages.pages = {
          firstChild: 'abc',
          getChildOffsetRect: () => {
            return { left: 0, top: 0, right: 10, bottom: 10 };
          },
          reorderChild: () => {}
        };
        pages.iconsLeft = 10;
        pages.iconsRight = 490;

        reorderChildSpy = sinon.spy(pages.pages, 'reorderChild');
      });

      teardown(() => {
        pages.pages = realPages;
        reorderChildSpy.restore();
        Object.defineProperty(window, 'innerHeight', realInnerHeight);
        Object.defineProperty(window, 'innerWidth', realInnerWidth);
      });

      test('icon can be dropped at the beginning of the container', () => {
        pages.handleEvent(new CustomEvent('drag-end', {
          detail:
          { target: 'def', dropTarget: null, clientX: 250, clientY: -100 }
        }));
        assert.isTrue(reorderChildSpy.calledWith('def', 'abc'));
      });

      test('icon can be dropped at the end of the container', () => {
        pages.handleEvent(new CustomEvent('drag-end', {
          detail:
          { target: 'def', dropTarget: null, clientX: 250, clientY: 600 }
        }));
        assert.isTrue(reorderChildSpy.calledWith('def', null));
      });

      test('dropping icon on itself does nothing', () => {
        pages.handleEvent(new CustomEvent('drag-end', {
          detail: {
            target: 'abc',
            dropTarget: mockIconContainer,
            clientX: 0,
            clientY: 0
          }
        }));
        assert.isFalse(reorderChildSpy.called);
      });

      test('dropping icon to the side does nothing', () => {
        pages.handleEvent(new CustomEvent('drag-end', {
          detail:
          { target: 'def', dropTarget: null, clientX: 5, clientY: 0 }
        }));
        pages.handleEvent(new CustomEvent('drag-end', {
          detail:
          { target: 'def', dropTarget: null, clientX: 495, clientY: 0 }
        }));
        assert.isFalse(reorderChildSpy.called);
      });

      test('dropping icon without moving activates edit mode', () => {
        var enterEditModeStub = sinon.stub(pages, 'enterEditMode');

        pages.shouldEnterEditMode = true;
        pages.handleEvent(new CustomEvent('drag-end', {
          detail: { target: mockIconContainer,
            dropTarget: mockIconContainer,
            clientX: 0, clientY: 0 }
        }));
        assert.isTrue(
          enterEditModeStub.calledWith(mockIconContainer));

        enterEditModeStub.restore();
      });
    });

    suite('resize', () => {
      test('should call pages.synchronise()', () => {
        var synchroniseCalled = false;
        pages.pages.synchronise = () => { synchroniseCalled = true; };
        pages.handleEvent(new CustomEvent('resize'));
        assert.isTrue(synchroniseCalled);
      });
    });
  });
});
