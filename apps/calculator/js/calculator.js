'use strict';

var Calculator = {

  BACKSPACE_TIMEOUT: 750,

  display: document.getElementById('display'),

  backSpaceTimeout: null,
  errorTimeout: null,
  toClear: false,

  operators: ['÷', '×', '-', '+', '*', '/'],

  // Holds the current symbols for calculation
  stack: [],

  updateDisplay: function calculator_updateDisplay() {
    if (this.stack.length === 0) {
      this.display.value = '0';
      return;
    }
    this.display.value = this.stack.join('');
  },

  isOperator: function calculator_isOperator(val) {
    return this.operators.indexOf(val) !== -1;
  },

  appendValue: function calculator_appendValue(value) {
    if (this.toClear) {
      this.stack = [];
      this.toClear = false;
    }
    this.stack.push(value);
    this.updateDisplay();
  },

  appendOperator: function calculator_appendOperator(value) {
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
  backSpace: function calculator_backSpace() {
    this.clearBackspaceTimeout();
    this.startBackspaceTimeout();
    this.stack = this.stack.slice(0, -1);
    this.updateDisplay();
  },

  substitute: function calculator_substitute(key) {
    if (key === '×') {
      return '*';
    }
    if (key === '÷') {
      return '/';
    }
    return key;
  },

  formatNumber: function calculator_formatNumber(n) {
    if (n % 1 == 0) {
      return n;
    }
    return n.toFixed(3);
  },

  calculate: function calculator_calculate() {
    if (this.stack.length === 0)
      return;

    try {
      var postfix =
        this.infix2postfix(this.stack.map(this.substitute).join(''));
      var result = this.evaluatePostfix(postfix);
      this.stack = [this.formatNumber(result)];
      this.updateDisplay();
      this.toClear = true;
    } catch (err) {
      this.display.classList.add('error');
      if (this.errorTimeout === null) {
        this.errorTimeout = window.setTimeout(function calc_errorTimeout(self) {
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

  precedence: function(val) {
    if (['-', '+'].indexOf(val) !== -1) {
      return 2;
    }
    if (['*', '/'].indexOf(val) !== -1) {
      return 3;
    }
  },

  // This is a basic implementation of the shunting yard algorithm
  // described http://en.wikipedia.org/wiki/Shunting-yard_algorithm
  // Currently functions are unimplemented and only operators with
  // left association are used
  infix2postfix: function(infix) {
    // We cant know up till this point whether - is for negation or subtraction
    // at this point we modify negation operators into (0-N) so 4+-5 -> 4+(0-5)
    infix = infix.replace(/(.)?(-)([0-9.]+)/g, function(match, pre, _, num) {
      return Calculator.isOperator(match[0]) ? pre + '(0-' + num + ')' : match;
    });

    // basic tokenisation to ensure we group numbers with >1 digit together
    var tokens = infix.match(/[0-9.]+|\*|\/|\+|\-|\(|\)/g);
    var output = [];
    var stack = [];

    tokens.forEach(function infix2postfix_inner(token) {
      if (/[0-9.]+/.test(token)) {
        output.push(parseFloat(token, 10));
      }

      var preference = this.precedence;
      var isOperator = this.isOperator;
      if (isOperator(token)) {
        while (isOperator(stack[stack.length - 1]) &&
               precedence(token) <= precedence(stack[stack.length - 1])) {
          output.push(stack.pop());
        }
        stack.push(token);
      }
      if (token === '(') {
        stack.push(token);
      }
      if (token === ')') {
        while (stack.length && stack[stack.length - 1] !== '(') {
          output.push(stack.pop());
        }
        // This is the (
        stack.pop();
      }
    }, this);

    while (stack.length > 0) {
      output.push(stack.pop());
    }

    return output;
  },

  evaluate: {
    '*': function(a, b) { return a * b; },
    '+': function(a, b) { return a + b; },
    '-': function(a, b) { return a - b; },
    '/': function(a, b) { return a / b; }
  },

  evaluatePostfix: function(postfix) {
    var stack = [];

    postfix.forEach(function evaluatePostFix_inner(token) {
      if (!this.isOperator(token)) {
        stack.push(token);
      } else {
        var op2 = stack.pop();
        var op1 = stack.pop();
        var result = this.evaluate[token](op1, op2);
        stack.push(result);
      }
    }, this);
    return stack.pop();
  },

  init: function calculator_init() {
    document.addEventListener('mousedown', this);
    document.addEventListener('mouseup', this);
    this.updateDisplay();
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
      this.clearBackspaceTimeout();
      break;
    }
  }
};

window.addEventListener('load', function calcLoad(evt) {
  window.removeEventListener('load', calcLoad);
  Calculator.init();
});

Calculator.test = function() {
  function run(args) {
    var formula = args[0];
    var expected = args[1];
    var postfix = Calculator.infix2postfix(formula);
    var result = Calculator.evaluatePostfix(postfix);
    return expected === result;
  };

  var formulas = [
    ['1+1', 2],
    ['3+4*2/(1-5)', 1],
    ['39+4*2/(1-5)', 37],
    ['(39+4)*2/(1-5)', -21.5],
    ['4+-5', -1],
    ['-5*6', -30],
    ['-5.5*6', -33],
    ['-5.5*-6.4', 35.2]
  ];

  var passed = formulas.every(run);

  if (passed) {
    console.log('Tests Passed!');
  }
  return passed;
};


