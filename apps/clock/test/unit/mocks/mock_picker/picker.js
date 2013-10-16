define(function() {

function MockPicker(setup) {
  this.node = {};
  this.spinners = {};
  this.pickers = Object.keys(setup.pickers);

  this.pickers.forEach(function(picker) {
    var values = [];
    var range = setup.pickers[picker].range;
    var isPadded = setup.pickers[picker].isPadded || false;

    this.node[picker] = setup.element.querySelector('.picker-' + picker);

    for (var i = range[0]; i < range[1]; i++) {
      values.push(isPadded && i < 10 ? '0' + i : i);
    }

    this.spinners[picker] = {
      value: 0,
      reset: function() {}
    };
  }, this);
}

MockPicker.prototype = {
  reset: function() {
    this.pickers.forEach(function(picker) {
      this.spinners[picker].reset();
    }, this);
  },
  // Mock non-zero value so create event doesn't return without
  // instantiating a new Timer()
  get value() {
    return '1:00';
  }
};

return MockPicker;
});
