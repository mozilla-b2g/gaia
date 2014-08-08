'use strict';
/* global LanguageList */

require('/shared/js/l10n.js');
require('/shared/js/language_list.js');

suite('Language List', function() {

  suite('get', function() {

    suiteTeardown(function() {
      LanguageList._languages = null;
    });

    setup(function() {
      this.sinon.spy(LanguageList, '_readFile');
      this.sinon.stub(LanguageList, '_readSetting', function(name, callback) {
        return callback(true);
      });
    });

    test('the first time loads languages from file', function(done) {
      LanguageList.get(function() {
        assert.isTrue(LanguageList._readFile.called,
                      '_readFile is called');
        assert.isTrue(LanguageList._readSetting.called,
                      '_readSetting is called');
        assert.isNotNull(LanguageList._languages);
        done();
      });
    });

    test('on consecutive calls loads languages from cache', function(done) {
      LanguageList.get(function() {
        assert.isFalse(LanguageList._readFile.called,
                      '_readFile is not called');
        assert.isTrue(LanguageList._readSetting.called,
                      '_readSetting is called');
        assert.isNotNull(LanguageList._languages);
        done();
      });
    });

  });

  suite('wrap bidi', function() {
    test('wrap bidi', function() {
      assert.equal(LanguageList.wrapBidi('qps-ploc', 'LTR'),
                   '\u202aLTR\u202c');
      assert.equal(LanguageList.wrapBidi('qps-plocm', 'RTL'),
                   '\u202bRTL\u202c');
    });
  });

  suite('build language list', function() {
    test('regular current language, qps disabled', function() {
      var base = {
        en: 'English'
      };
      var langs = LanguageList._extend('en', false, base);
      assert.ok('en' in langs, 'en is listed');
    });

    test('regular current language, qps enabled', function() {
      var base = {
        en: 'English'
      };
      var langs = LanguageList._extend('en', true, base);
      assert.ok('en' in langs, 'en is listed');
    });

    test('regular non-current language, qps disabled', function() {
      var base = {
        en: 'English',
        pl: 'Polski'
      };
      var langs = LanguageList._extend('en', false, base);
      assert.ok('en' in langs, 'en is listed');
      assert.ok('pl' in langs, 'pl is listed');
    });

    test('regular non-current language, qps enabled', function() {
      var base = {
        en: 'English',
        pl: 'Polski'
      };
      var langs = LanguageList._extend('en', true, base);
      assert.ok('en' in langs, 'en is listed');
      assert.ok('pl' in langs, 'pl is listed');
    });

    test('pseudo current language, qps disabled', function() {
      var base = {
        en: 'English'
      };
      var langs = LanguageList._extend('qps-ploc', false, base);
      assert.ok('en' in langs, 'en is listed');
      assert.ok('qps-ploc' in langs, 'qps-ploc is listed');
    });

    test('pseudo current language, qps enabled', function() {
      var base = {
        en: 'English'
      };
      var langs = LanguageList._extend('qps-ploc', true, base);
      assert.ok('en' in langs, 'en is listed');
      assert.ok('qps-ploc' in langs, 'qps-ploc is listed');
    });

    test('pseudo non-current language, qps disabled', function() {
      var base = {
        en: 'English'
      };
      var langs = LanguageList._extend('en', false, base);
      assert.ok('en' in langs, 'en is listed');
      assert.ok(!('qps-ploc' in langs), 'qps-ploc is not listed');
    });

    test('pseudo non-current language, qps enabled', function() {
      var base = {
        en: 'English'
      };
      var langs = LanguageList._extend('en', true, base);
      assert.ok('en' in langs, 'en is listed');
      assert.ok('qps-ploc' in langs, 'qps-ploc is listed');
    });
  });

});
