/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
(function(exports) {
  'use strict';

  var priv = new WeakMap();
  var rmatcher = /\$\{([^}]+)\}/g;
  var rentity = /[&<>"']/g;
  var rentities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&apos;'
  };

  function extract(node) {
    var nodeId;
    // Received an ID string? Find the appropriate node to continue
    if (typeof node === 'string') {
      nodeId = node;
      node = document.getElementById(node);
    } else if (node) {
      nodeId = node.id;
    }

    if (!node) {
      console.error(
        'Can not find the node passed to Template', nodeId
      );
      return '';
    }

    // No firstChild means no comment node.
    if (!node.firstChild) {
      console.error(
        'Node passed to Template should have a comment node', nodeId
      );
      return '';
    }

    // Starting with the container node's firstChild...
    node = node.firstChild;

    do {
      // Check if it's the comment node that we're looking for...
      if (node.nodeType === Node.COMMENT_NODE) {
        return (node.nodeValue || '').trim();
      }
      // If the current child of the container node isn't
      // a comment node, it's likely a text node, so hop to
      // the nextSibling and repeat the operation.
    } while ((node = node.nextSibling));

    console.error(
      'Nodes passed to Template should have a comment node', nodeId
    );
    return '';
  }


  /**
   * Template
   *
   * Initialize a template instance from a string or node
   *
   * @param {String} idOrNode id string of existing node.
   *        {Object} idOrNode existing node.
   *
   */
  function Template(idOrNode) {
    if (!(this instanceof Template)) {
      return new Template(idOrNode);
    }
    // Storing the extracted template string as a private
    // instance property prevents direct access to the
    // template once it's been initialized.
    priv.set(this, {
      tmpl: extract(idOrNode)
    });
  };

  /**
   * template.toString()
   *
   * Safe, read-only access to the template string
   *
   */
  Template.prototype.toString = function() {
    // Return a copy of the stored template string.
    return priv.get(this).tmpl.slice();
  };

  /**
   * template.interpolate
   *
   * Interpolate template string with values provided by
   * data object. Optionally allow properties to retain
   * HTML that is known to be safe.
   *
   * @param {Object} data     properties correspond to substitution.
   *                          - identifiers in template string.
   * @param {Object} options  optional.
   *                          - safe, a list of properties that contain
   *                          HTML that is known and are
   *                          "known" to ignore.
   */
  Template.prototype.interpolate = function(data, options) {
    // This _should_ be rewritten to use Firefox's support for ES6
    // default parameters:
    // ... = function(data, options = { safe: [] }) {
    //
    options = options || {};
    options.safe = options.safe || [];

    return priv.get(this).tmpl.replace(rmatcher, function(match, property) {
      property = property.trim();
      // options.safe is an array of properties that can be ignored
      // by the "suspicious" html strategy.
      return options.safe.indexOf(property) === -1 ?
        // Any field that is not explicitly listed as "safe" is
        // to be treated as suspicious
        Template.escape(data[property]) :
        // Otherwise, return the string of rendered markup
        data[property];
    });
  };

  Template.escape = function escape(str) {
    if (typeof str !== 'string') {
      return '';
    }
    return str.replace(rentity, function(s) {
      return rentities[s];
    });
  };

  exports.Template = Template;

}(this));
