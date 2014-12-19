'use strict';

/* global require, suite, process, test, suiteSetup, teardown */

var assert = require('chai').assert;
var path = require('path');
var helper = require('helper');
var AdmZip = require('adm-zip');

suite('Keyboard tests', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  test('APP=keyboard make, checking keyboard are available',
    function(done) {
      var cmd = 'APP=keyboard make';
      helper.exec(cmd, function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);

        var keyboard = new AdmZip(path.join(process.cwd(), 'profile',
        'webapps', 'keyboard.gaiamobile.org', 'application.zip'));
        var files = keyboard.getEntries();
        var config = JSON.parse(process.env.BUILD_CONFIG);
        var defaultLayouts = config.GAIA_KEYBOARD_LAYOUTS.split(',').sort();
        var layouts = defaultLayouts.map(function(layout) {
          return 'js/layouts/' + layout + '.js';
        });
        var imes = [
          'js/imes/jshangul/',
          'js/imes/jspinyin/',
          'js/imes/latin/'
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

        var result = checkList.every(function(check) {
          return files.some(function(file) {
            return file.entryName.indexOf(check) !== -1;
          });
        });

        assert.isTrue(result, 'necessary files exist in profile folder');

        done();
      });
    });
});
