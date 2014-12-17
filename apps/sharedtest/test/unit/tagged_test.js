/* global Tagged */

'use strict';

require('/shared/js/tagged.js');

suite('tagged template helper', function() {

  test('#escapeHTML', function() {
    var myVal = '<b>hello</b>';
    // fix a jshint issue with tagged template strings
    // https://github.com/jshint/jshint/issues/2000
    /* jshint -W033 */
    var generated = Tagged.escapeHTML `${myVal} world`;
    /* jshint +W033 */
    assert.equal(generated, '&lt;b&gt;hello&lt;&#x2F;b&gt; world');
  });
});
