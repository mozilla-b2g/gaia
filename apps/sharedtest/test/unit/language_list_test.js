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
      this.sinon.stub(LanguageList, '_readFile', function() {
        return Promise.resolve({
          'en-US': 'English (US)'
        });
      });
      this.sinon.stub(LanguageList, '_readSetting', function(name) {
        switch (name) {
          case 'deviceinfo.os':
            return Promise.resolve('2.2');
          case 'language.current':
            return Promise.resolve('en-US');
          case 'devtools.qps.enabled':
            return Promise.resolve('false');
        }
      });
      this.sinon.stub(
        navigator.mozApps, 'getAdditionalLanguages', function() {
          return Promise.resolve({
            de: [{
              name: 'Deutsch',
              target: '2.2',
              version: 201501191234
            }]
          });
        });
    });

    test('the first time loads languages from file', function(done) {
      LanguageList.get(function() {
        assert.isTrue(LanguageList._readFile.called,
                      '_readFile is called');
        assert.isTrue(LanguageList._readSetting.called,
                      '_readSetting is called');
        assert.isTrue(navigator.mozApps.getAdditionalLanguages.called,
                      'mozApps.getAdditionalLanguages is called');
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
        assert.isTrue(navigator.mozApps.getAdditionalLanguages.called,
                      'mozApps.getAdditionalLanguages is called');
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

  suite('extend language list with pseudolanguages', function() {
    test('regular current language, qps disabled', function() {
      var langs = {
        en: 'English'
      };
      LanguageList._extendPseudo(langs, 'en', false);
      assert.isTrue('en' in langs, 'en is listed');
    });

    test('regular current language, qps enabled', function() {
      var langs = {
        en: 'English'
      };
      LanguageList._extendPseudo(langs, 'en', true);
      assert.isTrue('en' in langs, 'en is listed');
    });

    test('regular non-current language, qps disabled', function() {
      var langs = {
        en: 'English',
        pl: 'Polski'
      };
      LanguageList._extendPseudo(langs, 'en', false);
      assert.isTrue('en' in langs, 'en is listed');
      assert.isTrue('pl' in langs, 'pl is listed');
    });

    test('regular non-current language, qps enabled', function() {
      var langs = {
        en: 'English',
        pl: 'Polski'
      };
      LanguageList._extendPseudo(langs, 'en', true);
      assert.isTrue('en' in langs, 'en is listed');
      assert.isTrue('pl' in langs, 'pl is listed');
    });

    test('pseudo current language, qps disabled', function() {
      var langs = {
        en: 'English'
      };
      LanguageList._extendPseudo(langs, 'qps-ploc', false);
      assert.isTrue('en' in langs, 'en is listed');
      assert.isTrue('qps-ploc' in langs, 'qps-ploc is listed');
    });

    test('pseudo current language, qps enabled', function() {
      var langs = {
        en: 'English'
      };
      LanguageList._extendPseudo(langs, 'qps-ploc', true);
      assert.isTrue('en' in langs, 'en is listed');
      assert.isTrue('qps-ploc' in langs, 'qps-ploc is listed');
    });

    test('pseudo non-current language, qps disabled', function() {
      var langs = {
        en: 'English'
      };
      LanguageList._extendPseudo(langs, 'en', false);
      assert.isTrue('en' in langs, 'en is listed');
      assert.isFalse('qps-ploc' in langs, 'qps-ploc is not listed');
    });

    test('pseudo non-current language, qps enabled', function() {
      var langs = {
        en: 'English'
      };
      LanguageList._extendPseudo(langs, 'en', true);
      assert.isTrue('en' in langs, 'en is listed');
      assert.isTrue('qps-ploc' in langs, 'qps-ploc is listed');
    });
  });

  suite('remove buildtime pseudolanguages', function() {
    test('regular current language, qps enabled', function() {
      var langs = {
        en: 'English',
        'qps-ploc': 'Ȧȧƈƈḗḗƞŧḗḗḓ Ḗḗƞɠŀīīşħ'
      };
      LanguageList._extendPseudo(langs, 'en', true);
      assert.isTrue('en' in langs, 'en is listed');
      assert.isTrue('qps-ploc' in langs, 'qps-ploc is listed');
    });

    test('regular current language, qps disabled', function() {
      var langs = {
        en: 'English',
        'qps-ploc': 'Ȧȧƈƈḗḗƞŧḗḗḓ Ḗḗƞɠŀīīşħ'
      };
      LanguageList._extendPseudo(langs, 'en', false);
      assert.isTrue('en' in langs, 'en is listed');
      assert.isFalse('qps-ploc' in langs, 'qps-ploc is not listed');
    });

    test('pseudo current language, qps enabled', function() {
      var langs = {
        en: 'English',
        'qps-ploc': 'Ȧȧƈƈḗḗƞŧḗḗḓ Ḗḗƞɠŀīīşħ'
      };
      LanguageList._extendPseudo(langs, 'qps-ploc', true);
      assert.isTrue('en' in langs, 'en is listed');
      assert.isTrue('qps-ploc' in langs, 'qps-ploc is listed');
    });

    test('pseudo current language, qps disabled', function() {
      var langs = {
        en: 'English',
        'qps-ploc': 'Ȧȧƈƈḗḗƞŧḗḗḓ Ḗḗƞɠŀīīşħ'
      };
      LanguageList._extendPseudo(langs, 'qps-ploc', false);
      assert.isTrue('en' in langs, 'en is listed');
      assert.isTrue('qps-ploc' in langs, 'qps-ploc is listed');
    });
  });

  suite('extend language list with additional languages', function() {

    test('a langpack matching the current version exists', function() {
      var langs = {
        en: 'English'
      };
      var additional = {
        de: [
          { name: 'Deutsch', target: '2.1' },
          { name: 'Deutsch', target: '2.2' }
        ],
        pl: [
          { name: 'Polski', target: '2.2' },
          { name: 'Polski', target: '2.3' }
        ]
      };
      LanguageList._extendAdditional(langs, '2.2', additional);
      assert.isTrue('en' in langs, 'en is listed');
      assert.isTrue('de' in langs, 'de is listed');
      assert.equal(langs.de, 'Deutsch');
      assert.isTrue('pl' in langs, 'pl is listed');
      assert.equal(langs.pl, 'Polski');
    });

    test('no langpack matching the current version exists', function() {
      var langs = {
        en: 'English'
      };
      var additional = {
        de: [
          { name: 'Deutsch', target: '2.1' },
          { name: 'Deutsch', target: '2.2' }
        ],
        pl: [
          { name: 'Polski', target: '2.2' },
          { name: 'Polski', target: '2.3' }
        ]
      };
      LanguageList._extendAdditional(langs, '2.3', additional);
      assert.isTrue('en' in langs, 'en is listed');
      assert.isFalse('de' in langs, 'de is not listed');
      assert.isTrue('pl' in langs, 'pl is listed');
      assert.equal(langs.pl, 'Polski');
    });

  });

});
