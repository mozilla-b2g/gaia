'use strict';
/* global loadBodyHTML */
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/everythingme/eme.js');
require('/shared/js/everythingme/api.js');
require('/shared/js/everythingme/cache.js');
require('/shared/js/everythingme/device.js');

suite('suggestions.js > ', function() {

  setup(function(done) {
    loadBodyHTML('/create.html');
    requireApp('collection/js/suggestions.js', function() {
      initialize();
      assert.true(Suggestions);
      done();
    });
  });

  test('Scrolls on hashchange', function() {

    assert.isTrue(Suggestions);
  });

});
