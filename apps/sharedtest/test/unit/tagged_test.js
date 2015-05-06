/* global Tagged */

'use strict';

require('/shared/js/tagged.js');

suite('tagged template helper', function() {

  test('#escapeHTML', function() {
    var myVal = '<b>hello</b>';
    var generated = Tagged.escapeHTML `${myVal} world`;
    assert.equal(generated, '&lt;b&gt;hello&lt;&#x2F;b&gt; world');
  });
});
