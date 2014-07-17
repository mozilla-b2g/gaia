// this is a factory of factories! (so meta)
// mainly because the old app structure expected a few methods on the "app"
// object to return references to each store/provider based on a name but that
// caused a few circular references, the idea is to create an intermediate
// module that works solely as a factory (avoiding circular dependencies).
// yes, this is too Java-ish, we should kill this during the refactor but this
// is good for now to get the AMD modules working.
define(function(require, exports) {
  'use strict';

  function SingletonFactory(constructors, getArguments) {
    this._ctors = constructors;
    this._cache = Object.create(null);
    this._getArguments = getArguments;
  }

  /**
   * need to inject a reference to the app to avoid circular dependencies
   */
  SingletonFactory.app = null;
  SingletonFactory.db = null;

  SingletonFactory.prototype.get = function(name) {
    if (!(name in this._cache)) {
      try {
        var args = this._getArguments({
          db: SingletonFactory.db,
          app: SingletonFactory.app
        });

        var instance;
        // Function#apply in constructors is weird, so we use this naive
        // implementation
        switch (args.length) {
          case 0:
            instance = new this._ctors[name]();
            break;
          case 1:
            instance = new this._ctors[name](args[0]);
            break;
          case 2:
            instance = new this._ctors[name](args[0], args[1]);
            break;
          default:
            throw new Error('too many arguments');
        }

        this._cache[name] = instance;

      } catch (e) {
        console.log('Failed to load object', name, e.stack, e);
      }
    }

    return this._cache[name];
  };

  return SingletonFactory;

});
