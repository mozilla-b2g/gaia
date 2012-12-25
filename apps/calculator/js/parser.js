'use strict';

function Parser(input) { this.init(input); }
Parser.prototype = {
  init: function(input) {
    // No spaces.
    input = input.replace(/[ \t\v\n]/g, '');

    // String to array:
    this._chars = [];
    for (var i = 0; i < input.length; ++i)
      this._chars.push(input[i]);

    this._tokens = [];
  },

  // This method returns an array of objects with these properties:
  // - number: true/false
  // - value:  the token value
  parse: function() {

    // The input must be a 'block' without any digit left.
    if (!this._tokenizeBlock() || this._chars.length)
      throw ({ type: 'error', msg: 'Wrong input'});

    return this._tokens;
  },

  _tokenizeBlock: function() {
    if (!this._chars.length)
      return false;

    // '(' + something + ')'
    if (this._chars[0] == '(') {
      this._tokens.push({number: false, value: this._chars[0]});
      this._chars.shift();

      if (!this._tokenizeBlock())
        return false;

      if (!this._chars.length || this._chars[0] != ')')
        return false;

      this._chars.shift();

      this._tokens.push({number: false, value: ')'});
    } else {
      // number + ...
      if (!this._tokenizeNumber())
        return false;
    }

    if (!this._chars.length || this._chars[0] == ')')
      return true;

    while(this._chars.length && this._chars[0] != ')') {
      if (!this._tokenizeOther())
       return false;

      if (!this._tokenizeBlock())
        return false;
    }

    return true;
  },

  // This is a simple float parser.
  _tokenizeNumber: function() {
    if (!this._chars.length)
      return false;

    // {+,-}something
    var number = [];
    if (/[+-]/.test(this._chars[0])) {
      number.push(this._chars.shift());
    }

    var me = this;
    function tokenizeNumberInternal() {
      if (!me._chars.length || !/^[0-9.]/.test(me._chars[0]))
        return false;

      while (me._chars.length && /[0-9.]/.test(me._chars[0])) {
        number.push(me._chars.shift());
      }

      return true;
    }

    if (!tokenizeNumberInternal())
      return false;

    // 123{e...}
    if (!this._chars.length || this._chars[0] != 'e') {
      this._tokens.push({number: true, value: number.join('')});
      return true;
    }

    number.push(this._chars.shift());

    // 123e{+,-}
    if (/[+-]/.test(this._chars[0])) {
      number.push(this._chars.shift());
    }

    if (!this._chars.length)
      return false;

    // the number
    if (!tokenizeNumberInternal())
      return false;

    this._tokens.push({number: true, value: number.join('')});
    return true;
  },

  _tokenizeOther: function() {
    if (!this._chars.length)
      return false;

    if (['*', '/', '+', '-'].indexOf(this._chars[0]) != -1) {
      this._tokens.push({number: false, value: this._chars.shift()});
      return true;
    }

    return false;
  }
};
