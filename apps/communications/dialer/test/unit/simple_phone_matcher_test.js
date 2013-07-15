requireApp('communications/shared/js/simple_phone_matcher.js');

suite('lib/simple_phone_matcher', function() {
  suite('sanitization', function() {
    test('should remove dots', function() {
      var number = '06.98.05.70.56';
      assert.equal('0698057056', SimplePhoneMatcher.sanitizedNumber(number));
    });

    test('should remove spaces', function() {
      var number = '+34 764 456 098';
      assert.equal('+34764456098', SimplePhoneMatcher.sanitizedNumber(number));
    });

    test('should remove returns', function() {
      var number = '+34 764 456 098\n';
      assert.equal('+34764456098', SimplePhoneMatcher.sanitizedNumber(number));
    });

    test('should remove dashes', function() {
      var number = '97-111-8876';
      assert.equal('971118876', SimplePhoneMatcher.sanitizedNumber(number));
    });

    test('should remove parantheses', function() {
      var number = '(650) 123 4581';
      assert.equal('6501234581', SimplePhoneMatcher.sanitizedNumber(number));
    });

    test('should keep plus', function() {
      var number = '+55971118876';
      assert.equal(number, SimplePhoneMatcher.sanitizedNumber(number));
    });
  });

  suite('variants generation', function() {
    function testVariants(number, variant) {
      var variants = SimplePhoneMatcher.generateVariants(number);
      assert.include(variants, variant);
    };

    function testVariantsBothWays(first, second) {
      var variants = SimplePhoneMatcher.generateVariants(first);
      assert.include(variants, second);

      variants = SimplePhoneMatcher.generateVariants(second);
      assert.include(variants, first);
    };

    test('should sort variants by length', function() {
      var number = '+55 97 111 8876';
      var variants = ['1118876', '971118876', '0971118876',
                      '+55971118876', '0055971118876'];

      var generatedVariants = SimplePhoneMatcher.generateVariants(number);
      assert.equal(variants.join(), generatedVariants.join());
    });

    suite('international prefix variants', function() {
      suite('from countries with 00 as international prefix', function() {
        test('Brazil', function() {
          testVariantsBothWays('+55971118876', '0055971118876');
        });

        test('Spain', function() {
          testVariantsBothWays('+34764456098', '0034764456098');
        });

        test('France', function() {
          testVariantsBothWays('+33698057036', '0033698057036');
        });

        test('UK', function() {
          testVariantsBothWays('+4402088900346', '004402088900346');
        });

        test('USA', function() {
          testVariantsBothWays('+16501234581', '0016501234581');
        });
      });

      suite('from countries with 011 as international prefix', function() {
        var defaultMcc;

        suiteSetup(function() {
          defaultMcc = SimplePhoneMatcher.mcc;
          SimplePhoneMatcher.mcc = '310';
        });

        suiteTeardown(function() {
          SimplePhoneMatcher.mcc = defaultMcc;
        });

        test('France', function() {
          testVariantsBothWays('+33698057036', '01133698057036');
        });

        test('UK', function() {
          testVariantsBothWays('+4402088900346', '0114402088900346');
        });

        test('USA', function() {
          testVariantsBothWays('+16501234581', '01116501234581');
        });
      });
    });

    suite('carrier prefix variants in Brazil', function() {
      var defaultMcc;

      suiteSetup(function() {
        defaultMcc = SimplePhoneMatcher.mcc;
        SimplePhoneMatcher.mcc = '724';
      });

      suiteTeardown(function() {
        SimplePhoneMatcher.mcc = defaultMcc;
      });

      test('number dialed with carrier prefix', function() {
        testVariants('0311112345678', '1112345678');
      });

      test('long number dialed with carrier prefix', function() {
        testVariants('03111123456789', '11123456789');
      });

      test('number dialed with no carrier prefix', function() {
        testVariants('01112345678', '1112345678');
      });

      test('long number dialed with no carrier prefix', function() {
        testVariants('011123456789', '11123456789');
      });
    });

    suite('trunk prefix variants', function() {
      suite('countries with 0 as trunk prefix', function() {
        test('Brazil', function() {
          testVariants('+55971118876', '0971118876');
          testVariants('+55971118876', '971118876');
        });

        test('France', function() {
          testVariants('0033698057036', '0698057036');
          testVariants('0033698057036', '698057036');
        });
      });

      suite('countries with no trunk prefix', function() {
        test('Spain', function() {
          testVariants('0034764456098', '764456098');
        });

        test('UK', function() {
          testVariants('+4402088900346', '02088900346');
        });

        test('USA', function() {
          testVariants('+16501234581', '6501234581');
        });
      });

      suite('numbers with a trunk prefix already added', function() {
        test('Brazil', function() {
          testVariants('0971118876', '971118876');
        });
      });
    });

    suite('area code variants', function() {
      suite('countries with 2 digits area codes', function() {
        test('Brazil', function() {
          testVariants('+55971118876', '1118876');
        });
      });

      suite('countries with 3 digits area codes', function() {
        test('UK', function() {
          testVariants('+4402088900346', '88900346');
        });

        test('USA', function() {
          testVariants('+16501234581', '1234581');
        });
      });

      test('countries where we do not swipe area code', function() {
        var variants = SimplePhoneMatcher.generateVariants('+33698057055');
        assert.equal(-1, variants.indexOf('8057055'));
      });
    });
  });

  suite('best match search', function() {
    var variants;

    function testBestMatch(totalMatchNum, allMatches, 
      bestMatchIndex, localIndex, 
      variants, matches) {
      var result = {
        totalMatchNum: totalMatchNum,
        allMatches: allMatches,
        bestMatchIndex: bestMatchIndex,
        localIndex: localIndex
      };
      assert.deepEqual(result, SimplePhoneMatcher.bestMatch(variants, matches));
    }

    setup(function() {
      variants = ['1118876', '0971118876', '+55971118876', '0055971118876'];
    });

    test('should return the index with the longest match', function() {
      var matches = [['1118876', '12333'], ['111', '8876'], ['0055971118876']];
      testBestMatch(4, [[0], [0, 1], [0]], 2, 0, variants, matches);
    });

    test('should sanitize matches', function() {
      var matches = [['1118876', '12333'], ['+55 (97) 111 8876']];
      testBestMatch(2 , [[0], [0]], 1, 0, variants, matches);
    });

    test('should be compatible with contains matches', function() {
      var matches = [['112233', '118876'], ['000']];
      testBestMatch(2 , [[1], [0]], 0, 1, variants, matches);

      variants = ['1118876', '0971118876'];
      matches = [['0055971118876', '12333'], ['000'], ['12345']];
      testBestMatch(3, [[0], [0], [0]], 0, 0, variants, matches);
    });

    test('should return the first element as best match in the worst case',
    function() {
      var variants = [];
      var matches = [['112233', '118876'], ['000']];
      testBestMatch(2, [[0], [0]], 0, 0, variants, matches);
    });
  });
});
