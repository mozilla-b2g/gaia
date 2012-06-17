(function(window) {

  if (typeof(window.Calendar) === 'undefined') {
    window.Calendar = {};
  }

  /**
   * Batch is a convenience data type
   * designed to make the job of handling
   * incoming input in batches.
   *
   *    function handleBatch(items) {
   *      //items is an array of all items added
   *    }
   *
   *    batch = new Calendar.Batch({
   *      // object will wait 10ms before firing
   *      // handle with the current list of items.
   *      waitTime: 10,
   *
   *      handler: handleBatch
   *    });
   *
   *    batch.add('1');
   *    batch.add('2');
   *    //in 10ms handleBatch will receive both items in an array.
   *
   *
   * You can use add a 'verify' option to filter
   * incoming items.
   *
   *
   *    function verifyItem(item) {
   *      if(mySet.has(item.id)) {
   *        //don't add this item to the
   *        //batch we don't need to process it
   *        return false;
   *      }
   *
   *      // add item to the batch
   *      return true;
   *    }
   *
   *    batch = new Calendar.Batch({
   *      //same options as above ...
   *
   *      verify: hasItem
   *    });
   *
   *    batch.action('add', 'group-1', 22);
   *
   *
   * @param {Object} options options for batch.
   */
  function Batch(options) {
    var key;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    this.data = {};

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  }

  Batch.prototype = {

    /**
     * Current timer id
     */
    _timer: null,

    waitTime: 1,

    /* Place holder functions to be overridden */
    verify: function() { return true; },
    handler: function() {},

    /**
     * Adds an action to the queue.
     * Groups items into a structure like
     * this:
     *
     *    batch.action(group, action, value);
     *
     *    var groups = {},
     *        stack = groups[group] = {};
     *
     *    stack[action] = stack[action] || [];
     *    stack[action].push(value);
     *
     *
     *    //now when the batch fires
     *    //the handler you will receive the groups object.
     *
     * @param {String} group group of actions.
     * @param {String} action name of action.
     * @param {Object} value value of action.
     *
     * @return {Boolean} true when action/value is added.
     */
    action: function(group, action, value) {
      var items;

      if (!this.verify(group, action, value)) {
        return false;
      }

      if (!(group in this.data)) {
        items = this.data[group] = {};
        items = items[action] = [];
      } else {
        items = this.data[group];
        if (!(action in items)) {
          items = items[action] = [];
        } else {
          items = items[action];
        }
      }

      items.push(value);

      this._start();

      return true;
    },


    /**
     * @return {Boolean} true when batch will run at some point.
     */
    willRun: function() {
      return !!this._timer;
    },

    /**
     *
     * Cancels current timer.
     */
    cancel: function() {
      if (this._timer) {
        clearTimeout(this._timer);
        this._timer = null;
      }
    },

    /**
     * Clears current set of data.
     */
    clear: function() {
      this.data = {};
    },

    _run: function(ctx) {
      ctx.handle(ctx.items);
      ctx.items = [];
      this._timer = null;
    },

    _start: function() {
      if (!this._timer) {
        if (this.waitTime) {
          this._timer = setTimeout(
            this._runQueue, this.waitTime, this
          );
        } else {
          this._runQueue(this);
        }
      }
    },

    _runQueue: function(ctx) {
      var data = ctx.data;
      ctx._timer = null;
      ctx.clear();
      ctx.handler(data);
    }

  };

  Calendar.Batch = Batch;

}(this));
