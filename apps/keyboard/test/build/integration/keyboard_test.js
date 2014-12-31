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
      var layoutIds = config.GAIA_KEYBOARD_LAYOUTS.split(',').sort();
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
            'default-make-dictionaries.json'));

      helper.checkFileContentInZip(
        zipPath, 'js/settings/dictionaries.json', dictJSON, true);

      done();
    });
  });

  // Build with all layouts and dictionaries
  test('APP=keyboard GAIA_KEYBOARD_LAYOUTS=* ' +
    'GAIA_KEYBOARD_PRELOAD_DICT_LAYOUTS=* make', function(done) {
    var cmd = 'APP=keyboard GAIA_KEYBOARD_LAYOUTS=* ' +
    'GAIA_KEYBOARD_PRELOAD_DICT_LAYOUTS=* make';
    helper.exec(cmd, function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);

      var config = JSON.parse(process.env.BUILD_CONFIG);
      var zipPath = path.join(process.cwd(), 'profile',
        'webapps', 'keyboard.gaiamobile.org', 'application.zip');
      var appDirPath = config.GAIA_DIR + '/apps/keyboard';
      var layoutIds =
        fs.readdirSync(appDirPath + '/js/layouts').map(function(filename) {
          if (path.extname(filename) !== '.js') {
            return;
          }

          return path.basename(filename, '.js');
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
            'all-layout-make-dictionaries.json'));

      helper.checkFileContentInZip(
        zipPath, 'js/settings/dictionaries.json', dictJSON, true);

      done();
    });
  });

  // Build with all layouts with no dictionaries
  test('APP=keyboard GAIA_KEYBOARD_LAYOUTS=noPreloadDictRequired ' +
    'GAIA_KEYBOARD_PRELOAD_DICT_LAYOUTS="" make',
  function(done) {
    var cmd = 'APP=keyboard GAIA_KEYBOARD_LAYOUTS=noPreloadDictRequired ' +
    'GAIA_KEYBOARD_PRELOAD_DICT_LAYOUTS="" make';
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
            'no-preload-dict-required-make-dictionaries.json'));

      helper.checkFileContentInZip(
        zipPath, 'js/settings/dictionaries.json', dictJSON, true);

      done();
    });
  });

  // Build default layouts with only en dictionary, and extra IMEs
  test('APP=keyboard GAIA_KEYBOARD_PRELOAD_DICT_LAYOUTS=en make',
  function(done) {
    var cmd = 'APP=keyboard GAIA_KEYBOARD_PRELOAD_DICT_LAYOUTS=en make';
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
      assert.deepEqual(inputKeysInManifest.sort(),
        ['en', 'ko', 'number', 'zh-Hans-Pinyin']);

      // Verify dictionaries are not built (except en_us.dict)
      dicts.forEach(function(dict) {
        var entry = zip.getEntry(dict);
        assert.equal(entry, null, 'Dictionary should not be built: ' + dict);
      });

      // Verify dictionary config
      var dictJSON = JSON.parse(fs.readFileSync(
            appDirPath +
            '/test/build/integration/resources/' +
            'default-make-en-dict-dictionaries.json'));

      helper.checkFileContentInZip(
        zipPath, 'js/settings/dictionaries.json', dictJSON, true);

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
    // return an array of <sections> in the root panel
    var getSectionsFromRootPanel = function(domDoc) {
      return Array.prototype.slice.call(
               domDoc.querySelectorAll('#root-container > section'));
    };

    // default: there shouldn't be handwriting elements in resulting file
    test('APP=keyboard make', function(done) {
      var cmd = 'APP=keyboard make';
      helper.exec(cmd, function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);

        var settingsDOMDoc = getSettingsDomDoc();

        assert.isTrue(getScriptsFromDomDoc(settingsDOMDoc).every(function(elem){
          return elem.src !== 'js/settings/handwriting_settings.js';
        }), 'No script should include handwriting_settings.js');

        assert.isTrue(
        getSectionsFromRootPanel(settingsDOMDoc).every(function(elem){
          return elem.id !== 'handwriting-settings';
        }), 'No section in root panel should include handwriting settings');

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
          return elem.src === 'js/settings/handwriting_settings.js';
        }), 'Some script should include handwriting_settings.js');

        assert.isTrue(
        getSectionsFromRootPanel(settingsDOMDoc).some(function(elem){
          return elem.id === 'handwriting-settings';
        }), 'Some section in root panel should include handwriting settings');

        done();
      });
    });
  });

  suite('User dictionary', function() {
    // return an array of <li> in the root panel's first section's ui
    var getLIsFromRootPanel = function(domDoc) {
      return Array.prototype.slice.call(
               domDoc.querySelectorAll('#general-settings > ul > li'));
    };

    // default: there shouldn't be user dictionary elements in resulting file
    test('APP=keyboard make', function(done) {
      var cmd = 'APP=keyboard make';
      helper.exec(cmd, function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);

        var settingsDOMDoc = getSettingsDomDoc();

        assert.isTrue(getScriptsFromDomDoc(settingsDOMDoc).every(function(elem){
          return elem.src !== 'js/settings/user_dictionary_edit_panel.js';
        }), 'No script should include user_dictionary_edit_panel.js');

        assert.isTrue(getScriptsFromDomDoc(settingsDOMDoc).every(function(elem){
          return elem.src !== 'js/settings/user_dictionary_list_panel.js';
        }), 'No script should include user_dictionary_list_panel.js');

        assert.isTrue(getScriptsFromDomDoc(settingsDOMDoc).every(function(elem){
          return elem.src !== 'js/settings/user_dictionary.js';
        }), 'No script should include user_dictionary.js');

        assert.isTrue(getScriptsFromDomDoc(settingsDOMDoc).every(function(elem){
          return elem.src !== 'js/settings/panel_controller.js';
        }), 'No script should include panel_controller.js');

        assert.isTrue(getLIsFromRootPanel(settingsDOMDoc).every(function(elem){
          return elem.querySelector('a#menu-userdict') === null;
        }), 'No <li> in root panel should include user dict settings');

        done();
      });
    });

    test('GAIA_KEYBOARD_ENABLE_USER_DICT=1 APP=keyboard make', function(done) {
      var cmd = 'GAIA_KEYBOARD_ENABLE_USER_DICT=1 APP=keyboard make';
      helper.exec(cmd, function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);

        var settingsDOMDoc = getSettingsDomDoc();

        assert.isTrue(getScriptsFromDomDoc(settingsDOMDoc).some(function(elem){
          return elem.src === 'js/settings/user_dictionary_edit_panel.js';
        }), 'Some script should include user_dictionary_edit_panel.js');

        assert.isTrue(getScriptsFromDomDoc(settingsDOMDoc).some(function(elem){
          return elem.src === 'js/settings/user_dictionary_list_panel.js';
        }), 'Some script should include user_dictionary_list_panel.js');

        assert.isTrue(getScriptsFromDomDoc(settingsDOMDoc).some(function(elem){
          return elem.src === 'js/settings/user_dictionary.js';
        }), 'Some script should include user_dictionary.js');

        assert.isTrue(getScriptsFromDomDoc(settingsDOMDoc).some(function(elem){
          return elem.src === 'js/settings/panel_controller.js';
        }), 'Some script should include panel_controller.js');

        assert.isTrue(getLIsFromRootPanel(settingsDOMDoc).some(function(elem){
          return elem.querySelector('a#menu-userdict') !== null;
        }), 'Some <li> in root panel should include user dict settings');

        done();
      });
    });
  });
});
