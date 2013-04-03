/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*
 * This latin input method provides three forms of input assistance:
 *
 * 1) word suggestions
 *
 * 2) auto capitalization
 *
 * 3) punctuation assistance by converting space space to period space
 *    and by transposing space followed by punctuation.
 *
 * These input modifications are controlled by the type and inputmode
 * properties of the input element that has the focus. If inputmode is
 * "verbatim" then the input method does not modify the user's input in any
 * way. See getInputMode() for a description of input modes.
 */
(function() {
  // Register ourselves in the keyboard's set of input methods
  // The functions used here are all defined below
  InputMethods.latin = {
    init: init,
    activate: activate,
    deactivate: deactivate,
    displaysCandidates: displaysCandidates,
    click: click,
    select: select,
    setLayoutParams: setLayoutParams
  };

  // This is the object that is passed to init().
  // We use the methods of this object to communicate with the keyboard.
  var keyboard;

  // If defined, this is a worker thread that produces word suggestions for us
  var worker;

  // These variables are the input method's state. Most of them are
  // passed to the activate() method or are derived in that method.
  var language;           // The user's language
  var inputMode;          // The inputmode we're using: see getInputMode()
  var capitalizing;       // Are we auto-capitalizing for this activation?
  var suggesting;         // Are we offering suggestions for this activation?
  var punctuating;        // Are we offering punctuation assistance?
  var inputText;          // The input text
  var cursor;             // The insertion position
  var selection;          // The end of the selection, if there is one, or 0
  var lastKeyWasSpace;    // Was the last key a space?
  var layoutParams;       // Parameters passed to setLayoutParams
  var idleTimer;          // Used by deactivate
  var suggestionsTimer;   // Used by updateSuggestions;
  var inhibitAutoCorrect; // Was auto-correct disabled by backspace?

  // Avoid generating needless garbage.
  const EmptyArray = [];

  // Terminate the worker when the keyboard is inactive for this long.
  const workerTimeout = 30000;  // 30 seconds of idle time

  // If we get an autorepeating key is sent to us, don't offer suggestions
  // for this long, until we're pretty certain that the autorepeat
  // has stopped.
  const autorepeatDelay = 250;

  // Some keycodes that we use
  const SPACE = KeyEvent.DOM_VK_SPACE;
  const BACKSPACE = KeyEvent.DOM_VK_BACK_SPACE;
  const RETURN = KeyEvent.DOM_VK_RETURN;
  const PERIOD = 46;
  const QUESTION = 63;
  const EXCLAMATION = 33;
  const COMMA = 44;

  const WS = /^\s+$/;                    // all whitespace characters
  const UC = /^[A-ZÀ-ÖØ-Þ]+$/;           // all uppercase latin characters
  const LETTER = /^[a-zA-ZÀ-ÖØ-öø-ÿ]+$/; // all latin letters

  const DOUBLE_SPACE_TIME = 700; // ms between spaces to convert to ". "

  // keyboard.js calls this to pass us the interface object we need
  // to communicate with it
  function init(interfaceObject) {
    keyboard = interfaceObject;
  }

  // Given the type property and inputmode attribute of a form element,
  // this function returns the inputmode that this IM should use. The
  // return value will be one of these strings:
  //
  //   'verbatim': don't alter the user's input at all
  //   'latin': offer word suggestions/corrections, but no capitalization
  //   'latin-prose': offer word suggestions and capitalization
  //
  function getInputMode(type, mode) {
    // For text, textarea and search types, use the requested input
    // mode if it is valid and supported. Otherwise default to latin
    // for text and search and to latin-prose for textarea.  For all
    // other form fields, use verbatim mode so we never alter input.
    switch (type) {
    case 'text':
    case 'textarea':
    case 'search':
      switch (mode) {
      case 'verbatim':
      case 'latin':
      case 'latin-prose':
        return mode;
      default:
        return (type === 'textarea') ? 'latin-prose' : 'latin';
      }

    default:
      return 'verbatim';
    }
  }

  // This gets called whenever the keyboard pops up to tell us everything
  // we need to provide useful typing assistance.
  function activate(lang, suggestionsEnabled, state) {
    language = lang;
    inputMode = getInputMode(state.type, state.inputmode);
    inputText = state.value;
    cursor = state.selectionStart;
    if (state.selectionEnd > state.selectionStart)
      selection = state.selectionEnd;
    else
      selection = 0;

    // Figure out what kind of input assistance we're providing for this
    // activation.
    capitalizing = punctuating = (inputMode === 'latin-prose');
    suggesting = (suggestionsEnabled && inputMode !== 'verbatim');

    // If we are going to offer suggestions, set up the worker thread.
    if (suggesting)
      setupSuggestionsWorker();

    // Reset the double space flag
    lastKeyWasSpace = 0;

    // Reset auto-correct surpression.
    inhibitAutoCorrect = false;

    // Start off with the correct capitalization and suggestions
    updateCapitalization();
    updateSuggestions();
  }

  function deactivate() {
    if (!worker || idleTimer)
      return;
    idleTimer = setTimeout(function onIdleTimeout() {
      // Let's terminate the worker.
      worker.terminate();
      worker = null;
      idleTimer = null;
    }, workerTimeout);
  }

  function displaysCandidates() {
    return suggesting;
  }

  function bestFit(oldword, words) {
    oldword = oldword.toLowerCase();
    // Prefer exact matches even if not highest ranked.
    for (var n = 0; n < words.length; ++n) {
      var candidate = words[n];
      if (candidate.toLowerCase() == oldword)
        return candidate;
    }
    // Otherwise return the best suggestion.
    return words[0];
  }

  function setupSuggestionsWorker() {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }

    if (!worker) {
      // If we haven't created the worker before, do it now
      worker = new Worker('js/imes/latin/worker.js');
      if (layoutParams)
        worker.postMessage({ cmd: 'setLayout', args: [layoutParams]});

      worker.onmessage = function(e) {
        switch (e.data.cmd) {
        case 'log':
          console.log(e.data.msg);
          break;
        case 'unknownLanguage':
          console.error('No dictionary for language', e.data.language);
          break;
        case 'predictions':
          var candidates = EmptyArray;
          var line = inputText, pos = cursor;
          console.log("line=" + line);
          console.log("pos=" + pos);
          console.log(JSON.stringify(e.data.words));
          if (e.data.words.length > 0) {
            // If we are still at the end of the right word, send the
            // candidates. Otherwise clear the suggestion list.
            if (atWordEnd(line, pos) && lastWord(line, pos) == e.data.prefix) {
              console.log("here1");
              candidates = e.data.words;
            }
            // If we are at the end of the line, and the line is not empty,
            // check for a matching word to auto-correct.
            else if (pos > 0 && pos == line.length) {
              console.log("here2");
              // If there is a whitespace at the end of the line, ignore it.
              if (WS.test(line[pos - 1])) {
                console.log("here3");
                line = line.substr(0, line.length - 1);
                --pos;
              }
              // If there is a single punctuation, ignore that as well.
              if (/[\.\?!,]/.test(line[pos - 1])) {
                console.log("here4");
                line = line.substr(0, line.length - 1);
                --pos;
              }
              // Ok, now if we are at the end of a matching word, then
              // we auto-correct.
              var oldword;
              if (atWordEnd(line, pos) &&
                  (oldword = lastWord(line, pos)) == e.data.prefix) {
                var newword = bestFit(oldword, e.data.words);
                console.log("oldword=" + oldword + " newword=" + newword);
                if (oldword != newword) {
                  console.log("here5");
                  // Take into account and preserve the current punctuation
                  // (and space).
                  var punctuation = inputText.substr(pos);
                  console.log("punctuation=X" + punctuation + "X");
                  replace(oldword + punctuation, newword + punctuation);
                }
              }
            }
          }
          keyboard.sendCandidates(candidates);
          break;
        }
      };
    }

    // Tell the worker what language we're using. They may cause it to
    // load or reload its dictionary.
    worker.postMessage({ cmd: 'setLanguage', args: [language]});
  }

  function handleAutoCorrect(keycode, repeat) {
    // No auto-correct while we are selecting something or in repeat mode.
    if (selection || repeat)
      return;

    switch (keycode) {
    case SPACE:
    case RETURN:
    case PERIOD:
    case QUESTION:
    case EXCLAMATION:
      // If auto-correct is disabled because we saw a backspace, re-arm it
      // but don't actually auto-correct.
      if (inhibitAutoCorrect) {
        inhibitAutoCorrect = false;
        return;
      }
      // If we are at the end of a word *before* we add keycode to the input,
      // and the keycode triggers auto-correct, ask for suggestions right now.
      if (atWordEnd(inputText, cursor)) {
        requestSuggestions();
        return;
      }
      break;
    case BACKSPACE:
      // Inhibit auto-correct until we move past the end of the word.
      inhibitAutoCorrect = cursor > 0;
      break;
    }
  }

  function click(keycode, x, y, repeat) {
    // Possibly trigger auto-correct.
    handleAutoCorrect(keycode, repeat);

    if (punctuating && handlePunctuation(keycode)) {
      // nothing to do here: handlePunctuation did it for us
    }
    else {
      // Update our internal model of the input text and cursor position
      updateState(keycode);
      // Generate the key event
      keyboard.sendKey(keycode);
    }

    // And update the keyboard capitalization state, if necessary
    updateCapitalization();

    // If we're offering suggestions, ask the worker to make them now
    updateSuggestions(repeat);

    // Exit symbol layout mode after space or return key is pressed.
    if (keycode === SPACE || keycode === RETURN) {
      keyboard.setLayoutPage(LAYOUT_PAGE_DEFAULT);
    }
  }

  function replace(oldword, newword) {
    console.log("replace=X" + oldword + "X with X" + newword + "X");
    var firstletter = cursor - oldword.length;

    // Send backspaces
    for (var n = 0; n < oldword.length; ++n)
      keyboard.sendKey(BACKSPACE);

    // Send the new word
    keyboard.sendString(newword);

    // Update internal state
    inputText =
      inputText.substring(0, firstletter) +
      newword +
      inputText.substring(cursor);

    cursor = firstletter + newword.length;
  }

  // If the user selections one of the suggestions offered by this input method
  // the keyboard calls this method to tell us it has been selected.
  // We have to backspace over the current word, insert this new word, and
  // update our internal state to match.
  function select(newword) {
    // Avoid race conditions where we are no longer at the end of the word.
    if (!atWordEnd(inputText, cursor)) {
      keyboard.sendCandidates(EmptyArray);
      return;
    }

    // Replace the current word we are at the end of with the new word and
    // a space.
    replace(lastWord(inputText, cursor), newword + " ");

    // Clear the suggestions
    keyboard.sendCandidates(EmptyArray);

    // And update the keyboard capitalization state, if necessary
    updateCapitalization();
  }

  function setLayoutParams(params) {
    layoutParams = params;
    if (worker)
      worker.postMessage({ cmd: 'setLayout', args: [params]});
  }

  // Ask for suggestions for the word we are at the end of.
  function requestSuggestions() {
    worker.postMessage({cmd: 'predict', args: [lastWord(inputText, cursor)]});
  }

  function updateSuggestions(repeat) {
    // If the user hasn't enabled suggestions, or if they're not appropriate
    // for this input type, or are turned off by the input mode, do nothing
    if (!suggesting)
      return;

    // If we deferred suggestions because of a key repeat, clear that timer
    if (suggestionsTimer) {
      clearTimeout(suggestionsTimer);
      suggestionsTimer = null;
    }

    if (repeat) {
      suggestionsTimer = setTimeout(updateSuggestions, autorepeatDelay);
      return;
    }

    // If we are not at the end of the word, clear any pending candidates
    // instead of requesting the worker to send us new suggestions. We also
    // never offer suggestions while selecting.
    if (selection || !atWordEnd(inputText, cursor)) {
      keyboard.sendCandidates(EmptyArray);
      return;
    }

    // Request that the worker sends us an updated set of suggestions.
    requestSuggestions();
  }

  // This function handles two special punctuation cases. If the user
  // types two spaces sufficiently close together we convert them to
  // period space.  And if the user types nonspace space punctuation,
  // we transpose the space and the punctuation. (This supports adding
  // a punctuation mark after a word suggestion since suggestions
  // automatically insert a space.) This method returns true if it
  // handles the keycode and returns false otherwise.
  function handlePunctuation(keycode) {
    if (!punctuating || selection)
      return false;

    // In both the space space and the space period case we call this function
    function fixPunctuation(keycode) {
      keyboard.sendKey(BACKSPACE);
      keyboard.sendKey(keycode);
      keyboard.sendKey(SPACE);

      inputText = inputText.substring(0, cursor - 1) +
        String.fromCharCode(keycode) +
        ' ' +
        inputText.substring(cursor);
      cursor++;
    }

    switch (keycode) {
    case SPACE:
      var now = Date.now();

      if (lastKeyWasSpace &&
          (now - lastKeyWasSpace) < DOUBLE_SPACE_TIME &&
          cursor >= 2 &&
          !isWhiteSpace(inputText[cursor - 2]))
      {
        fixPunctuation(PERIOD);
        lastKeyWasSpace = 0;
        return true;
      }

      lastKeyWasSpace = now;
      return false;

    case PERIOD:
    case QUESTION:
    case EXCLAMATION:
    case COMMA:
      lastKeyWasSpace = 0;
      if (cursor >= 2 &&
          isWhiteSpace(inputText[cursor - 1]) &&
          !isWhiteSpace(inputText[cursor - 2])) {
        fixPunctuation(keycode);
        return true;
      }
      return false;

    default:
      lastKeyWasSpace = 0;
      return false;
    }
  }

  function updateState(keycode) {
    if (keycode === BACKSPACE) {
      if (selection) {
        // backspace while a region is selected erases the selection
        // and leaves the cursor at the selection start
        inputText = inputText.substring(0, cursor) +
          inputText.substring(selection);
        selection = 0;
      } else if (cursor > 0) {
        cursor--;
        inputText = inputText.substring(0, cursor) +
          inputText.substring(cursor + 1);
      }
    } else {
      if (selection) {
        inputText =
          inputText.substring(0, cursor) +
          String.fromCharCode(keycode) +
          inputText.substring(selection);
        selection = 0;
      } else {
        inputText =
          inputText.substring(0, cursor) +
          String.fromCharCode(keycode) +
          inputText.substring(cursor);
      }
      cursor++;
    }
  }

  function updateCapitalization() {
    // If either the input mode or the input type is one that doesn't
    // want capitalization, then don't alter the state of the keyboard.
    if (!capitalizing) {
      keyboard.resetUpperCase();
      return;
    }

    // Set the keyboard to uppercase or lowercase depending
    // on the text around the cursor:
    //
    // 1) If the cursor is at the start of the field: uppercase
    //
    // 2) If there are two uppercase chars before the cursor: uppercase
    //
    // 3) If there is a non space character immediately before the cursor:
    //    lowercase
    //
    // 4) If the first non-space character before the cursor is . ? or !:
    //    uppercase
    //
    // 5) Otherwise: lowercase
    //
    if (cursor === 0) {
      keyboard.setUpperCase(true);
    }
    else if (cursor >= 2 &&
             isUpperCase(inputText.substring(cursor - 2, cursor))) {
      keyboard.setUpperCase(true);
    }
    else if (!isWhiteSpace(inputText.substring(cursor - 1, cursor))) {
      keyboard.setUpperCase(false);
    }
    else if (atSentenceStart(inputText, cursor)) {
      keyboard.setUpperCase(true);
    }
    else {
      keyboard.setUpperCase(false);
    }
  }

  function isUpperCase(s) {
    return UC.test(s);
  }

  function isWhiteSpace(s) {
    return WS.test(s);
  }

  // We only offer suggestions if the cursor is at the end of a word
  // The character before the cursor must be a word character and
  // the cursor must be at the end of the input or the character after
  // must be whitespace.
  function atWordEnd(line, pos) {
    // If we're not at the end of the line and the character after the
    // cursor is not whitespace, don't offer a suggestion
    if (pos < line.length && !WS.test(line[pos]))
      return false;

    // We're at the end of a word if the cursor is not at the start and
    // the character before the cursor is a letter
    return pos > 0 && LETTER.test(line[pos - 1]);
  }

  // Find the word we are at the end of.
  function lastWord(line, pos) {
    for (var firstletter = pos - 1; firstletter >= 0; firstletter--) {
      if (!LETTER.test(line[firstletter])) {
        break;
      }
    }
    firstletter++;

    // firstletter is now the position of the start of the word and cursor is
    // the end of the word
    return line.substring(firstletter, pos);
  }

  function atSentenceStart(line, pos) {
    var i = pos - 1;

    if (i === -1)    // This is the empty string case
      return true;

    // Verify that the position before the cursor is whitespace
    if (!isWhiteSpace(line[i--]))
      return false;
    // Now skip any additional whitespace before that
    while (i >= 0 && isWhiteSpace(line[i]))
      i--;

    if (i < 0)     // whitespace all the way back to the end of the string
      return true;

    var c = line[i];
    return c === '.' || c === '?' || c === '!';
  }
}());
