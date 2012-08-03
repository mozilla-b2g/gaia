var Factory = (function() {

  /**
   * Copies all properties
   * (in order from left to right to the final argument)
   */
  function copy() {
    var key;
    var args = Array.prototype.slice.call(arguments);
    var target = args.pop();

    args.forEach(function(object) {
      if (!object) {
        return;
      }

      for (key in object) {
        if (object.hasOwnProperty(key)) {
          Object.defineProperty(
            target,
            key,
            Object.getOwnPropertyDescriptor(
              object,
              key
            )
          );
        }
      }
    });

    return target;
  }

  /* static api */

  Factory._defined = Object.create(null);

  Factory.get = function(name) {
    return Factory._defined[name];
  }

  Factory.define = function(name, options) {
    return Factory._defined[name] = new Factory(
      options
    );
  };

  Factory.create = function(name, opts) {
    return Factory.get(name).create(opts);
  };

  Factory.build = function(name, opts) {
    return Factory.get(name).build(opts);
  };

  /* instance */

  function Factory(options) {
    if (!(this instanceof Factory)) {
      return Factory.create.apply(Factory, arguments);
    }

    copy(options, this);
  }

  Factory.prototype = {
    parent: null,
    object: null,
    properties: {},

    extend: function(options) {
      var newFactory = {
        // when we add new props
        // we also need to add them here
        object: this.object
      };

      copy(options, newFactory);

      newFactory.properties = copy(
        this.properties,
        newFactory.properties,
        {}
      );

      return new Factory(newFactory);
    },

    build: function(overrides, childFactoryMethod) {
      if (typeof(overrides) === 'undefined') {
        overrides = {};
      }

      if (typeof(childFactoryMethod) === 'undefined') {
        childFactoryMethod = 'build';
      }


      var defaults = {};
      var key;
      var props = this.properties;

      copy(props, overrides, defaults);

      // expand factories
      var factoryOverrides;
      for (key in defaults) {
        // when default property is a factory
        if (props[key] instanceof Factory) {
          factoryOverrides = undefined;
          if (!(defaults[key] instanceof Factory)) {
            // user overrides defaults
            factoryOverrides = defaults[key];
          }
          defaults[key] = props[key][childFactoryMethod](
            factoryOverrides
          );
        }
      }
      return defaults;
    },

    create: function(overrides) {
      var constructor = this.object;
      var attrs = this.build(overrides, 'create');

      if (constructor) {
        return new constructor(attrs);
      } else {
        return attrs;
      }
    }
  };

  return Factory;
}());
