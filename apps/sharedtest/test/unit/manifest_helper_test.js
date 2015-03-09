'use strict';

/* global ManifestHelper */

require('/shared/js/manifest_helper.js');

suite('Manifest Helper', function() {

  var manifest = {
    'name': 'Long Name'
  };

  var manifestWithShortName = {
    'name': 'Long Name',
    'short_name': 'Short Name'
  };

  test('displayName with short name', function() {
    var helper = new ManifestHelper(manifestWithShortName);
    assert.equal('Short Name', helper.displayName);
  });

  test('displayName with no short name', function() {
    var helper = new ManifestHelper(manifest);
    assert.equal('Long Name', helper.displayName);
  });

});
