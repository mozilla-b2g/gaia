'use strict';

var Calculator = {

  BACKSPACE_TIMEOUT: 750,

  display: document.querySelector('#display b'),
  backSpaceTimeout: null,
  errorTimeout: null,
  toClear: false,

  operators: ['÷', '×', '-', '+', '*', '/'],

  // Holds the current symbols for calculation
  stack: [],

  updateDisplay: function calculator_updateDisplay() {
    if (this.stack.length === 0) {
      this.display.innerHTML = '0';
    } else {
      var infinite = new RegExp((1 / 0) + '', 'g');
      var outval = this.stack.join('').replace(infinite, '∞');
      this.display.innerHTML = outval;
    }

    var valWidth = this.display.offsetWidth;
    var screenWidth = this.display.parentNode.offsetWidth;
    var scaleFactor = Math.min(1, (screenWidth - 16) / valWidth);
    this.display.style.MozTransform = 'scale(' + scaleFactor + ')';
  },

  isNumeric: function calculator_isNumeric(value) {
    return (value - 0) == value && value.length > 0;
  },

  isOperator: function calculator_isOperator(value) {
    return Calculator.operators.indexOf(value) !== -1;
  },

  appendValue: function calculator_appendValue(value) {
    if (this.toClear) {
      this.stack = [];
      this.toClear = false;
    }
    this.stack.push(value);
    this.updateDisplay();
  },

  appendDigit: function calculator_appendDigit(value) {
    this.toClear = false;

    var currentNumber = this.stack.pop();

    // Check if the current thing is a number
    if(this.isNumeric(currentNumber)) {
      if(value == '.') {
        // Only add . to the current number if it does not already exist
        if(currentNumber.indexOf('.') == -1)
          currentNumber += value;
      }
      else
        currentNumber += value;

      this.appendValue(currentNumber);
    }
    else {
      if(currentNumber != undefined)
        this.stack.push(currentNumber);
      if(value == '.')
        value = '0.';

      this.appendValue(value);
    }
  },

  appendOperator: function calculator_appendOperator(value) {
    this.toClear = false;

    // Subtraction can also be used as a negative value
    if (value === '-' && this.stack[this.stack.length - 1] !== '-') {
      this.appendValue(value);
      return;
    }

    // New operators will overwrite any current operators, because subtraction
    // is allowed after other operators there may be more than 1
    while (this.isOperator(this.stack[this.stack.length - 1])) {
      this.stack.pop();
    }

    if (this.stack.length === 0) {
      this.updateDisplay();
      return;
    }

    this.stack.push(value);
    this.updateDisplay();
  },

  // if backspace / clear is held for BACKSPACE_TIMEOUT, it will clear the
  // full formula
  backSpace: function calculator_backSpace() {
    this.clearBackspaceTimeout();
    this.startBackspaceTimeout();
    this.stack.splice(this.stack.length - 1, 1);
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
      this.stack = [this.formatNumber(result).toString()];
      this.updateDisplay();
      this.toClear = true;
    } catch (err) {
      this.display.parentNode.classList.add('error');
      if (this.errorTimeout === null) {
        this.errorTimeout = window.setTimeout(function calc_errorTimeout(self) {
          self.display.parentNode.classList.remove('error');
          self.errorTimeout = null;
        }, 300, this);
      }
    }
  },

  clearBackspaceTimeout: function calculator_clearBackspaceTimeout() {
    if (this.backSpaceTimeout !== null) {
      window.clearTimeout(this.backSpaceTimeout);
      this.backSpaceTimeout = null;
    }
  },

  startBackspaceTimeout: function calculator_startBackspaceTimeout() {
    this.backSpaceTimeout = window.setTimeout(function fullBackSpace(self) {
      self.stack = [];
      self.toClear = false;
      self.updateDisplay();
      self.backSpaceTimeout = null;
    }, this.BACKSPACE_TIMEOUT, this);
  },

  precedence: function calculator_precedence(val) {
    if (['-', '+'].indexOf(val) !== -1) {
      return 2;
    }
    if (['*', '/'].indexOf(val) !== -1) {
      return 3;
    }

    return null;
  },

  // This is a basic implementation of the shunting yard algorithm
  // described http://en.wikipedia.org/wiki/Shunting-yard_algorithm
  // Currently functions are unimplemented and only operators with
  // left association are used
  infix2postfix: function calculator_infix2postfix(infix) {
    // We cant know up till this point whether - is for negation or subtraction
    // at this point we modify negation operators into (0-N) so 4+-5 -> 4+(0-5)
    infix = infix.replace(
      /(([^0-9])-|^-)([0-9.]+)/g,
      function(match, _, pre, num) {
        pre = pre || '';
        return pre + '(0-' + num + ')';
      }
    );

    // basic tokenisation to ensure we group numbers with >1 digit together
    var tokens = infix.match(/[0-9.]+|\*|\/|\+|\-|\(|\)/g);
    var output = [];
    var stack = [];

    tokens.forEach(function infix2postfix_inner(token) {
      if (/[0-9.]+/.test(token)) {
        output.push(parseFloat(token, 10));
      }

      var isOperator = this.isOperator;
      if (isOperator(token)) {
        var precedence = this.precedence;
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

  evaluatePostfix: function calculator_evaluatePostfix(postfix) {
    var stack = [];

    postfix.forEach(function evaluatePostFix_inner(token) {
      if (!this.isOperator(token)) {
        stack.push(token);
      } else {
        var op2 = stack.pop();
        var op1 = stack.pop();
        var result = this.evaluate[token](op1, op2);
        if (isNaN(result))
          throw ({ type: 'error', msg: 'Value is ' + result });
        stack.push(result);
      }
    }, this);
    var finalResult = stack.pop();
    if (isNaN(finalResult))
      throw ({ type: 'error', msg: 'Value is ' + finalResult });
    return finalResult;
  },

  init: function calculator_init() {
    document.addEventListener('mousedown', this);
    document.addEventListener('mouseup', this);
    this.updateDisplay();
  },

  handleEvent: function calculator_handleEvent(evt) {
    var target = evt.target;
    switch (evt.type) {
      case 'mousedown':
        var value = target.value;
        switch (target.dataset.type) {
          case 'value':
            this.appendDigit(value);
            break;
          case 'operator':
            this.appendOperator(value);
            break;
          case 'command':
            switch (value) {
              case '=':
                this.calculate();
                break;
              case 'C':
                this.backSpace();
                break;
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
    ['-5.5*-6.4', 35.2],
    ['-6-6-6', -18],
    ['6-6-6', -6]
  ];

  var passed = formulas.every(run);

  if (passed) {
    console.log('Tests Passed!');
  }
  return passed;
};


