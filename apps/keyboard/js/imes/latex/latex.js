/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global InputMethods */
/* global KeyEvent */

'use strict';

/*
 * This LaTeX input method provides two form of input assistance:
 *
 * 1) input place correction
 *
 * 2) backspace composite key
 *
 * 3) ellipse correction
 *
 */

(function() {
  // Register ourselves in the keyboard's set of input methods
  // The functions used here are all defined below
  InputMethods.latex = {
    init: init,
    activate: activate,
    deactivate: deactivate,
    click: click,
    compositeKeyClick: compositeKeyClick
  };

  // This is the object that is passed to init().
  // We use the methods of this object to communicate with the keyboard.
  var keyboard;

  // These variables are the input method's state. Most of them are
  // passed to the activate() method or are derived in that method.
  var cursor;             // The insertion position
  var inputText;          // The input text
  var selection;          // The end of the selection, if there is one, or 0

  // Some keycodes that we use
  const BACKSPACE = KeyEvent.DOM_VK_BACK_SPACE;
  const RETURN = KeyEvent.DOM_VK_RETURN;
  const PERIOD = 46;

  // keyboard.js calls this to pass us the interface object we need
  // to communicate with it
  function init(interfaceObject) {
    keyboard = interfaceObject;
  }

  // This gets called whenever the keyboard pops up to tell us everything
  // we need to provide useful typing assistance. It also gets called whenever
  // the user taps on an input field to move the cursor. That means that there
  // may be multiple calls to activate() without calls to deactivate between
  // them.
  function activate(lang, state, options) {
    inputText = state.value;
    cursor = state.selectionStart;
    if (state.selectionEnd > state.selectionStart) {
      selection = state.selectionEnd;
    } else {
      selection = 0;
    }
  }

  function deactivate() {
    return;
  }

  /*
   * The keyboard calls this method to tell us about user input.
   *
   * What we do with the input depends on various things.
   *
   */
  function click(keyCode, upperKeyCode, repeat) {
    switch (keyCode) {
    case RETURN:
      handleReturn();
      break;

    case BACKSPACE:
      handleBackspace();
      break;

    case PERIOD:
      handlePeriod();
      break;

    default:
      keyCode = keyboard.isCapitalized() && upperKeyCode ? upperKeyCode :
        keyCode;
      keyboard.sendKey(keyCode, repeat);

      // The default keyboard disable the upper case function after inserting
      // one letter (if the upper case isn't lock). This keyboard will have the
      // same behaviour.
      keyboard.setUpperCase({
        isUpperCase: false
      });
      break;
    }
  }

  function computeJumpLength(textAfterCursor) {
    // We need to identify many cases:
    //
    // - delimiters (e.g. \right(, \right], \right\}, \rangle, \rang,
    //   \rceil, \rfloor),
    // - environments (e.g. \end{foo}),
    // - end of commands options (e.g. ]),
    // - end of commands arguments (e.g. }),
    // - end of math environment (e.g. $ and $$).
    //
    // To do this we use a regex.
    var latexJumpRegex =
      /(\\r(ight(\)|\]|\\\})|angle|ang|ceil|floor)|\\end\{\w+\}|\]|\\?\}|\\?\||\$)/;

    var latexJumpMatch = textAfterCursor.match(latexJumpRegex);
    if (latexJumpMatch) {
      if (latexJumpMatch[0].startsWith('\\r') ||
          latexJumpMatch[0].startsWith('\\end')) {
        // If matching one delimiter, jump to the end of it.
        return latexJumpMatch.index + latexJumpMatch[0].length;
      } else {
        // If latexJumpMatch start at the begin of textAfterCursor we need
        // to do something otherwise the cursor will not move.
        if (latexJumpMatch.index === 0) {
          if (textAfterCursor.length === latexJumpMatch[0].length) {
            // If the match is the text after cursor we move to the end of it.
            return latexJumpMatch[0].length;
          } else if (textAfterCursor[latexJumpMatch[0].length] === '\\') {
            // If the next char after the match is '\' we move before it.
            return latexJumpMatch[0].length;
          } else if (textAfterCursor[latexJumpMatch[0].length] === ' ') {
            // If the next char after the match is ' ' we move after it.
            return latexJumpMatch[0].length + 1;
          } else {
            // Otherwise we need to search for another match.
            return latexJumpMatch[0].length +
              computeJumpLength(
                  textAfterCursor.slice(latexJumpMatch[0].length));
          }
        } else {
          return latexJumpMatch.index;
        }
      }
    } else {
      return 0;
    }
  }

  /*
   * Return key is used to jump inside and outside LaTeX commands and
   * environment. Jumping inside is needed because of nested constructions
   * \underset{}{\overset{}{}}. To make inserting line-break possible, a
   * threshold is used to avoid long jumps.
   *
   */
  function handleReturn() {
    var jumpThreshold = 72;
    var textAfterCursor = keyboard.app.inputContext.textAfterCursor;
    // Avoid jump to next paragraph
    textAfterCursor = textAfterCursor.split('\n')[0];
    // Allow only small jumps
    textAfterCursor = textAfterCursor.slice(0, jumpThreshold);

    var jumpLength = computeJumpLength(textAfterCursor);
    if (jumpLength > 0) {
      jumpLength += keyboard.app.inputContext.selectionStart;
      keyboard.app.inputContext.setSelectionRange(jumpLength, 0);
    } else {
      keyboard.sendKey(RETURN);
    }
  }

  /*
   * Backspace key will remove LaTeX commands but it won't remove its
   * parameters.
   *
   */
  function handleBackspace() {
    var lastCommandRegex = /\\(\w+|\||\{)$/;
    var numberOfBackspacesToEmit = 1;
    var textBeforeCursor = keyboard.app.inputContext.textBeforeCursor;

    var lastCommandMatch = textBeforeCursor.match(lastCommandRegex);
    if (lastCommandMatch) {
      numberOfBackspacesToEmit = lastCommandMatch[0].length;
    }

    for (var i = 0; i < numberOfBackspacesToEmit; i++) {
      keyboard.sendKey(BACKSPACE);
    }
  }

  /*
   * Three dots must be converted to \dots.
   *
   */
  function handlePeriod() {
    var lastPeriodRegex = /\.\.$/;
    var textBeforeCursor = keyboard.app.inputContext.textBeforeCursor;

    var lastPeriodMatch = textBeforeCursor.match(lastPeriodRegex);
    if (lastPeriodMatch) {
      // Remove ..
      keyboard.sendKey(BACKSPACE);
      keyboard.sendKey(BACKSPACE);
      // Insert \dots
      compositeKeyClick('\\dots');
    } else {
      keyboard.sendKey(PERIOD);
    }
  }

  /*
   * The keyboard calls this method to tell us about user compositeKey input.
   *
   * After input the compositeKey the cursor is moved to where the user will
   * input the next character.
   *
   */
  function compositeKeyClick(compositeKey, repeat) {
    // For the keys
    //
    // - $$
    // - ||
    // - \|\|
    //
    // we need to move the cursor for the middle of the key. To identify this
    // keys we use a regex that match '$', '|' and '\|'.
    var latexMiscRegex = /(\$|\||\\\|)/;
    var latexBeginEnvRegex = /\\begin{\w+}/;
    var latexDelimiterRegex = /\\l\w+(\(|\[|\\\{)?\\r\w+(\)|\]|\\\})?/;
    var latexCommandEndRegex = /[}\]]/;
    var startingNewToken;
    var selectionStart = keyboard.app.inputContext.selectionStart;
    var wordsBeforeCursor = keyboard.app.inputContext.textBeforeCursor;
    var cursorOffset= 0;

    if (wordsBeforeCursor.length === 0 ||
        wordsBeforeCursor.endsWith(' ') ||
        wordsBeforeCursor.endsWith('$')) {
      startingNewToken = true;
    } else {
      startingNewToken = false;
    }

    // Calculate how many characters the cursor must go back for commands or
    // environments and for subscript and superscript skip the first parameter
    // when it is immediately behind the cursor.
    var latexMiscMatch = compositeKey.match(latexMiscRegex);
    var latexBeginEnvMatch = compositeKey.match(latexBeginEnvRegex);
    var latexDelimiterMatch = compositeKey.match(latexDelimiterRegex);
    var latexCommandEndMatch = compositeKey.match(latexCommandEndRegex);
    //
    // For '$$' and '||' the place holder is between the symbols.
    if (latexMiscMatch) {
      cursorOffset = compositeKey.length / 2;
    } else if (latexBeginEnvMatch) {
      cursorOffset = compositeKey.length - latexBeginEnvMatch[0].length;
    } else if (latexDelimiterMatch) {
      cursorOffset = compositeKey.length - compositeKey.search(/\\r/);
    } else if (latexCommandEndMatch) {
      // If inserting subscript or superscript without starting a new token,
      // skip the first parameters.
      if (latexCommandEndMatch.index === 1 &&
          latexCommandEndMatch[0] === '}' &&
          !startingNewToken) {
        compositeKey = compositeKey.substr(2);
        cursorOffset = compositeKey.length - compositeKey.search('{') - 1;
      }
      else {
        cursorOffset = compositeKey.length - latexCommandEndMatch.index;
      }
    }

    // Insert compositeKey
    for (var i = 0; i < compositeKey.length; i++) {
      keyboard.sendKey(compositeKey.charCodeAt(i));
    }

    // The default keyboard disable the upper case function after insert one
    // letter (if the upper case isn't lock). This keyboard will have the same
    // behaviour for Greek letters and styled letters (this doesn't effect
    // others keys because they don't have upper case value).
    keyboard.setUpperCase({
      isUpperCase: false
    });

    // Change the cursor position.
    selectionStart += compositeKey.length - cursorOffset;
    keyboard.app.inputContext.setSelectionRange(selectionStart, 0);
  }

}());
