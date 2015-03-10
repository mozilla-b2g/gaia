/* global assert, require, setup, suite, test */
'use strict';

require('/js/custom_ringtones.js');

suite('custom ringtones', function() {
  var testBlob;

  setup(function(done) {
    testBlob = new Blob();
    window.customRingtones.clear().then(function() {
      done();
    });
  });

  suite('empty database', function() {

    test('list()', function(done) {
      window.customRingtones.list().then(function(tones) {
        done(function() {
          assert.ok(Array.isArray(tones));
          assert.equal(tones.length, 0);
        });
      }, function(error) {
        done(error);
      });
    });

    test('add()', function(done) {
      var info = {name: 'My ringtone', blob: testBlob};
      // Add a ringtone, and then get the blob from it and test everything!
      window.customRingtones.add(info).then(function(tone) {
        return tone.getBlob().then(function(blob) {
          return {tone: tone, blob: blob};
        });
      }).then(function(result) {
        done(function() {
          assert.equal(result.tone.name, 'My ringtone');
          assert.ok(/^custom:/.test(result.tone.id));
          assert.ok(/^blob:/.test(result.tone.url));
          assert.equal(result.blob, testBlob);
          assert.equal(result.tone.shareable, true);
          assert.equal(result.tone.deletable, true);
        });
      }, function(error) {
        done(error);
      });
    });

  });

  suite('non-empty database', function() {

    var testTone;

    var toneDeepEqual = function (test, expected, msg) {
      assert.equal(test.name, expected.name, msg);
      assert.equal(test.blob, expected.blob, msg);
      assert.equal(test.id, expected.id, msg);
      assert.equal(test.subtitle, expected.subtitle, msg);
    };

    setup(function(done) {
      var info = {name: 'My ringtone', blob: testBlob};
      window.customRingtones.add(info).then(function(tone) {
        testTone = tone;
        done();
      }, function(error) {
        done(error);
      });
    });

    test('list()', function(done) {
      window.customRingtones.list().then(function(tones) {
        done(function() {
          assert.ok(Array.isArray(tones));
          assert.equal(tones.length, 1);
          toneDeepEqual(tones[0], testTone);
        });
      }, function(error) {
        done(error);
      });
    });

    test('remove()', function(done) {
      window.customRingtones.remove(testTone.id).then(function() {
        return window.customRingtones.list().then(function(tones) {
          return tones;
        });
      }).then(function(tones) {
        done(function() {
          assert.equal(tones.length, 0);
        });
      }, function(error) {
        done(error);
      });
    });

    test('get()', function(done) {
      window.customRingtones.get(testTone.id).then(function(tone) {
        done(function() {
          toneDeepEqual(tone, testTone);
        });
      }, function(error) {
        done(error);
      });
    });
  });

  suite('deduplication', function() {

    var toneID;

    setup(function(done) {
      var info = {name: 'My ringtone'};
      window.customRingtones.add(info).then(function(tone) {
        toneID = tone.id;
        done();
      }, function(error) {
        done(error);
      });
    });

    test('add with explicit num', function(done) {
      var info = {name: 'My other ringtone (2)'};
      window.customRingtones.add(info).then(function(tone) {
        done(function() {
          assert.equal(tone.name, info.name);
        });
      }, function(error) {
        done(error);
      });
    });

    test('add with explicit num of 0', function(done) {
      var info = {name: 'My other ringtone (0)'};
      window.customRingtones.add(info).then(function(tone) {
        done(function() {
          assert.equal(tone.name, info.name);
        });
      }, function(error) {
        done(error);
      });
    });

    test('add duplicate', function(done) {
      var info = {name: 'My ringtone'};
      window.customRingtones.add(info).then(function(tone) {
        done(function() {
          assert.equal(tone.name, info.name + ' (1)');
        });
      }, function(error) {
        done(error);
      });
    });

    test('add duplicate with different subtitle', function(done) {
      var info = {name: 'My ringtone', subtitle: 'Bob\'s Ringtones'};
      window.customRingtones.add(info).then(function(tone) {
        done(function() {
          assert.equal(tone.name, info.name);
        });
      }, function(error) {
        done(error);
      });
    });

    test('add duplicate with explicit num', function(done) {
      var info = {name: 'My ringtone'};
      window.customRingtones.add(info).then(function(tone) {
        var info2 = {name: 'My ringtone (1)'};
        return window.customRingtones.add(info2);
      }).then(function(tone) {
        done(function() {
          assert.equal(tone.name, info.name + ' (2)');
        });
      }, function(error) {
        done(error);
      });
    });

    // This test ensure that if we have "My ringtone (1)" but no "My ringtone",
    // we can add a ringtone named "My ringtone" (without a unique num)
    test('add duplicate with missing unique nums', function(done) {
      var info = {name: 'My ringtone'};
      window.customRingtones.add(info).then(function(tone) {
        return window.customRingtones.remove(toneID);
      }).then(function() {
        return window.customRingtones.add(info);
      }).then(function(tone) {
        done(function() {
          assert.equal(tone.name, info.name);
        });
      }, function(error) {
        done(error);
      });
    });

  });
});
