;(function(define){define(function(require,exports,module){

'use strict';

/**
 * Simple logger (toggle 0)
 *
 * @type {Function}
 */
var debug = 0 ? console.log.bind(console) : function() {};
var map = [].map;

/**
 * Exports
 */

module.exports = format;

function format(thing) {
  var formatter = getObjectFormatter(thing)
    || getValueFormatter(thing);

  var result = formatter(thing);
  var formatted = result.formatted || result;
  var type = Array.isArray(formatted) ? 'object' : 'value';

  if (type === 'object') {
    formatted.sort((a, b) => {
      if (a.key > b.key) {
        return 1;
      }
      if (a.key < b.key) {
        return -1;
      }
      return 0;
    }).sort((a, b) => {
      if (a.value === undefined && b.value !== undefined) {
        return 1;
      }
      if (a.value !== undefined && b.value === undefined) {
        return -1;
      }
      return 0;
    });
  }

  return {
    title: result.title,
    formatted: formatted,
    displayType: type,
    original: thing
  };
}

format.shallow = function(thing) {
  return getValueFormatter(thing)(thing);
};

function getValueFormatter(thing) {
  debug('get value formatter', thing);

  var type = thing != null
    && thing.constructor
    && thing.constructor.name;

  if (thing === undefined) { type = 'undefined'; }
  if (thing === null) { type = 'null'; }

  return formatters.values[type] || formatters.values.default;
}

function getObjectFormatter(thing) {
  debug('get object formattr', thing);
  if (!thing) { return; }
  for (var ctor in formatters.objects) {
    if (thing instanceof window[ctor]) {
      return formatters.objects[ctor];
    }
  }

  // XXX: This additional check is needed due to add-on sandbox issue in
  // Bug 1148558 - [Add-ons] new Map() instanceof Map === false
  if (thing.toString && thing.toString() === '[object Map]') {
    return formatters.objects.Map;
  }
}

var formatters = {
  objects: {
    NodeList: nodeList,
    HTMLCollection: nodeList,
    DOMTokenList: nodeList,

    HTMLElement: function(el) {
      debug('HTMLElement', el);
      var hash = getNodeProps(el, el);
      var list = sortByKey(toArray(hash));

      return {
        formatted: list,
        title: getNodeTitle.HTMLElement(el)
      };
    },

    Text: function(node) {
      debug('Node', node);
      var hash = getNodeProps(node, node);
      var list = sortByKey(toArray(hash));

      return {
        formatted: list,
        title: getNodeTitle.Text(node)
      };
    },

    HTMLDocument: function(doc) {
      debug('Node', doc);
      var hash = getNodeProps(doc, doc);
      var list = sortByKey(toArray(hash));

      return {
        formatted: list,
        title: doc.constructor.name
      };
    },

    NamedNodeMap: function(obj) {
      debug('NamedNodeMap', obj);
      return map.call(obj, (attr) => {
        var item = format.shallow(attr);
        item.key = attr.name;
        item.writable = true;
        return item;
      });
    },

    DOMStringMap: function(obj) {
      debug('DOMStringMap', obj);
      var result = [];

      for (var key in obj) {
        var item = format.shallow(obj[key]);
        item.key = key;
        result.push(item);
      }

      return result;
    },

    CSS2Properties: function(obj) {
      debug('CSS2Properties', obj);
      return map.call(obj, key => {
        var item = format.shallow(obj[key]);
        item.key = key;
        return item;
      });
    },

    Map: function(obj) {
      debug('Map', obj);
      var result = [];

      for (var [key, value] of obj.entries()) {
        var item = format.shallow(value);
        item.key = key;
        item.writable = true;
        result.push(item);
      }

      return result;
    }
  },

  values: {
    Boolean: common,
    Number: common,

    String: function(value) {
      debug('String', value);
      return {
        value: value,
        displayValue: '\'' + value + '\'',
        type: 'string',
      };
    },

    Function: function(fn) {
      debug('Function', fn);
      return {
        value: fn,
        displayValue: fn.toString(),
        type: 'function',
        native: isNativeFn(fn)
      };
    },

    Attr: function(attr) {
      debug('Attr', attr, attr.value);
      return {
        value: attr.value,
        displayValue: '\'' + attr.value + '\'',
        type: 'Attr'
      };
    },

    null: function() {
      return {
        value: null,
        displayValue: 'null',
        type: 'null'
      };
    },

    undefined: function() {
      return {
        value: undefined,
        displayValue: 'undefined',
        type: 'undefined'
      };
    },

    default: function(value) {
      debug('default', value);
      return {
        value: value,
        displayValue: value.constructor.name,
        type: value.constructor.name
      };
    }
  }
};


function nodeList(obj) {
  debug('NodeList', obj);
  return map.call(obj, (value, i) => {
    var item = format.shallow(value);
    item.key = i;
    return item;
  });
}

function common(value) {
  debug('Common', value);
  return {
    constructor: value.constructor,
    value: value,
    displayValue: value,
    type: typeof value
  };
}

/**
 * Utils
 */

function getNodeProps(instance, level) {
  if (!level) return {};
  debug('get props', level.toString());
  var result = getNodeProps(instance, Object.getPrototypeOf(level));

  Object.getOwnPropertyNames(level).forEach(key => {
    if (isConstant(key)) { return; }
    var descriptor = Object.getOwnPropertyDescriptor(level, key);
    var value = format.shallow(instance[key]);

    if (value.native) return;

    value.key = key;
    value.writable = isWritable(descriptor);

    result[key] = value;
  });

  return result;
}

function toArray(obj) {
  return Object.keys(obj).map(key => obj[key]);
}

function sortByKey(list) {
  return list.sort((a, b) => a.key > b.key);
}

function isNativeFn(value) {
  return value && !!~value.toString().indexOf('[native code]');
}

var constantRegex = /^[A-Z_]+$/;

function isConstant(key) {
  return constantRegex.test(key);
}

/**
 * Decides if a property is
 * 'writable' or not.
 *
 * @param  {Object}  descriptor
 * @param  {String}  type
 * @return {Boolean}
 */
function isWritable(descriptor) {
  return !!(descriptor.set || descriptor.writable);
}

var getNodeTitle = {
  HTMLElement: function(el) {
    debug('toString.element', el);
    var id = el.id ? '#' + el.id : '';
    var className = el.className ? '.' + el.className.split(' ').join('.') : '';
    var tagName = el.tagName.toLowerCase();
    return '<' + tagName + id + className + '>';
  },

  Text: function(node) {
    debug('toString.textNode', node);
    var value = node.nodeValue.trim().replace(/\n/g, '\\n');
    return '<text!' + value + '>';
  }
};

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('./lib/format',this));
