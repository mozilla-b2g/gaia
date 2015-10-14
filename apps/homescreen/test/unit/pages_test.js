/* jshint nonew: false */
/* global Pages, PagesStore */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('mocks/mock_datastore.js');
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
  });

  suite('Pages#addPinnedPage()', () => {
    var createElementStub;
    var updatePinnedPageStub;
    var appendChildStub;

    setup(() => {
      createElementStub = sinon.stub(document, 'createElement');
      updatePinnedPageStub = sinon.stub(pages, 'updatePinnedPage');
      appendChildStub = sinon.stub(pages.pages, 'appendChild');
    });

    teardown(() => {
      createElementStub.restore();
      updatePinnedPageStub.restore();
      appendChildStub.restore();
    });

    test('should add pin-the-web to document body', () => {
      assert.isTrue(pages.firstPinnedPage);
      assert.isFalse(document.body.classList.contains('pin-the-web'));
      pages.addPinnedPage();
      assert.isFalse(pages.firstPinnedPage);
      assert.isTrue(document.body.classList.contains('pin-the-web'));
    });

    test('should add a card to the pages list', () => {
      pages.addPinnedPage();
      assert.isTrue(createElementStub.calledWith('gaia-pin-card'));
      assert.isTrue(updatePinnedPageStub.calledOnce);
      assert.isTrue(appendChildStub.calledOnce);
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
    });

    suite('contextmenu', () => {
      test('long-pressing a card should do nothing', () => {
        var preventDefaultCalled = false;
        var stopImmediatePropagationCalled = false;
        var event = {
          type: 'contextmenu',
          target: mockCard,
          preventDefault: () => {
            preventDefaultCalled = true;
          },
          stopImmediatePropagation: () => {
            stopImmediatePropagationCalled = true;
          }
        };
        pages.handleEvent(event);

        assert.isTrue(preventDefaultCalled);
        assert.isTrue(stopImmediatePropagationCalled);
      });
    });

    suite('drag-end', () => {
      var getStub, getReturnValue, realInnerHeight;
      setup(() => {
        getStub = sinon.stub(pages.pagesStore, 'get',
                             () => Promise.resolve(getReturnValue));

        realInnerHeight =
          Object.getOwnPropertyDescriptor(window, 'innerHeight');
        Object.defineProperty(window, 'innerHeight', {
          value: 500,
          configurable: true
        });
      });

      teardown(() => {
        getStub.restore();
        Object.defineProperty(window, 'innerHeight', realInnerHeight);
      });

      test('Ending a drag above the remove tray does nothing', () => {
        pages.handleEvent(new CustomEvent('drag-end', { detail: {
          clientY: 0
        } }));
        assert.isFalse(getStub.called);
      });

      test('Ending a drag in the remove tray initiates unpinning', done => {
        var card = document.createElement('div');
        card.dataset.id = 'success';
        Object.defineProperty(card, 'parentNode', {
          value: { style: { transform: 'scale(2)' } },
          configurable: true
        });

        pages.pagesStore.datastore = {
          put: (data, id) => {
            done(() => {
              delete pages.pagesStore.datastore;
              assert.isTrue(card.classList.contains('unpinning'));
              assert.equal(card.style.transform, 'scale(2)');
              assert.equal(id, 'success');
              assert.isFalse(getReturnValue.data.pinned);
            });
            return Promise.resolve();
          }
        };

        getReturnValue = { data: { pinned: true } };
        pages.handleEvent(new CustomEvent('drag-end', { detail: {
          clientY: 600,
          target: card
        } }));
      });
    });

    suite('scroll', () => {
      test('should show and hide the drop shadow accordingly', () => {
        assert.isFalse(pages.scrolled);
        pages.scrollable = {
          scrollTop: 50
        };
        pages.handleEvent(new CustomEvent('scroll'));
        assert.isTrue(pages.scrolled);
        assert.isTrue(pages.shadow.classList.contains('visible'));

        pages.scrollable.scrollTop = 0;
        pages.handleEvent(new CustomEvent('scroll'));
        assert.isFalse(pages.scrolled);
        assert.isFalse(pages.shadow.classList.contains('visible'));
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

      test('should scroll to the top of the page', done => {
        var realPanels = pages.panels;
        pages.panels = { scrollLeft: 100 };

        pages.scrollable = {
          scrollTo: (obj) => {
            done(() => {
              pages.panels = realPanels;
              assert.equal(obj.top, 0);
              assert.equal(obj.left, 0);
            });
          },
          parentNode: {
            offsetLeft: 100
          }
        };
        pages.handleEvent(new CustomEvent('hashchange'));
      });
    });
  });
});
