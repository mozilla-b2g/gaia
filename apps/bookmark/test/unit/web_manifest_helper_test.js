'use strict';

/* global WebManifestHelper, requireApp, teardown, suite, test,
   assert, MockXMLHttpRequest, setup */

requireApp('bookmark/js/web_manifest_helper.js');
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
});
