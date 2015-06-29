'use strict';

/* global WebManifestHelper, teardown, suite, test,
   assert, MockXMLHttpRequest, setup */

require('/shared/js/web_manifest_helper.js');
require('/shared/test/unit/mocks/mock_xml_http_request.js');

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
    WebManifestHelper.getManifest('http://example.com/webmanifest.json').then(
      function (result) {
        assert.ok(result);
        done();
      },
      function (err) {
        console.error(err);
        done(err);
      }
    );
    MockXMLHttpRequest.triggerReadyStateChange({
      'status': 200,
      'response': {
        'icons': [
          {
            'src': 'icon-64.png',
            'sizes': '32x32 64x64',
            'type': 'image/png'
          }
        ]
      }
    });

  });

  test('processRawManifest()', function() {
    var manifestURL = 'http://www.example.com/manifest.json';
    var manifest = WebManifestHelper.processRawManifest({
      'icons': [
        {
          'src': 'icon-64.png',
          'sizes': '32x32 64x64',
          'type': 'image/png'
        },
        {
          'bogus-entry': true,
          'sizes': '128x128',
          'type': 'image/png'
        }
      ]
    }, 'http://www.example.com/manifest.json');
    assert.equal(1, manifest.icons.length);
    assert.equal(typeof manifest.icons[0], 'object');
    assert.equal(typeof manifest.icons[0].src, 'object');
    var expectedURL = new URL(manifestURL);
    expectedURL.pathname = 'icon-64.png';
    assert.equal(manifest.icons[0].src.href, expectedURL);
  });

});
