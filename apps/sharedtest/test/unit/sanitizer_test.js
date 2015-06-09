/* global Sanitizer */

'use strict';

require('/shared/js/sanitizer.js');

suite('tagged template helper', function() {

  test('#escapeHTML', function() {
    var myVal = '<b>hello</b>';
    var generated = Sanitizer.escapeHTML `${myVal} world`;
    assert.equal(generated, '&lt;b&gt;hello&lt;&#x2F;b&gt; world');
  });

  test('#createSafeHTML', function() {
    var t = 'Click me';
    var url = '" ><script>alert(1)</script>';
    var s;
    s = Sanitizer.createSafeHTML`<a href="${url}" title="${t}">${t}</a>`;

    var expectedDocs = 'https://developer.mozilla.org/en-US/Firefox_OS/'+
                        'Security/Security_Automation';
    assert.equal(s.__html,
                 '<a href="&quot; &gt;&lt;script&gt;alert(1)&lt;&#x2F;script'+
                  '&gt;" title="Click me">Click me</a>');
    assert.ok(s.info.indexOf(expectedDocs) !== -1);
  });

  test('#unwrapSafeHTML', function() {
    var escapeMe = '<s>hax</s>';
    var obj = Sanitizer.createSafeHTML`<b>${escapeMe}</b>`;
    var unwrapped = Sanitizer.unwrapSafeHTML(obj);
    assert.equal(unwrapped, '<b>&lt;s&gt;hax&lt;&#x2F;s&gt;</b>');
  });

});
