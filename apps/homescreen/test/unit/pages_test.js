/* jshint nonew: false */
/* global MockLazyLoader, Pages, PagesStore */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('mocks/mock_datastore.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/js/places_model.js');
require('/js/pages.js');

suite('Pages', () => {
  var pages;

  setup(() => {
    window.PagesStore = window.Datastore;
    loadBodyHTML('_index.html');
    pages = new Pages();
    window.LazyLoader = MockLazyLoader;
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
      stub = sinon.stub(PagesStore.prototype, 'getAll', () => {
        return { then: callback => {
          callback([]);
          done(() => {
            assert.isTrue(document.getElementById('pages-panel').classList.
                            contains('empty'));
          });
        }};
      });
      new Pages();
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
      assert.isTrue(appendChildStub.calledOnce);
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
      themeColor: 'Mock color'
    };

    var mockCard = {
      title: null,
      dataset: { id: null },
      style: { order: 0 },
      background: null,
      icon: null
    };

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
      var pinTime = -Math.round(mockPinnedPage.pinTime / 1000);
      assert.equal(mockCard.style.order, pinTime);
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
      assert.equal(mockCard.background.src, mockPinnedPage.screenshot);
      assert.equal(mockCard.background.themeColor, mockPinnedPage.themeColor);
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
              map(function eachFeature(key) {
                return encodeURIComponent(key) + '=' +
                  encodeURIComponent(expectedFeatures[key]);
              }).join(',');

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
