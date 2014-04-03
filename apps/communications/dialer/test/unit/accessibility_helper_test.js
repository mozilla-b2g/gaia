'use strict';

/* global AccessibilityHelper */

require('/shared/js/accessibility_helper.js');

suite('Accessibility Helper', function() {

  var links;

  setup(function() {
    var element = document.createElement('div');
    element.innerHTML =
      '<li><a aria-selected="true" href="#link-0"></a></li>' +
      '<li><a aria-selected="false" href="#link-1"></a></li>' +
      '<li><a aria-selected="false" href="#link-2"></a></li>';
    links = element.querySelectorAll('a');
  });

  function testAriaSelected(expectedAriaSelectedValues) {
    expectedAriaSelectedValues.forEach(function(value, index) {
      assert.equal(links[index].getAttribute('aria-selected'), value);
    });
  }

  test('link 2 should be marked as selected', function() {
    AccessibilityHelper.setAriaSelected(links[1], links);
    testAriaSelected(['false', 'true', 'false']);
  });

  test('link 3 should be marked as selected', function() {
    AccessibilityHelper.setAriaSelected(links[2], links);
    testAriaSelected(['false', 'false', 'true']);
  });

  test('link 1 should be marked as selected', function() {
    AccessibilityHelper.setAriaSelected(links[0], links);
    testAriaSelected(['true', 'false', 'false']);
  });

  test('only one link should be marked as selected', function() {
    AccessibilityHelper.setAriaSelected(links[1], links);
    AccessibilityHelper.setAriaSelected(links[2], links);
    testAriaSelected(['false', 'false', 'true']);
  });

});
