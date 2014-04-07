define(function() {
'use strict';

function MockSpinner(setup = {}) {
  this.element = setup.element;
  this.values = setup.values;
  this.template = {
    interpolate: function(str) {
      return str;
    }
  };

  this.top = 0;
  this.space = 0;

  this.lower = 0;
  this.upper = setup.values.length - 1;
  this.range = setup.values.length;

  this.index = 0;

  this.previous = {x: 0, y: 0, time: 0};
  this.current = {x: 0, y: 0, time: 0};
  this.value = 0;

  MockSpinner.args.push(arguments);
}

MockSpinner.args = [];

MockSpinner.prototype.reset = function() {
  this.space = this.element.clientHeight;
  this.index = 0;
  this.top = 0;
  this.update();
};

MockSpinner.prototype.update = function() {
};

MockSpinner.prototype.select = function(index) {
  this.index = index;
  this.update();

  return index;
};

MockSpinner.prototype.handleEvent = function(event) {
};

MockSpinner.prototype.onpan = function(event) {
};

MockSpinner.prototype.onholdstart = function(event) {
};

MockSpinner.prototype.onswipe = function() {
};

return MockSpinner;
});
