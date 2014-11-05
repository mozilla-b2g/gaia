/* global MockGetDeviceStorage, MockGetDeviceStorages, MockEnumerateAll,
   assert, require, setup, suite, suiteSetup, suiteTeardown,
   teardown, test */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_getdevicestorage.js');
require('/shared/test/unit/mocks/mock_navigator_getdevicestorages.js');
require('/test/unit/mock_enumerate_all.js');

suite('sd card ringtones', function() {
  var toneTypes = ['ringtone', 'alerttone'];
  var folderNames = {'ringtone': 'Ringtones', 'alerttone': 'Notifications'};

  var realDeviceStorage, realDeviceStorages;

  suiteSetup(function(done) {
    realDeviceStorages = navigator.getDeviceStorages;
    navigator.getDeviceStorages = MockGetDeviceStorages;

    realDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockGetDeviceStorage;

    window.enumerateAll = MockEnumerateAll;
    require('/js/sd_card_ringtones.js', function() {
      done();
    });
  });

  suiteTeardown(function() {
    navigator.getDeviceStorages = realDeviceStorages;
    realDeviceStorages = null;

    navigator.getDeviceStorage = realDeviceStorage;
    realDeviceStorage = null;
  });

  toneTypes.forEach(function(toneType) {
    suite(toneType, function() {

      suite('empty sd card', function() {
        test('list()', function(done) {
          window.sdCardRingtones.list(toneType).then(function(tones) {
            done(function() {
              assert.ok(Array.isArray(tones));
              assert.equal(tones.length, 0);
            });
          }, function(error) {
            done(error);
          });
        });
      });

      suite('non-empty sd card', function() {
        setup(function() {
          MockEnumerateAll.files[folderNames.ringtone] = [
            'ringtone-1.mp3', 'folder/ringtone-2.mp3', '.ringtone-3.mp3',
            '.hidden/ringtone-4.mp3'
          ];
          MockEnumerateAll.files[folderNames.alerttone] = [
            'alerttone-1.mp3', 'folder/alerttone-2.mp3', '.alerttone-3.mp3',
            '.hidden/alerttone-4.mp3'];
        });

        teardown(function() {
          MockEnumerateAll.files = {};
        });

        test('list()', function(done) {
          window.sdCardRingtones.list(toneType).then(function(tones) {
            done(function() {
              assert.ok(Array.isArray(tones));
              assert.equal(tones.length, 2);

              var expected = [
                { name: toneType + '-1',
                  filename: folderNames[toneType] + '/' + toneType + '-1.mp3' },
                { name: toneType + '-2',
                  filename: folderNames[toneType] + '/folder/' + toneType +
                            '-2.mp3' }
              ];
              for (var i = 0; i < expected.length; i++) {
                assert.equal(tones[i].name, expected[i].name);
                assert.equal(tones[i].filename, expected[i].filename);
                assert.equal(tones[i].id, 'sdcard:' + expected[i].filename);
                assert.equal(tones[i].shareable, true);
                assert.equal(tones[i].deletable, true);
              }
            });
          }, function(error) {
            done(error);
          });
        });

        test('get()', function(done) {
          var filename = folderNames[toneType] + '/' + toneType + '-1.mp3';
          var id = 'sdcard:' + filename;
          window.sdCardRingtones.get(id).then(function(tone) {
            done(function() {
              assert.equal(tone.name, toneType + '-1');
              assert.equal(tone.filename, filename);
              assert.equal(tone.id, id);
              assert.equal(tone.shareable, true);
              assert.equal(tone.deletable, true);
            });
          }, function(error) {
            done(error);
          });
        });
      });

    });
  });
});
