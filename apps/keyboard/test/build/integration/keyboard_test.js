'use strict';

/* global require, suite, process, test, suiteSetup, teardown */

var assert = require('chai').assert;
var path = require('path');
var fs = require('fs');
var helper = require('helper');
var AdmZip = require('adm-zip');

suite('Keyboard tests', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

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
});
