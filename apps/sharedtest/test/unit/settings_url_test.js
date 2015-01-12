/* global SettingsURL */

require('/shared/js/settings_url.js');

suite('SettingsURL', function() {
  'use strict';
  var subject;

  suiteSetup(function() {
    subject = new SettingsURL();
  });

  test('constructor', function() {
    assert.ok(!subject._url, 'url is empty on init');
    assert.ok(!subject._isBlob, 'isBlob is empty on init');
  });

  test('not a blob', function() {
    var notBlob = 'http://gaiamobile.org';
    subject.set(notBlob);
    assert.ok(!subject._isBlob, 'object is not a blob');
    assert.equal(subject.get(), notBlob);
  });

  test('is a blob', function(done) {

    var domBlob = new Blob(['<span>blob</span>'], { type: 'text/xml' });

    var realCreateObjectURL = window.URL.createObjectURL;
    window.URL.createObjectURL = function() {
      window.URL.createObjectURL = realCreateObjectURL;

      assert.ok(subject._isBlob, 'object is a blob');
      assert.notEqual(subject.get(), domBlob);
      done();
    };

    subject.set(domBlob);
  });
});
