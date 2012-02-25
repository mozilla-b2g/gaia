'use strict';

var Calculator = {

  BACKSPACE_TIMEOUT: 750,

  display: document.getElementById('display'),

  backSpaceTimeout: null,
  errorTimeout: null,
  toClear: false,

  operators: ['÷', '×', '-', '+'],

  // Holds the current symbols for calculation
  stack: [],

  updateDisplay: function() {
    if (this.stack.length === 0) {
      this.display.value = '0';
      return;
    }

    var out = [];
    var prev = false;
    var cur = false;

    for (var i = 0; i < this.stack.length; i++) {
      cur = this.stack[i];
      if (this.isOperator(cur) && (cur !== '-' || !this.isOperator(prev))) {
        out.push(' ' + cur + ' ');
      } else {
        out.push(cur);
      }
      prev = cur;
    }
    this.display.value = out.join('');
  },

  isOperator: function(val) {
    return this.operators.indexOf(val) !== -1;
  },

  appendValue: function(value) {
    if (this.toClear) {
      this.stack = [];
      this.toClear = false;
    }
    this.stack.push(value);
    this.updateDisplay();
  },

  appendOperator: function(value) {
    this.toClear = false;

    // Subtraction can also be used as a negative value
    if (value === '-' && this.stack[this.stack.length - 1] !== '-') {
      return this.appendValue(value);
    }

    if (this.stack.length === 0) {
      return false;
    }
    // New operators will overwrite any current operators, because subtraction
    // is allowed after other operators there may be more than 1
    while (this.isOperator(this.stack[this.stack.length - 1])) {
      this.stack.pop();
    }
    this.stack.push(value);
    this.updateDisplay();
  },

  // if backspace / clear is held for BACKSPACE_TIMEOUT, it will clear the
  // full formula
  backSpace: function() {
    this.clearBackspaceTimeout();
    this.startBackspaceTimeout();
    this.stack = this.stack.slice(0, -1);
    this.updateDisplay();
  },

  substitute: function(key) {
    if (key === '×') {
      return '*';
    } else if (key === '÷') {
      return '/';
    }
    return key;
  },

  calculate: function() {
    if (this.stack.length === 0) {
      return;
    }
    try {
      /*jshint evil:true */
      this.stack = [eval(this.stack.map(this.substitute).join(''))];
      this.updateDisplay();
      this.toClear = true;
    } catch(err) {
      this.display.classList.add('error');
      if (this.errorTimeout === null) {
        this.errorTimeout = window.setTimeout(function(self) {
          self.display.classList.remove('error');
          self.errorTimeout = null;
        }, 300, this);
      }
    }
  },

  clearBackspaceTimeout: function() {
    if (this.backSpaceTimeout !== null) {
      window.clearTimeout(this.backSpaceTimeout);
      this.backSpaceTimeout = null;
    }
  },

  startBackspaceTimeout: function() {
    this.backSpaceTimeout = window.setTimeout(function fullBackSpace(self) {
      self.stack = [];
      self.toClear = false;
      self.updateDisplay();
      self.backSpaceTimeout = null;
    }, this.BACKSPACE_TIMEOUT, this);
  },

  handleEvent: function calculator_handleEvent(evt) {
    switch (evt.type) {
    case 'mousedown':
      var value = evt.target.value;
      switch (evt.target.dataset.type) {
      case 'value':
        this.appendValue(value);
        break;
      case 'operator':
        this.appendOperator(value);
        break;
      case 'command':
        if (value === '=') {
          this.calculate();
        } else if (value === 'C') {
          this.backSpace();
        }
        break;
      }
      break;

    case 'mouseup':
      this.clearBackspaceTimeout()
      break;
    }
  },

  init: function calculator_init() {
    document.addEventListener('mousedown', this);
    document.addEventListener('mouseup', this);
    this.updateDisplay();
  }
};

window.addEventListener('load', function calcLoad(evt) {
  window.removeEventListener('load', calcLoad);
  Calculator.init();
});
