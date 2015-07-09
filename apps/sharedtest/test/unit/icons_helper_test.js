/* global IconsHelper, MocksHelper, MockNavigatorDatastore, MockDatastore,
          MockXMLHttpRequest, WebManifestHelper */

'use strict';

require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/apps/system/test/unit/mock_xmlhttprequest.js');

require('/shared/js/web_manifest_helper.js');
require('/shared/js/icons_helper.js');

if (!window.XMLHttpRequest) {
  window.XMLHttpRequest = null;
}

var mocksForIconsHelper = new MocksHelper([
  'Datastore'
]).init();

suite('Icons Helper', () => {
  var devicePixelRatioProperty;
  var dpr = 1;
  var fakeDevicePixelRatio = {
    get: () => {
      return dpr;
    }
  };
  var realDataStores;
  var realXHR;

  mocksForIconsHelper.attachTestHelpers();

  suiteSetup(() => {
    // As we are selecting the icons based on device pixel ratio
    // let's mock the property.
    devicePixelRatioProperty =
      Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      get: fakeDevicePixelRatio.get
    });

    realDataStores = navigator.getDataStores;
    realXHR = window.XMLHttpRequest;

    navigator.getDataStores = MockNavigatorDatastore.getDataStores;
    window.XMLHttpRequest = MockXMLHttpRequest;
  });

  suiteTeardown(() => {
    Object.defineProperty(window, 'devicePixelRatio', devicePixelRatioProperty);
    navigator.getDataStores = realDataStores;
    window.XMLHttpRequest = realXHR;
  });

  suite('IconsHelper.getIcon()', () => {
    var placeObj, siteObj;

    setup(() => {
      placeObj = {
        icons: {
          'http://example.com/metaTagIconUrl': {
            sizes: ['32x32']
          }
        }
      };
      siteObj = {
        webManifestUrl: 'http://example.com',
        webManifest: WebManifestHelper.processRawManifest({
          icons: [
            {
              src: 'webManifestIconUrl',
              sizes: '32x32'
            }
          ]
        }, 'http://example.com')
      };
    });

    test('Prioritise icons from the Web manifest over the rest', done => {
      var origin = 'http://origin.com';
      var path = '/test.png';
      siteObj.manifest = {
        origin: origin,
        icons: {
          '32': path
        }
      };
      IconsHelper.getIcon('http://example.com', 32, placeObj, siteObj)
        .then(iconUrl => {
          assert.equal((new URL(iconUrl)).pathname, '/webManifestIconUrl');
          done();
        });
    });

    test('Prioritise Firefox manifest after Web manifest', done => {
      var origin = 'http://origin.com';
      var path = '/test.png';
      siteObj.webManifest = null;
      siteObj.manifest = {
        origin: origin,
        icons: {
          '32': path
        }
      };
      IconsHelper.getIcon('http://example.com', 32, placeObj, siteObj)
        .then(iconUrl => {
          assert.equal((new URL(iconUrl)).href, origin + path);
          done();
        });
    });


    test('Works with external icons', done => {
      var origin = 'http://origin.com';
      var path = 'http://test.com/test.png';
      siteObj.webManifest = null;
      siteObj.manifest = {
        origin: origin,
        icons: {
          '32': path
        }
      };
      IconsHelper.getIcon('http://example.com', 32, placeObj, siteObj)
        .then(iconUrl => {
          assert.equal((new URL(iconUrl)).href, path);
          done();
        });
    });

    test('Prioritise icons from the web manifest over the rest', done => {
      IconsHelper.getIcon('http://example.com', 32, placeObj, siteObj)
        .then(iconUrl => {
          assert.equal((new URL(iconUrl)).pathname, '/webManifestIconUrl');
          done();
        });
    });

    test('Return meta tag icons when the web manifest hasn\'t any', done => {
      siteObj.webManifest.icons = [];
      IconsHelper.getIcon('http://example.com', 32, placeObj, siteObj)
        .then(iconUrl => {
          assert.equal((new URL(iconUrl)).pathname, '/metaTagIconUrl');
          done();
        });
    });

    test('Prioritise icons from the meta tags over favicon', done => {
      IconsHelper.getIcon('http://example.com', 32, placeObj)
        .then(iconUrl => {
          assert.equal((new URL(iconUrl)).pathname, '/metaTagIconUrl');
          done();
        });
    });

    test('Return favicon when no icons in the meta tags or manifest', done => {
      siteObj.webManifest.icons = [];
      placeObj.icons = [];
      IconsHelper.getIcon('http://example.com', 32, placeObj, siteObj)
        .then(iconUrl => {
          assert.equal((new URL(iconUrl)).pathname, '/favicon.ico');
          done();
        });
    });

    test('Ensure we fallback to favicon.ico', done => {
      IconsHelper.getIcon('http://example.com')
        .then(iconUrl => {
          assert.equal((new URL(iconUrl)).pathname, '/favicon.ico');
          done();
        });
    });

    suite('-moz-resolution fragment', () => {
      teardown(() => {
        dpr = 1;
      });

      test('Without icon target size', done => {
        IconsHelper.getIcon('http://example.com')
          .then(iconUrl => {
            assert.equal((new URL(iconUrl)).hash, '');
          })
          .then(() => {
            done();
          })
          .catch(() => {
            done();
          });
      });

      test('With icon target size', done => {
        dpr = 1.5;
        IconsHelper.getIcon('http://example.com', 64)
          .then(iconUrl => {
            // targetSize * devicePixelRatio
            assert.ok(new URL(iconUrl).includes('-moz-resolution=96,96'));
          })
          .then(() => {
            done();
          })
          .catch(() => {
            done();
          });
      });
    });
  });

  suite('IconsHelper.getIconBlob()', () => {
    var createElementStub, createObjectURLStub;

    function getStubs() {
      createElementStub = sinon.stub(document, 'createElement', () => {
        return {
          src: '',
          naturalWidth: 32,
          naturalHeight: 32,
          set onload(fn) {
            fn();
          },
          onerror: null
        };
      });
      createObjectURLStub = sinon.stub(URL, 'createObjectURL', url => url);
    }

    teardown(() => {
      createElementStub.restore();
      createObjectURLStub.restore();
      MockXMLHttpRequest.mTeardown();
    });

    test('The dataStore should be empty on first call', done => {
      getStubs();
      IconsHelper.getIconBlob('http://example.com', 32)
        .then(() => {
          assert.equal(MockDatastore.getLength(), 0);
          done();
        })
        .catch(() => {
          done();
        });
      setTimeout(() => {
        MockXMLHttpRequest.mSendReadyState();
        MockXMLHttpRequest.mSendOnLoad({response: 'abc'});
      });
    });

    test('The icon should already be in the datastore', done => {
      getStubs();
      IconsHelper.getIconBlob('http://example.com', 32)
        .then(() => {
          assert.equal(MockDatastore.getLength(), 1);
          done();
        })
        .catch(() => {
          done();
        });
      setTimeout(() => {
        MockXMLHttpRequest.mSendReadyState();
        MockXMLHttpRequest.mSendOnLoad({response: 'abc'});
      });
    });
  });

  suite('defaultIconSize', () => {
    test('1', function() {
      dpr = 1;
      assert.isDefined(IconsHelper.defaultIconSize);
      assert.equal(84, IconsHelper.defaultIconSize);
    });

    test('1.5', function() {
      dpr = 1.5;
      assert.isDefined(IconsHelper.defaultIconSize);
      assert.equal(142, IconsHelper.defaultIconSize);
    });

    test('2', function() {
      dpr = 2;
      assert.isDefined(IconsHelper.defaultIconSize);
      assert.equal(142, IconsHelper.defaultIconSize);
    });
  });

  suite('IconsHelper.getBestIconFromWebManifest()', () => {
    var webManifest;
    var webManifestUrl = 'http://example.com';
    test('Get correct icon with no size', () => {
      webManifest = WebManifestHelper.processRawManifest({
        icons: [
          {
            src: 'uri1',
            sizes: ''
          }
        ]
      }, webManifestUrl);
      var iconUrl = IconsHelper.getBestIconFromWebManifest(webManifest);
      assert.isNotNull(iconUrl);
      assert.equal((new URL(iconUrl)).pathname, '/uri1');
    });

    test('Get icon with size', () => {
      webManifest = WebManifestHelper.processRawManifest({
        icons: [
          {
            src: 'uri1',
            sizes: ''
          },
          {
            src: 'uri2',
            sizes: '16x16'
          }
        ]
      }, webManifestUrl);

      var iconUrl = IconsHelper.getBestIconFromWebManifest(webManifest);
      assert.isNotNull(iconUrl);
      assert.equal((new URL(iconUrl)).pathname, '/uri2');
    });

    test('Get best icon which doesn\'t match specific size', () => {
      // With dpr = 1
      webManifest = WebManifestHelper.processRawManifest({
        icons: [
          {
            src: 'uri1',
            sizes: '90x90'
          },
          {
            src: 'uri2',
            sizes: '200x200'
          }
        ]
      }, webManifestUrl);

      var iconUrl = IconsHelper.getBestIconFromWebManifest(webManifest);
      assert.isNotNull(iconUrl);
      assert.equal((new URL(iconUrl)).pathname, '/uri1');
    });

    test('With higher dpi', () => {
      // With dpr = 1.5
      dpr = 1.5;
      webManifest = WebManifestHelper.processRawManifest({
        icons: [
          {
            src: 'uri1',
            sizes: '90x90'
          },
          {
            src: 'uri2',
            sizes: '180x180'
          },
          {
            src: 'uri3',
            sizes: '500x500'
          }
        ]
      }, webManifestUrl);

      var iconUrl = IconsHelper.getBestIconFromWebManifest(webManifest);
      assert.isNotNull(iconUrl);
      assert.equal((new URL(iconUrl)).pathname, '/uri2');
      dpr = 1;
    });

    test('Specific icon size', () => {
      // With dpr = 1.5
      dpr = 1.5;
      webManifest = WebManifestHelper.processRawManifest({
        icons: [
          {
            src: 'uri1',
            sizes: '90x90'
          },
          {
            src: 'uri2',
            sizes: '190x190'
          },
          {
            src: 'uri3',
            sizes: '500x500'
          }
        ]
      }, webManifestUrl);

      // With dpr 1.5 we should get icon 'uri2'
      // Let's ask for a bigger size.

      var iconUrl = IconsHelper.getBestIconFromWebManifest(webManifest, 400);
      assert.isNotNull(iconUrl);
      assert.equal((new URL(iconUrl)).pathname, '/uri3');
      dpr = 1;
    });
  });

  suite('IconsHelper.getBestIconFromMetaTags()', () => {
    test('Get correct icon with no size', () => {
      var icons = {
        'uri1': {
          sizes: []
        }
      };

      var iconUrl = IconsHelper.getBestIconFromMetaTags(icons);
      assert.isNotNull(iconUrl);
      assert.equal(iconUrl, 'uri1');
    });

    test('Get icon with size', () => {
      var icons = {
        'uri1': {
          sizes: []
        },
        'uri2': {
          sizes: ['16x16']
        }
      };

      var iconUrl = IconsHelper.getBestIconFromMetaTags(icons);
      assert.isNotNull(iconUrl);
      assert.equal(iconUrl, 'uri2');
    });

    test('Get best icon which doesn\'t match specific size', () => {
      // With dpr = 1
      var icons = {
        'uri1': {
          sizes: ['90x90']
        },
        'uri2': {
          sizes: ['200x200']
        }
      };

      var iconUrl = IconsHelper.getBestIconFromMetaTags(icons);
      assert.isNotNull(iconUrl);
      assert.equal(iconUrl, 'uri1');
    });

    test('With higher dpi', () => {
      // With dpr = 1.5
      dpr = 1.5;
      var icons = {
        'uri1': {
          sizes: ['90x90']
        },
        'uri2': {
          sizes: ['180x180']
        },
        'uri3': {
          sizes: ['500x500']
        }
      };
      var iconUrl = IconsHelper.getBestIconFromMetaTags(icons);
      assert.isNotNull(iconUrl);
      assert.equal(iconUrl, 'uri2');
      dpr = 1;
    });

    test('Specific icon size', () => {
      // With dpr = 1.5
      dpr = 1.5;
      var icons = {
        'uri1': {
          sizes: ['90x90']
        },
        'uri2': {
          sizes: ['200x200']
        },
        'uri3': {
          sizes: ['500x500']
        }
      };

      // With dpr 1.5 we should get icon 'uri2'
      // Let's ask for a bigger size.

      var iconUrl = IconsHelper.getBestIconFromMetaTags(icons, 400);
      assert.isNotNull(iconUrl);
      assert.equal(iconUrl, 'uri3');
      dpr = 1;
    });
  });

  suite('IconsHelper.getNearestSize()', () => {
    suite('No size information', () => {
      test('Single element with no size info', () => {
        var sizes = [];
        var result = IconsHelper.getNearestSize(sizes, 64);
        assert.equal(result, -1);
      });

      test('Several items one without size info', () => {
        var sizes = [undefined, '10x10', ''];

        var result = IconsHelper.getNearestSize(sizes, 64);
        assert.isNotNull(result);
        assert.equal(result, '10');
      });
    });

    suite('Correct size', () => {
      test('Check sizes detected', () => {
        var sizes = ['10x10', '20x20', '30x30'];

        var result = IconsHelper.getNearestSize(sizes, 24);
        assert.isNotNull(result);
        // nearestSize picks the nearest - larger or smaller
        assert.equal(result, 20);
      });

      test('Check with incorrect file sizes', () => {
        var sizes = ['10', '', '30x30', 'x'];
        var result = IconsHelper.getNearestSize(sizes, 24);
        assert.equal(result, 30);
      });

      test('bestMatch param', () => {
        var sizes = ['10x10', '20x20', '30x30'];
        var result = IconsHelper.getNearestSize(sizes, 64, 40);
        assert.equal(result, 40);
      });
    });
  });

  suite('IconsHelper.fetchIcon()', () => {
    var createElementStub, createObjectURLStub;

    function getStubs(naturalWidth = 32) {
      createElementStub = sinon.stub(document, 'createElement', () => {
        return {
          src: '',
          naturalWidth: naturalWidth,
          naturalHeight: 32,
          set onload(fn) {
            fn();
          },
          onerror: null
        };
      });
      createObjectURLStub = sinon.stub(URL, 'createObjectURL', url => url);
    }

    teardown(() => {
      createElementStub.restore();
      createObjectURLStub.restore();
      MockXMLHttpRequest.mTeardown();
    });

    test('Should resolve to an object', done => {
      getStubs();
      IconsHelper.fetchIcon('http://example.com')
        .then((iconObject) => {
          assert.isTrue(createObjectURLStub.calledOnce);
          assert.isObject(iconObject);
          assert.equal(iconObject.blob, 'abc');
          assert.equal(iconObject.size, '32');
          done();
        })
        .catch(() => {
          assert.isTrue(false, 'Should not throw.');
          done();
        });
      MockXMLHttpRequest.mSendReadyState();
      MockXMLHttpRequest.mSendOnLoad({response: 'abc'});
    });

    test('Should return the largest side of the image', done => {
      getStubs(512);
      IconsHelper.fetchIcon('http://example.com')
        .then((iconObject) => {
          assert.equal(iconObject.size, '512');
          done();
        })
        .catch(() => {
          assert.isTrue(false, 'Should not throw.');
          done();
        });
      MockXMLHttpRequest.mSendReadyState();
      MockXMLHttpRequest.mSendOnLoad({response: 'abc'});
    });

    test('getBestIconFromWebManifest', function() {
      var manifest1 = WebManifestHelper.processRawManifest({
        'icons': [
          {
            'src': 'icon-64.png',
            'sizes': '32x32 64x64',
            'type': 'image/png'
          },
          {
            'src': 'icon-128.png',
            'sizes': '128x128',
            'type': 'image/png'
          }
        ]
      }, 'http://example.com/manifest.json');

      var manifest2 = WebManifestHelper.processRawManifest({
        'icons': [
          {
            'src': 'icon-with-no-sizes.png',
            'type': 'image/png'
          },
          {
            'src': 'icon-128.png',
            'sizes': '128x128',
            'type': 'image/png'
          }
        ]
      }, 'http://example.com/manifest.json');

      var manifest3 = WebManifestHelper.processRawManifest({
        'icons': []
      }, 'http://example.com/manifest.json');

      var url = IconsHelper.getBestIconFromWebManifest(manifest1, 64);
      assert.equal(url, 'http://example.com/icon-64.png');

      url = IconsHelper.getBestIconFromWebManifest(manifest2, 64);
      assert.equal(url, 'http://example.com/icon-128.png');

      url = IconsHelper.getBestIconFromWebManifest(manifest3, 64);
      assert.equal(url, null);
    });
  });
});
