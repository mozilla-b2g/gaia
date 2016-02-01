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
      idOrNode: idOrNode
    });
  }

  Template.prototype.extract = function() {
    var members = priv.get(this);
    if (!members.tmpl) {
      members.tmpl = extract(members.idOrNode);
      delete members.idOrNode;
    }
    return members.tmpl;
  };

  /**
   * template.toString()
   *
   * Safe, read-only access to the template string
   *
   */
  Template.prototype.toString = function() {
    // Return a copy of the stored template string.
    return this.extract().slice();
  };

  /**
   * template.interpolate
   *
   * Interpolate template string with values provided by data object.
   * Optionally allow properties to retain HTML that is known to be safe.
   *
   * @param {Object} data   - key/value properties correspond to substitution,
   *                        with keys as identifiers in template string and
   *                        values as replacement strings.
   *
   * @param {Object} [options]      - optional
   * @param {Array}  options.safe   - array of identifiers in the data parameter
   *                                that contain HTML that is known and
   *                                are "known" to ignore.
   *                                Unless identifiers are listed here,
   *                                there corresponding string will be escaped.
  */
  Template.prototype.interpolate = function(data = {}, options = {}) {
    var safeList = options.safe;

    if (safeList && !Array.isArray(safeList)) {
      throw new TypeError(
        `If present "options.safe" must be an Array, not ${typeof options.safe}`
      );
    }

    var hasSafeProperties = safeList && safeList.length;

    return this.extract().replace(rmatcher, function(match, property) {
      property = property.trim();

      if (!(property in data)) {
        throw new Error(
          `No value provided for template identifier "${property}"`
        );
      }

      var unsafeString = data[property];

      if (typeof unsafeString !== 'string') {
        throw new TypeError(
          `"data.${property}" must be a String, not ${typeof unsafeString}`
        );
      }

      var isPropertySafe = hasSafeProperties && safeList.includes(property);

      return isPropertySafe ?
        // If the property is explicitly listed as "safe"
        // return the string of rendered markup
        unsafeString:
        // Otherwise the string is to be treated as suspicious
        Template.escape(unsafeString);
    });
  };

  /**
   * Prepares object that can provide either interpolated template string with
   * values provided by data object or ready DocumentFragment. Optionally allows
   * properties to retain HTML that is known to be safe.
   *
   * @param {Object} data Properties correspond to substitution i.e. identifiers
   * in the template string.
   * @param {Object} options Optional options object. Currently supported only
   * "safe" option - a list of properties that contain HTML that is known to be
   * safe and don't need to be additionally escaped.
   * @return {{ toString: function, toDocumentFragment: function }}
   */
  Template.prototype.prepare = function(data, options) {
    var self = this;

    return {
      toString: function t_toString() {
        return self.interpolate(data, options);
      },

      toDocumentFragment: function t_toDocumentFragment() {
        var template = document.createElement('template');
        template.innerHTML = this.toString();
        return template.content.cloneNode(true);
      }
    };
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
