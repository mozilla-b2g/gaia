define(function(require) {
  'use strict';
  var Spinner = require('picker/spinner');
  /**
   * Picker
   *
   * Create an inline "picker", comprised of n "spinners".
   *
   * @param {Object} setup An object containing setup data.
   *                       - element, The container element.
   *                       - pickers, an object whose properties
   *                         correspond to a Picker that will
   *                         be created.
   *
   *
   * new Picker({
   *   element: 'time-picker',
   *   pickers: {
   *     hours: {
   *       range: [0, 24]
   *     },
   *     minutes: {
   *       range: [0, 60],
   *       isPadded: true
   *     },
   *     seconds: {
   *       range: [0, 60],
   *       isPadded: true
   *     }
   *   }
   * });
   *
   */
  function Picker(setup) {
    this.nodes = {};
    this.spinners = {};
    this.pickers = Object.keys(setup.pickers);

    this.pickers.forEach(function(picker) {
      var values = [];
      var range = setup.pickers[picker].range;
      var isPadded = setup.pickers[picker].isPadded || false;

      this.nodes[picker] = setup.element.querySelector('.picker-' + picker);

      for (var i = range[0]; i <= range[1]; i++) {
        values.push(isPadded && i < 10 ? '0' + i : i);
      }

      this.spinners[picker] = new Spinner({
        element: this.nodes[picker],
        values: values
      });
    }, this);

    Object.defineProperties(this, {
      value: {
        get: function() {
          var values = this.pickers.map(function(picker) {
            return this.spinners[picker].value;
          }, this);

          return values.join(':');
        }
      }
    });
  }

  Picker.prototype.reset = function() {
    this.pickers.forEach(function(picker) {
      this.spinners[picker].reset();
    }, this);
  };

  return Picker;
});
