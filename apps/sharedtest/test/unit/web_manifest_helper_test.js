'use strict';

/* global WebManifestHelper, requireApp, teardown, suite, test,
   assert, MockXMLHttpRequest, setup */

require('/shared/js/web_manifest_helper.js');
requireApp('bookmark/test/unit/mock_xml_http_request.js');

suite('Web Manifest Helper >', function() {
  var RealXMLHttpRequest;

  setup(function() {
    RealXMLHttpRequest = window.XMLHttpRequest;
    window.XMLHttpRequest = MockXMLHttpRequest;
  });

  teardown(function() {
    window.XMLHttpRequest = RealXMLHttpRequest;
  });

  test('getManifest()', function(done) {
    WebManifestHelper.getManifest().then(
      function (result) {
        assert.equal(result, 'foo');
        done();
      },
      function (err) {
        done(err);
        console.error(err);
      });
  });

  test('iconURLForSize()', function() {
    var manifest1 = {
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
    };

    var manifest2 = {
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
    };

    var manifest3 = {
      'icons': [
        {
          'src': 'icon-with-no-sizes.png',
          'type': 'image/png'
        },
        {
          'src': 'icon-128.png',
          'type': 'image/png'
        }
      ]
    };

    var url = WebManifestHelper.iconURLForSize(manifest1,
      'http://example.com/manifest.json', 64);
    assert.equal(url, 'http://example.com/icon-64.png');

    url = WebManifestHelper.iconURLForSize(manifest2,
      'http://example.com/manifest.json', 64);
    assert.equal(url, 'http://example.com/icon-128.png');

    url = WebManifestHelper.iconURLForSize(manifest3,
      'http://example.com/manifest.json', 64);
    assert.equal(url, null);
  });
});
