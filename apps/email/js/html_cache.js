// These vars are set in html_cache_restore as a globals.
/*global HTML_COOKIE_CACHE_VERSION, HTML_COOKIE_CACHE_MAX_SEGMENTS */
'use strict';
define(function(require, exports) {

/**
 * Safely clone a node so that it is inert and no document.registerElement
 * callbacks or magic happens.  This is not particularly intuitive, so it
 * needs a helper method and that helper method needs an appropriately
 * scary/warning-filled name.
 *
 * The most non-obvious thing here is that
 * document.implementation.createHTMLDocument() will create a document that
 * has the same custom element registry as our own, so using importNode
 * on such a document will not actually fix anything!  But a "template"
 * element's contents owner document does use a new registry, so we use
 * that.
 *
 * See the spec's details on this at:
 * http://w3c.github.io/webcomponents/spec/custom/
 *   #creating-and-passing-registries
 */
exports.cloneAsInertNodeAvoidingCustomElementHorrors = function(node) {
  // Create a template node with a new registry.  In theory we could
  // cache this node as long as we're sure no one goes and registers
  // anything in its registry.  Not caching it may result in slightly
  // more GC/memory turnover.
  var templateNode = document.createElement('template');
  // content is a DocumentFragment which does not have importNode, so we need
  // its ownerDocument.
  var cacheDoc = templateNode.content.ownerDocument;
  return cacheDoc.importNode(node, true); // yes, deep
};

/**
 * Saves a JS object to document.cookie using JSON.stringify().
 * This method claims all cookie keys that have pattern
 * /htmlc(\d+)/
 */
exports.save = function htmlCacheSave(html) {
  var langDir = document.querySelector('html').getAttribute('dir');
  html = encodeURIComponent(HTML_COOKIE_CACHE_VERSION +
                            (langDir ? ',' + langDir : '') +
                            ':' + html);

  // Set to 20 years from now.
  var expiry = Date.now() + (20 * 365 * 24 * 60 * 60 * 1000);
  expiry = (new Date(expiry)).toUTCString();

  // Split string into segments.
  var index = 0;
  var endPoint = 0;
  var length = html.length;

  for (var i = 0; i < length; i = endPoint, index += 1) {
    // Max per-cookie length is around 4097 bytes for firefox.
    // Give some space for key and allow i18n chars, which may
    // take two bytes, end up with 2030. This page used
    // to test cookie limits: http://browsercookielimits.x64.me/
    endPoint = 2030 + i;
    if (endPoint > length) {
      endPoint = length;
    }

    // Do not write cookie values past the max. Preferring this approach to
    // doing two loops, one to generate segments strings, then another to
    // set document.cookie for each segment. For the usual good case, the
    // cache fits within the max segments.
    if (index < HTML_COOKIE_CACHE_MAX_SEGMENTS) {
      document.cookie = 'htmlc' + index + '=' + html.substring(i, endPoint) +
                        '; expires=' + expiry;
    }
  }

  // If previous cookie was bigger, clear out the other values,
  // to make sure they do not interfere later when reading and
  // reassembling. If the cache saved is too big, just clear it as
  // there will likely be cache corruption/partial, bad HTML saved
  // otherwise.
  if (index > HTML_COOKIE_CACHE_MAX_SEGMENTS - 1) {
    index = 0;
    console.log('htmlCache.save TOO BIG. Removing all of it.');
  }
  for (i = index; i < HTML_COOKIE_CACHE_MAX_SEGMENTS; i++) {
    document.cookie = 'htmlc' + i + '=; expires=' + expiry;
  }

  console.log('htmlCache.save: ' + html.length + ' in ' +
              (index) + ' segments, lang dir: ' + langDir);
};

/**
 * Serializes the node to storage. NOTE: it modifies the node tree, and
 * cloneNode(true) is *NOT SAFE* because of custom element semantics, so
 * you must use cloneAsInertNodeAvoidingCustomElementHorrors(node) on
 * your node and pass that to us.  (And you call it instead of us because
 * you probably really want to perform some transforms/filtering before you
 * pass the node to us.)
 * @param  {Node} node Node to serialize to storage.
 */
exports.saveFromNode = function saveFromNode(node) {
  // Make sure card will be visible in center of window. For example,
  // if user clicks on "search" or some other card is showing when
  // message list's atTop is received, then the node could be
  // off-screen when it is passed to this function.
  var cl = node.classList;
  cl.remove('before');
  cl.remove('after');
  cl.add('center');

  var html = node.outerHTML;
  exports.save(html);
};

/**
 * setTimeout ID used to track delayed save.
 */
var delayedSaveId = 0;

/**
 * Node to save on a delayed save.
 */
var delayedNode = '';

/**
 * Like saveFromNode, but on a timeout. NOTE: it modifies the node tree,
 * so pass use cloneNode(true) on your node if you use it for other
 * things besides this call.
 * @param  {Node} node Node to serialize to storage.
 */
exports.delayedSaveFromNode = function delayedSaveFromNode(node) {
  delayedNode = node;
  if (!delayedSaveId) {
    delayedSaveId = setTimeout(function() {
      delayedSaveId = 0;
      exports.saveFromNode(delayedNode);
      delayedNode = null;
    }, 500);
  }
};

});
