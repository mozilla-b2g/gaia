/* global sinon, assert, suite, test, suiteSetup, suiteTeardown,
          setup, teardown, MockNavigatormozApps, MockApp, MockDom,
          fakeIconBlob */
'use strict';

suite('GaiaAppIcon', () => {
  var sinonSandbox, dom, el;
  var realNavigatorMozApps;

  setup(() => {
    realNavigatorMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;
    sinonSandbox = sinon.sandbox.create();

    // DOM container to put test cases
    dom = document.createElement('div');
    dom.innerHTML = '<gaia-app-icon></gaia-app-icon>';
    el = dom.firstElementChild;
    document.body.appendChild(dom);
  });

  teardown(() => {
    navigator.mozApps = realNavigatorMozApps;
    sinonSandbox.restore();

    document.body.removeChild(dom);
    dom = null;
  });

  // Properties
  test('.app should be null at startup', () => {
    assert.equal(el.app, null);
  });

  test('.bookmark should be null at startup', () => {
    assert.equal(el.bookmark, null);
  });

  test('.entryPoint should default to empty string', () => {
    el.app = new MockApp();
    assert.equal(el.entryPoint, '');
    el.entryPoint = null;
    assert.equal(el.entryPoint, '');
  });

  suite('.icon', () => {
    setup(() => {
      MockDom.setup();
    });

    teardown(() => {
      MockDom.teardown();
    });

    test('should return a promise that resolves to a blob', (done) => {
      el.app = new MockApp();
      el.icon = fakeIconBlob;
      MockDom.mImgOnload();
      setTimeout(() => {
        el.icon
          .then(blob => {
            assert.equal(blob, fakeIconBlob);
            done();
          })
          .catch(() => {
            assert.equal(true, false);
            done();
          });
      });
    });

    test('should trigger a icon-loaded event', (done) => {
      el.app = new MockApp();
      el.icon = fakeIconBlob;
      MockDom.mImgOnload();
      el.addEventListener('icon-loaded', () => {
        done();
      });
    });

    test('should return a rejected promise if unset', (done) => {
      el.app = new MockApp();
      el.icon = null;
      el.icon
        .then(() => {
          assert.equal(true, false);
          done();
        })
        .catch(() => {
          done();
        });
    });
  });

  // Methods
  suite('.launch()', () => {
    setup(() => {
      MockDom.setup();
    });

    teardown(() => {
      MockDom.teardown();
    });

    test('should open an app', () => {
      var app = new MockApp();
      var openStub = sinon.stub(app, 'launch');
      el.app = app;
      el.launch();

      assert.equal(openStub.called, true);
      openStub.restore();
    });

    /*test('should open an bookmark', (done) => {
      var bookmark = getMockBookmark();
      var openStub = sinon.stub(window, 'open');
      el.bookmark = bookmark;
      // A bookmark needs an icon to be launched.
      el.icon = fakeIconBlob;
      MockDom.mImgOnload();

      setTimeout(() => {
        el.launch();

        setTimeout(() => {
          assert.equal(openStub.called, true);
          openStub.restore();

          done();
        });
      });
    });*/

    test('should set a CSS class', () => {
      el.app = new MockApp();
      el.launch();

      assert.equal(el.classList.contains('launching'), true);
    });
  });

  test('._prepareIconLoader() should add a _image property', () => {
    el.app = new MockApp();
    assert.equal(el._image, null);
    el._prepareIconLoader();
    assert.notEqual(el._image.src, null);
  });

  test('._setPredefinedIcon() should set the image source', () => {
    el.app = new MockApp();
    el._prepareIconLoader();
    assert.equal(el._image.src, '');
    el._setPredefinedIcon('default');
    assert.notEqual(el._image.src, '');
  });

  suite('._relayout()', () => {
    var realDevicePixelRatio;
    var dpr = 1;
    var clientWidth = 144;
    var clientWidthStub = (el) => {
      Object.defineProperty(el, 'clientWidth', {
        configurable: true,
        get: () => {
          return clientWidth;
        }
      });
    };

    suiteSetup(() => {
      realDevicePixelRatio =
        Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
      Object.defineProperty(window, 'devicePixelRatio', {
        configurable: true,
        get: () => {
          return dpr;
        }
      });
    });

    suiteTeardown(() => {
      Object.defineProperty(window, 'devicePixelRatio', realDevicePixelRatio);
    });

    test('should set the image source', () => {
      clientWidthStub(el);
      el.app = new MockApp();
      el._prepareIconLoader();
      assert.equal(el._size, 0);
      el._relayout();
      assert.equal(el._size, clientWidth);
    });

    test('should account for pixel density', () => {
      dpr = 2.5;
      clientWidthStub(el);
      el.app = new MockApp();
      el._prepareIconLoader();
      el._relayout();
      assert.isAbove(el._size, clientWidth);
    });
  });
});
