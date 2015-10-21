// These vars are set in html_cache_restore as a globals.
'use strict';
define(function(require, exports) {

var mozL10n = require('l10n!');

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
exports.save = function htmlCacheSave(moduleId, html) {
  // Only save the last part of the module ID as the cache key. This is specific
  // to how email lays out all card modules in a 'cards/' module ID prefix, and
  // with all / and underscores turned to dashes for component names.
  var id = exports.moduleIdToKey(moduleId);

  var langDir = document.querySelector('html').getAttribute('dir');
  html = window.HTML_CACHE_VERSION + (langDir ? ',' + langDir : '') +
         ':' + html;
  localStorage.setItem('html_cache_' + id, html);

  console.log('htmlCache.save ' + id + ': ' +
              html.length + ', lang dir: ' + langDir);
};

/**
 * Clears all the cache.
 */
exports.reset = function() {
  localStorage.clear();

  // Clear cookie cache for historical purposes, when the html cache used to be
  // a cookie cache. This can be removed once it is unlikely a person with a
  // 2.2 or earlier gaia might upgrade to a version with a localStorage cache.
  var expiry = Date.now() + (20 * 365 * 24 * 60 * 60 * 1000);
  expiry = (new Date(expiry)).toUTCString();
  for (var i = 0; i < 40; i++) {
    document.cookie = 'htmlc' + i + '=; expires=' + expiry;
  }

  console.log('htmlCache reset');
};

// If the locale changes, clear the cache so that incorrectly localized cache
// is not shown on the next eamil launch.
window.addEventListener('languagechange', exports.reset);

exports.moduleIdToKey = function moduleIdToKey(moduleId) {
  return moduleId.replace(/^cards\//, '').replace(/-/g, '_');
};

// XXX when a bigger rename can happen, remove the need
// to translate between custom element names and moz-style
// underbar naming, and consider the card- as part of the
// input names.
exports.nodeToKey = function nodeToKey(node) {
  return node.nodeName.toLowerCase().replace(/^cards-/, '').replace(/-/g, '_');
};

/**
 * Does a very basic clone of the given node and schedules it for saving as a
 * cached entry point. WARNING: only use this for very simple cards that do not
 * need to do any customization.
 */
exports.cloneAndSave = function cloneAndSave(moduleId, node) {
  var cachedNode = exports.cloneAsInertNodeAvoidingCustomElementHorrors(node);
  // Since this node is not inserted into the document, translation
  // needs to be manually triggered, and the cloneNode happens before
  // the async Mutation Observer work mozL10n fires.
  mozL10n.translateFragment(cachedNode);
  cachedNode.dataset.cached = 'cached';
  exports.delayedSaveFromNode(moduleId, cachedNode);
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
exports.saveFromNode = function saveFromNode(moduleId, node) {
  // Make sure card will be visible in center of window. For example,
  // if user clicks on "search" or some other card is showing when
  // message list's atTop is received, then the node could be
  // off-screen when it is passed to this function.
  var cl = node.classList;
  cl.remove('before');
  cl.remove('after');
  cl.add('center');

  // Also make sure all custom element have their "data-cached" attribute set
  // on them. Depend on the custom element base.js in email to set this class
  // name. This performs better than a querySelectorAll('*') approach.
  var nodes = node.querySelectorAll('.email-ce');
  for (var i = 0; i < nodes.length; i++) {
    nodes[i].dataset.cached = 'cached';
  }

  // If the passed-in node should be cached, be sure to mark it as cached.
  if (node.classList.contains('email-ce')) {
    node.dataset.cached = 'cached';
  }

  var html = node.outerHTML;
  exports.save(moduleId, html);
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
exports.delayedSaveFromNode = function delayedSaveFromNode(moduleId, node) {
  delayedNode = node;
  if (!delayedSaveId) {
    delayedSaveId = setTimeout(function() {
      delayedSaveId = 0;
      exports.saveFromNode(moduleId, delayedNode);
      delayedNode = null;
    }, 500);
  }
};

});
