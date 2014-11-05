/* global assert, require, suite, test */
'use strict';

require('/js/built_in_ringtones.js');

suite('built-in ringtones', function() {
  var toneTypes = ['ringtone', 'alerttone'];
  var baseURLs = {
    'ringtone': '/shared/resources/media/ringtones/',
    'alerttone': '/shared/resources/media/notifications/'
  };

  test('toneTypes', function() {
    assert.equal(window.builtInRingtones.toneTypes.toString(),
                 toneTypes.toString());
  });

  toneTypes.forEach(function(toneType) {

    test('list(\'' + toneType + '\')', function(done) {
      window.builtInRingtones.list(toneType).then(function(tones) {
        done(function() {
          assert.ok(Array.isArray(tones));
          tones.forEach(function(tone) {
            assert.ok(new RegExp('^builtin:' + toneType + '/').test(tone.id));
            assert.equal(tone.url.substr(0, baseURLs[toneType].length),
                         baseURLs[toneType]);
            assert.equal(tone.shareable, true);
            assert.equal(tone.deletable, false);
          });
        });
      }, function(error) {
        done(error);
      });
    });

    test('get(toneID)', function(done) {
      window.builtInRingtones.list(toneType).then(function(tones) {
        var expectedTone = tones[0];
        var toneID = expectedTone.id;
        window.builtInRingtones.get(toneID).then(function(tone) {
          done(function() {
            assert.equal(tone.id, expectedTone.id);
            assert.equal(tone.l10nID, expectedTone.l10nID);
            assert.equal(tone.url.substr(0, baseURLs[toneType].length),
                         baseURLs[toneType]);
            assert.equal(tone.shareable, true);
            assert.equal(tone.deletable, false);
          });
        }, function(error) {
          done(error);
        });
      });
    });

  });
});
