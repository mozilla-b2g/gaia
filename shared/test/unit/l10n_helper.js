/* globals assert */

/* exported l10nAssert */

'use strict';

/**
 * Helper used to check that an element has been properly localized. This
 * supports all the patterns described on MDN for localization best practices:
 * - If 'expectedL10n' is a string it will check that the node's 'data-l10n-id'
 *   attribute is set and matches that id.
 * - If 'expectedL10n' is an object then if it as an id and an args field it
 *   will check if the node's 'data-l10n-id' and 'data-l10n-args' fields match
 *   them.
 * - If 'expectedL10n' is an object with a 'raw' field it will check that the
 *   node doesn't have a 'data-l10n-id' attribute and its 'textContent' field
 *   matches the'raw' field.
 * - If 'expectedL10n' is an object with am 'html' field it will check that the
 *   node doesn't have a 'data-l10n-id' attribute and its 'innerHTML' field
 *   matches the'html' field.
 */
function l10nAssert(node, expectedL10n) {
  if (typeof(expectedL10n) === 'string') {
    assert.isTrue(node.hasAttribute('data-l10n-id'));
    assert.equal(node.getAttribute('data-l10n-id'), expectedL10n);
  } else if (expectedL10n.id) {
    assert.isTrue(node.hasAttribute('data-l10n-id'));
    assert.equal(node.getAttribute('data-l10n-id'), expectedL10n.id);

    if (expectedL10n.args) {
      assert.isTrue(node.hasAttribute('data-l10n-args'));
      assert.equal(node.getAttribute('data-l10n-args'),
                   JSON.stringify(expectedL10n.args));
    }
  } else if (expectedL10n.raw) {
    assert.isFalse(node.hasAttribute('data-l10n-id'));
    assert.equal(node.textContent, expectedL10n.raw);
  } else if (expectedL10n.html) {
    assert.isFalse(node.hasAttribute('data-l10n-id'));
    assert.equal(node.innerHTML, expectedL10n.html);
  }
}
