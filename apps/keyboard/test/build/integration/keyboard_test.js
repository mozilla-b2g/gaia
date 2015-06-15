'use strict';

/* jshint node: true, mocha: true */
/* global suiteSetup */

var assert = require('chai').assert;
var path = require('path');
var fs = require('fs');
var helper = require('helper');
var AdmZip = require('adm-zip');
var jsdom = require('jsdom-nogyp').jsdom;

suite('Keyboard layouts building tests', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  // default make -- build with selected layouts and dictionaries
  test('APP=keyboard make', function(done) {
    var cmd = 'APP=keyboard make';
    helper.exec(cmd, function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);

      var config = JSON.parse(process.env.BUILD_CONFIG);
      var layoutIds = ['ar',
                       'bn-Avro',
                       'bn-Probhat',
                       'de',
                       'dz-BT',
                       'en',
                       'en-Colemak',
                       'en-Dvorak',
                       'en-Neo',
                       'eo',
                       'es',
                       'es-Americas',
                       'fr',
                       'fr-CA',
                       'fr-CH',
                       'fr-Dvorak-bepo',
                       'he',
                       'hi',
                       'ig',
                       'ko',
                       'ln',
                       'mk',
                       'my',
                       'pl',
                       'pt-BR',
                       'ta',
                       'te',
                       'th',
                       'uk',
                       'vi-Qwerty',
                       'vi-Telex',
                       'vi-Typewriter',
                       'wo',
                       'zh-Hans-Pinyin'];
      var zipPath = path.join(process.cwd(), 'profile',
        'webapps', 'keyboard.gaiamobile.org', 'application.zip');
      var appDirPath = config.GAIA_DIR + '/apps/keyboard';

      var layouts = layoutIds.map(function(layout) {
        return 'js/layouts/' + layout + '.js';
      });

      // Unfortunately we can only whilelist files here because we shouldn't
      // throw error if excluded files are missing (e.g. README).
      var imes = [
        'js/imes/jshangul/jshangul.js',
        'js/imes/jspinyin/empinyin_files.data',
        'js/imes/jspinyin/empinyin_files.js',
        'js/imes/jspinyin/jspinyin.js',
        'js/imes/jspinyin/libpinyin.js',
        'js/imes/jspinyin/worker.js',
        'js/imes/latin/latin.js',
        'js/imes/latin/predictions.js',
        'js/imes/latin/worker.js'
      ];

      var dicts = [
        'js/imes/latin/dictionaries/de.dict',
        'js/imes/latin/dictionaries/en_us.dict',
        'js/imes/latin/dictionaries/es.dict',
        'js/imes/latin/dictionaries/fr.dict',
        'js/imes/latin/dictionaries/pl.dict',
        'js/imes/latin/dictionaries/pt_br.dict'
      ];

      var checkList = [].concat(layouts, imes, dicts);
      checkList.forEach(function(path) {
        helper.checkFileInZip(zipPath, path, appDirPath + '/' + path);
      });

      // Verify inputs entry in manifest
      var zip = new AdmZip(zipPath);
      var entry = zip.getEntry('manifest.webapp');
      var manifest = JSON.parse(zip.readAsText(entry));
      var inputKeysInManifest = Object.keys(manifest.inputs);

      assert.deepEqual(inputKeysInManifest.sort(),
                       [].concat(layoutIds, 'number').sort());

      // Verify dictionary config
      var dictJSON = JSON.parse(fs.readFileSync(
            appDirPath +
            '/test/build/integration/resources/' +
            'default-make-layouts.json'));

      helper.checkFileContentInZip(
        zipPath, 'js/settings/layouts.json', dictJSON, true);

      done();
    });
  });

  // Build with all layouts and dictionaries
  test('APP=keyboard GAIA_KEYBOARD_LAYOUTS=* make', function(done) {
    var cmd = 'APP=keyboard GAIA_KEYBOARD_LAYOUTS=* make';
    helper.exec(cmd, function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);

      var config = JSON.parse(process.env.BUILD_CONFIG);
      var zipPath = path.join(process.cwd(), 'profile',
        'webapps', 'keyboard.gaiamobile.org', 'application.zip');
      var appDirPath = config.GAIA_DIR + '/apps/keyboard';
      var layoutIds =
        fs.readdirSync(appDirPath + '/js/layouts').filter(function(filename) {
          return (path.extname(filename) === '.js');
        }).map(function(filename) {
          return path.basename(filename, '.js');
        }).filter(function(layoutId) {
          // Exclude noIncludeInExpandLayoutIdSet layouts
          return (['emoji'].indexOf(layoutId) === -1);
        });

      var layouts = layoutIds.map(function(layout) {
        return 'js/layouts/' + layout + '.js';
      });

      // Unfortunately we can only whilelist files here because we shouldn't
      // throw error if excluded files are missing (e.g. README).

      // For the sake of simplicity let's only check the main scripts.
      var imes = [
        'js/imes/handwriting/handwriting.js',
        'js/imes/india/india.js',
        'js/imes/jshangul/jshangul.js',
        'js/imes/jskanji/jskanji.js',
        'js/imes/jspinyin/jspinyin.js',
        'js/imes/latin/latin.js',
        'js/imes/vietnamese/vietnamese.js',
        'js/imes/myanmar/myanmar.js'
      ];

      var dicts = [
        'js/imes/latin/dictionaries/bg.dict',
        'js/imes/latin/dictionaries/bs.dict',
        'js/imes/latin/dictionaries/ca.dict',
        'js/imes/latin/dictionaries/cs.dict',
        'js/imes/latin/dictionaries/da.dict',
        'js/imes/latin/dictionaries/de.dict',
        'js/imes/latin/dictionaries/el.dict',
        'js/imes/latin/dictionaries/en_gb.dict',
        'js/imes/latin/dictionaries/en_us.dict',
        'js/imes/latin/dictionaries/es.dict',
        'js/imes/latin/dictionaries/eu.dict',
        'js/imes/latin/dictionaries/fr.dict',
        'js/imes/latin/dictionaries/ga.dict',
        'js/imes/latin/dictionaries/gd.dict',
        'js/imes/latin/dictionaries/gl.dict',
        'js/imes/latin/dictionaries/gv.dict',
        'js/imes/latin/dictionaries/hr.dict',
        'js/imes/latin/dictionaries/hu.dict',
        'js/imes/latin/dictionaries/it.dict',
        'js/imes/latin/dictionaries/lt.dict',
        'js/imes/latin/dictionaries/lv.dict',
        'js/imes/latin/dictionaries/nb.dict',
        'js/imes/latin/dictionaries/nl.dict',
        'js/imes/latin/dictionaries/pl.dict',
        'js/imes/latin/dictionaries/pt_br.dict',
        'js/imes/latin/dictionaries/pt_pt.dict',
        'js/imes/latin/dictionaries/ro.dict',
        'js/imes/latin/dictionaries/ru.dict',
        'js/imes/latin/dictionaries/sk.dict',
        'js/imes/latin/dictionaries/sq.dict',
        'js/imes/latin/dictionaries/sr-Cyrl.dict',
        'js/imes/latin/dictionaries/sr-Latn.dict',
        'js/imes/latin/dictionaries/sv.dict',
        'js/imes/latin/dictionaries/tr.dict',
        'js/imes/latin/dictionaries/af.dict'
      ];

      var checkList = [].concat(layouts, imes, dicts);
      checkList.forEach(function(path) {
        helper.checkFileInZip(zipPath, path, appDirPath + '/' + path);
      });

      // Verify inputs entry in manifest
      var zip = new AdmZip(zipPath);
      var entry = zip.getEntry('manifest.webapp');
      var manifest = JSON.parse(zip.readAsText(entry));
      var inputKeysInManifest = Object.keys(manifest.inputs);

      assert.deepEqual(inputKeysInManifest.sort(),
                       [].concat(layoutIds, 'number').sort());

      // Verify dictionary config
      var dictJSON = JSON.parse(fs.readFileSync(
            appDirPath +
            '/test/build/integration/resources/' +
            'all-layout-make-layouts.json'));

      helper.checkFileContentInZip(
        zipPath, 'js/settings/layouts.json', dictJSON, true);

      done();
    });
  });

  // Build with all layouts with no dictionaries
  // (preload ko layout here to avoid empty check.)
  test('APP=keyboard GAIA_KEYBOARD_LAYOUTS=ko ' +
    'GAIA_KEYBOARD_DOWNLOADABLE_LAYOUTS=noPreloadDictRequired make',
  function(done) {
    var cmd = 'APP=keyboard GAIA_KEYBOARD_LAYOUTS=ko ' +
    'GAIA_KEYBOARD_DOWNLOADABLE_LAYOUTS=noPreloadDictRequired make';
    helper.exec(cmd, function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);

      var config = JSON.parse(process.env.BUILD_CONFIG);
      var zipPath = path.join(process.cwd(), 'profile',
        'webapps', 'keyboard.gaiamobile.org', 'application.zip');
      var appDirPath = config.GAIA_DIR + '/apps/keyboard';

      // For this test, we verify there isn't any dictionary
      // in the zip.
      var zip = new AdmZip(zipPath);
      var entries = zip.getEntries();
      var imePath = 'js/imes';
      var sizeLimit = (1 << 10) * 100; // 100K
      entries.forEach(function(entry) {
        if (entry.entryName.substr(0, imePath.length) !== imePath) {
          return;
        }

        var fileSize = entry.getData().length;
        assert.isTrue(fileSize < sizeLimit,
          'IME file is larger than non-dictionary limit: ' + entry.entryName +
          ', size: ' + fileSize + ' bytes.');
      });

      // Verify dictionary config
      var dictJSON = JSON.parse(fs.readFileSync(
            appDirPath +
            '/test/build/integration/resources/' +
            'no-preload-dict-required-make-layouts.json'));

      helper.checkFileContentInZip(
        zipPath, 'js/settings/layouts.json', dictJSON, true);

      done();
    });
  });

  // Build default layouts with only en dictionary, and extra IMEs
  test('APP=keyboard GAIA_KEYBOARD_LAYOUTS=en ' +
    'GAIA_KEYBOARD_DOWNLOADABLE_LAYOUTS=' +
    'en,pt-BR,es,de,fr,fr-CA,pl,ko,zh-Hans-Pinyin,en-Dvorak make',
  function(done) {
    var cmd = 'APP=keyboard GAIA_KEYBOARD_LAYOUTS=en ' +
      'GAIA_KEYBOARD_DOWNLOADABLE_LAYOUTS=' +
      'en,pt-BR,es,de,fr,fr-CA,pl,ko,zh-Hans-Pinyin,en-Dvorak make';
    helper.exec(cmd, function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);

      var config = JSON.parse(process.env.BUILD_CONFIG);
      var zipPath = path.join(process.cwd(), 'profile',
        'webapps', 'keyboard.gaiamobile.org', 'application.zip');
      var appDirPath = config.GAIA_DIR + '/apps/keyboard';
      var layoutIds = config.GAIA_KEYBOARD_LAYOUTS.split(',').sort();

      var layouts = layoutIds.map(function(layout) {
        return 'js/layouts/' + layout + '.js';
      });

      // Unfortunately we can only whilelist files here because we shouldn't
      // throw error if excluded files are missing (e.g. README).
      var imes = [
        'js/imes/jshangul/jshangul.js',
        'js/imes/jspinyin/empinyin_files.data',
        'js/imes/jspinyin/empinyin_files.js',
        'js/imes/jspinyin/jspinyin.js',
        'js/imes/jspinyin/libpinyin.js',
        'js/imes/jspinyin/worker.js',
        'js/imes/latin/latin.js',
        'js/imes/latin/predictions.js',
        'js/imes/latin/worker.js'
      ];

      var dicts = [
        'js/imes/latin/dictionaries/es.dict',
        'js/imes/latin/dictionaries/fr.dict',
        'js/imes/latin/dictionaries/pl.dict',
        'js/imes/latin/dictionaries/pt_br.dict'
      ];

      var checkList = [].concat(layouts, imes);
      checkList.forEach(function(path) {
        helper.checkFileInZip(zipPath, path, appDirPath + '/' + path);
      });

      // Verify inputs entry in manifest
      var zip = new AdmZip(zipPath);
      var entry = zip.getEntry('manifest.webapp');
      var manifest = JSON.parse(zip.readAsText(entry));
      var inputKeysInManifest = Object.keys(manifest.inputs);

      // Only layouts with dictionaries should be declaried.
      // Noted that en-Dvorak use the same dictionary as en so it should also
      // be declaried.
      assert.deepEqual(inputKeysInManifest.sort(),
        ['en', 'en-Dvorak', 'ko', 'number', 'zh-Hans-Pinyin']);

      // Verify dictionaries are not built (except en_us.dict)
      dicts.forEach(function(dict) {
        var entry = zip.getEntry(dict);
        assert.equal(entry, null, 'Dictionary should not be built: ' + dict);
      });

      // Verify dictionary config
      var dictJSON = JSON.parse(fs.readFileSync(
            appDirPath +
            '/test/build/integration/resources/' +
            'default-make-en-dict-layouts.json'));

      helper.checkFileContentInZip(
        zipPath, 'js/settings/layouts.json', dictJSON, true);

      done();
    });
  });
});

