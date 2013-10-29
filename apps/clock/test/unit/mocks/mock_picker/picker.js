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

  Object.defineProperties(this, {
    value: {
      get: function() {
        return '0:00:00';
      }
    }
  });
}

MockPicker.prototype.reset = function() {
  this.pickers.forEach(function(picker) {
    this.spinners[picker].reset();
  }, this);
};

return MockPicker;
});
