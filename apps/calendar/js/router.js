(function(window) {
  if (typeof(Calendar) === 'undefined') {
    window.Calendar = {};
  }

  var COPY_METHODS = ['start', 'stop', 'show'];

  function Router(page) {
    var i = 0;
    var len = COPY_METHODS.length;

    this.page = page;
    this._activeObjects = [];
    this._clearObjects = this._clearObjects.bind(this);

    for (; i < len; i++) {
      this[COPY_METHODS[i]] = this.page[COPY_METHODS[i]].bind(this.page);
    }
  }

  Router.prototype = {

    /**
     * Creates a view callback
     *
     * @param {Object} object object to wrap as a function.
     */
    _wrapObject: function(object) {
      var self = this;

      return function viewResponder(ctx, next) {
        self._activeObjects.push(object);

        if ('onactive' in object) {
          object.onactive();
        }

        next();
      }
    },

    /**
     * Clears active objects, calls oninactive
     * on object if available.
     */
    _clearObjects: function(ctx, next) {
      var item;
      while (item = this._activeObjects.pop()) {
        if ('oninactive' in item) {
          item.oninactive();
        }
      }
      next();
    },

    //needed so next works correctly
    _noop: function() {},

    add: function() {
      var args = Array.prototype.slice.call(arguments);

      //clear all previous objects before starting loop
      args.splice(1, 0, this._clearObjects);

      //add noop so next works correctly...
      args.push(this._noop);

      var len = args.length;
      var i = 0;
      var item;

      for (; i < len; i++) {
        item = args[i];
        if (typeof(item) === 'object') {
          args[i] = this._wrapObject(item);
        }
      }

      this.page.apply(this.page, args);
    }

  };

  Calendar.Router = Router;

}(this));
