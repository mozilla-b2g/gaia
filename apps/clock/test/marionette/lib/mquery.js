'use strict';
var Marionette = require('marionette-client');

/**
 * mQuery allows you to query and modify the DOM through Marionette,
 * in a style resembling jQuery. While jQuery is often heckled for
 * being poor for designing large-scale apps, its quick DOM traversal
 * and manipulation is hard to beat. For integration tests, which tend
 * to require convenient, clear, mostly-read-only access to the DOM
 * with fewer architectural concerns, a jQuery-like API fits well.
 *
 * Typical use is something like this:
 *
 *   var $ = require('mquery');
 *
 *   $.client = marionette.client();
 *
 *   console.log($('.my-element').text());
 *   console.log($('#textbox').val());
 *
 * You can also set values in input fields like so:
 *
 *   $('#textbox').val('foo');
 *
 * This also works with system <select> boxes and other inputs too.
 *
 * Architecturally, mQuery does something interesting: An item
 * returned from mQuery is _both_ an array of elements _and_ a single
 * Element at the same time. For instance, you can pass the result of
 * $('.foo') directly to Marionette calls that require a
 * Marionette.Element; similarly, since mQuery behaves like an array
 * as well, you can also use this anywhere you previously used
 * Marionette.findElements().
 *
 * While typical usage assigns $.client to your Marionette.Client
 * instance, you can instead pass { client: myClient } as an option to
 * mQuery if you'd prefer not to globally scope out your mQuery
 * instances.
 *
 * Read the code to see what functions are implemented; many of the
 * most commonly-used jQuery features are included. Add more if you
 * find them useful. While this initially contains some
 * half-implemented methods (e.g. ".css()" can only read values, not
 * set them), the eventual goal is to match jQuery's API where it
 * makes sense.
 */
var mQuery = function(selectorOrElement, opts) {
  var client = (opts && opts.client) || mQuery.client;
  var parent = (opts && opts.parent) || null;

  if (!client) {
    throw new Error(
      'You must set mQuery.client to your Marionette client.');
  }

  var elements;
  var selector;
  if (typeof selectorOrElement === 'string') {
    elements = (parent || mQuery.client).findElements(selectorOrElement);
    selector = selectorOrElement;
  } else if (Array.isArray(selectorOrElement)) {
    elements = selectorOrElement;
  } else if (selectorOrElement instanceof ElementSet) {
    return selectorOrElement;
  } else if (selectorOrElement instanceof Marionette.Element) {
    elements = [selectorOrElement];
  } else {
    throw new Error('mQuery doesn\'t know how to handle ' + selectorOrElement);
  }

  return new ElementSet(elements, {
    client: client,
    selector: selector
  });
};

module.exports = mQuery;

mQuery.client = null;

/**
 * ElementSet acts as a lightweight wrapper over Marionette.Element,
 * providing chainable, functional interface somewhat like jQuery.
 */
function ElementSet(elements, opts) {
  this.client = opts.client;
  this.selector = opts.selector;
  this.el = elements[0] || null;
  this.id = this.el && this.el.id; // Act like Marionette if we can.

  for (var i = 0; i < elements.length; i++) {
    this.push(elements[i]);
  }
}

// Behave like an Array of Marionette.Element instances.
ElementSet.prototype = Object.create(Array.prototype);

// Behave like a single instance of Marionette.Element too.
Object.keys(Marionette.Element.prototype).forEach(function(funcName) {
  var elementFn = Marionette.Element.prototype[funcName];
  ElementSet.prototype[funcName] = function() {
    return elementFn.apply(this.el, arguments);
  };
});

// Behave like jQuery. (These are only getters, not setters though.)
ElementSet.prototype.attr = ElementSet.prototype.getAttribute;
ElementSet.prototype.css = ElementSet.prototype.cssProperty;

ElementSet.prototype.toString = function() {
  return '<ElementSet: ' + this.length + '>';
};

// For the purposes of executeScript, behave like Marionette.Element.
ElementSet.prototype.toJSON = function() {
  return { ELEMENT: this.id };
};

// Chainable helper methods.

ElementSet.prototype.waitToAppear = function() {
  this.client.helper.waitForElement(this.el);
  return this;
};

ElementSet.prototype.waitToDisappear = function() {
  this.client.helper.waitForElementToDisappear(this.el);
  return this;
};

function makeChainable(proto, funcName) {
  var origFn = proto[funcName];
  proto[funcName] = function() {
    origFn.apply(this, arguments);
    return this;
  };
}

makeChainable(ElementSet.prototype, 'clear');
makeChainable(ElementSet.prototype, 'sendKeys');

ElementSet.prototype.tap = function() {
  this.waitToAppear();
  this.el.scriptWith(function(el) {
    el.scrollIntoView(false);
  });
  this.el.tap();
  return this;
};

ElementSet.prototype.find = function(selector) {
  if (!this.el) {
    throw new Error(
      'Cannot call mQuery.find() when mQuery did not match any elements.');
  }
  return mQuery(selector, {
    client: this.client,
    parent: this.el
  });
};

ElementSet.prototype.eq = function(idx) {
  return mQuery(this[idx], {
    client: this.client
  });
};

ElementSet.prototype.height = function() {
  if (!this.el) {
    return null;
  }

  return this.el.size().height;
};

ElementSet.prototype.width = function() {
  if (!this.el) {
    return null;
  }

  return this.el.size().width;
};

ElementSet.prototype.parent = function() {
  if (!this.el) {
    return null;
  }

  return mQuery(this.client.executeScript(function(el) {
    return el.parentElement;
  }, [this.el]), {
    client: this.client
  });
};

ElementSet.prototype.data = function(attr, value) {
  if (!this.el) {
    return null;
  }

  if (arguments.length === 1) {
    return this.client.executeScript(function(el, attr) {
      return el.dataset[attr];
    }, [this.el, attr]);
  } else if (arguments.length === 2) {
    return this.client.executeScript(function(el, attr, value) {
      el.dataset[attr] = value;
    }, [this.el, attr, value]);
  } else {
    return this.client.executeScript(function(el) {
      return el.dataset;
    }, [this.el]);
  }
};

ElementSet.prototype.val = function(value) {
  if (!this.el) {
    return null;
  }

  var el = this.el;
  if (!arguments.length) {
    return el.getAttribute('value');
  } else {
    if (el.tagName().toLowerCase() === 'select') {
      // Save the origin so that we know how to switch back from the
      // system frame to the application frame.
      var origin = this.client.executeScript(function() {
        return window.location.origin;
      });

      this.client.executeScript(function(el) {
        window.focus(); // Without this line, sometimes el.focus() does nothing.
        el.focus();
      }, [el]);

      this.client.switchToFrame(); // Switch to the system frame.

      var options = this.client.findElements('#select-option-popup li');
      var values = (!Array.isArray(value) ? [value] : value);
      options.forEach(function(option) {
        var itemText = option.findElement('label span').text();
        var shouldBeSelected = (values.indexOf(itemText) !== -1);
        var isSelected = (option.getAttribute('aria-selected') === 'true');
        if (shouldBeSelected !== isSelected) {
          option.scriptWith(function(el) {
            el.scrollIntoView(false);
          });
          option.tap();
        }
      });
      this.client.helper.waitForElement('.value-option-confirm').tap();
      this.client.apps.switchToApp(origin);
    } else {
      this.client.forms.fill(el, value);
    }
    return this;
  }
};