suite('Keyboard settings building tests', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  // parse settings.html and return domDoc.
  var getSettingsDomDoc = function() {
    var zipPath = path.join(process.cwd(), 'profile',
      'webapps', 'keyboard.gaiamobile.org', 'application.zip');

    // Verify settings.html content in manifest
    var zip = new AdmZip(zipPath);
    var entry = zip.getEntry('settings.html');
    return jsdom(zip.readAsText(entry));
  };

  // return an array of <scripts> tag in <head>
  var getScriptsFromDomDoc = function(domDoc) {
    // We don't have Array.from in our node version, so use an old way to
    // convert HTMLCollections to array
    return Array.prototype.slice.call(
             domDoc.head.getElementsByTagName('script'));
  };

  suite('For handwriting', function() {
    // return an array of <sections> in the general panel
    var getSectionsFromGeneralPanel = function(domDoc) {
      return Array.prototype.slice.call(
               domDoc.querySelectorAll('#general-container > section'));
    };

    // default: there shouldn't be handwriting elements in resulting file
    test('APP=keyboard make', function(done) {
      var cmd = 'APP=keyboard make';
      helper.exec(cmd, function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);

        var settingsDOMDoc = getSettingsDomDoc();

        assert.isTrue(getScriptsFromDomDoc(settingsDOMDoc).every(function(elem){
          return elem.src !== 'js/settings/handwriting_settings_view.js';
        }), 'No script should include handwriting_settings_view.js');

        assert.isTrue(
        getSectionsFromGeneralPanel(settingsDOMDoc).every(function(elem){
          return elem.id !== 'handwriting-settings';
        }), 'No section in general panel should include handwriting settings');

        done();
      });
    });

    test('GAIA_KEYBOARD_LAYOUTS=zh-Hans-Handwriting APP=keyboard make',
    function(done) {
      var cmd = 'GAIA_KEYBOARD_LAYOUTS=zh-Hans-Handwriting APP=keyboard make';
      helper.exec(cmd, function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);

        var settingsDOMDoc = getSettingsDomDoc();

        assert.isTrue(getScriptsFromDomDoc(settingsDOMDoc).some(function(elem){
          return elem.src === 'js/settings/handwriting_settings_view.js';
        }), 'Some script should include handwriting_settings_view.js');

        assert.isTrue(
        getSectionsFromGeneralPanel(settingsDOMDoc).some(function(elem){
          return elem.id === 'handwriting-settings';
        }),
          'Some section in general panel should include handwriting settings');

        done();
      });
    });
  });
});
