/*jshint maxlen:false*/
/*global req*/
'use strict';

suite('utils/string-utils', function() {
  var StringUtils;

  suiteSetup(function(done) {
    var self = this;

    this.modules = {};

    requirejs([
      'lib/string-utils'
    ], function(_StringUtils) {
      StringUtils = self.modules.StringUtils = _StringUtils;

      done();
    });
  });

  setup(function() {

  });

  suite('toCamelCase', function() {
    setup(function() {

    });

    test('Should convert hyphenated string to camel-case', function() {
      var sourceStr = 'this-string-should-be-camel-cased';
      var outputStr = StringUtils.toCamelCase(sourceStr);

      assert.equal(outputStr, 'thisStringShouldBeCamelCased');
    });

    test('Should convert snake-case string to camel-case', function() {
      var sourceStr = 'THIS_STRING_SHOULD_BE_CAMEL_CASED';
      var outputStr = StringUtils.toCamelCase(sourceStr);

      assert.equal(outputStr, 'thisStringShouldBeCamelCased');
    });
  });

  suite('toHyphenate', function() {
    setup(function() {

    });

    test('Should convert camel-case string to hyphenated', function() {
      var sourceStr = 'thisStringShouldBeHyphenated';
      var outputStr = StringUtils.toHyphenate(sourceStr);

      assert.equal(outputStr, 'this-string-should-be-hyphenated');
    });
  });

  suite('lastPathComponent', function() {
    setup(function() {});

    test('Should get the last path component', function() {
      assert.equal(StringUtils.lastPathComponent('this/is/a/path'), 'path');
      assert.equal(StringUtils.lastPathComponent('abc'), 'abc');
    });
  });
});
