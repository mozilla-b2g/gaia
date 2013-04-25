/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*
 * This latin input method provides four forms of input assistance:
 *
 * 1) word suggestions
 *
 * 2) auto correction
 *
 * 3) auto capitalization
 *
 * 4) punctuation assistance by converting space space to period space
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
  var correcting;         // Are we auto-correcting user input?
  var punctuating;        // Are we offering punctuation assistance?
  var inputText;          // The input text
  var cursor;             // The insertion position
  var selection;          // The end of the selection, if there is one, or 0
  var lastSpaceTimestamp; // If the last key was a space, this is the timestamp
  var layoutParams;       // Parameters passed to setLayoutParams
  var idleTimer;          // Used by deactivate
  var suggestionsTimer;   // Used by updateSuggestions;
  var autoCorrection;     // Correction to make if next input is space
  var revertTo;           // Revert to this on backspace after autocorrect
  var revertFrom;         // Revert away from this on backspace
  var justAutoCorrected;  // Was last change an auto correction?
  var correctionDisabled; // Temporarily diabled after reverting?

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
  const COLON = 58;
  const SEMICOLON = 59;

  const WS = /^\s+$/;                    // all whitespace characters
  const UC = /^[A-ZÀ-ÖØ-Þ]+$/;           // all uppercase latin characters

  const DOUBLE_SPACE_TIME = 700; // ms between spaces to convert to ". "

  // Don't offer to autocorrect unless we're reasonably certain that the
  // user wants this correction. The first suggested word must be at least
  // this much more highly weighted than the second suggested word.
  // XXX: this seems too low, but we get a root word and the root with suffix
  // that have similar weights, and should probably auto correct on one.
  // Maybe the prediction engine should weight on the length of the word so
  // that we can raise this to 1.25 or something.
  const AUTO_CORRECT_THRESHOLD = 1.05;

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
  function activate(lang, state, options) {
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
    suggesting = (options.suggest && inputMode !== 'verbatim');
    correcting = (options.correct && inputMode !== 'verbatim');

    // If we are going to offer suggestions, set up the worker thread.
    if (suggesting || correcting)
      setupSuggestionsWorker();

    // Reset the double space flag
    lastSpaceTimestamp = 0;

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
          console.log.apply(console, e.data.message);
          break;
        case 'unknownLanguage':
          console.error('No dictionary for language', e.data.language);
          break;
        case 'predictions':
          handleSuggestions(e.data.input, e.data.suggestions);
          break;
        }
      };
    }

    // Tell the worker what language we're using. They may cause it to
    // load or reload its dictionary.
    worker.postMessage({ cmd: 'setLanguage', args: [language]});
  }

  /*
   * The keyboard calls this method to tell us about user input.
   *
   * What we do with the input depends on various things:
   *
   * - whether we are suggesting, correcting, punctuating and/or capitalizing:
   *   these are controlled by settings, input mode and input type
   *
   * - whether there is a selected region in the input field
   *
   * - whether there is an auto-correction ready (when input is space
   *   or punctuation).
   *
   * - whether the last action was an autocorrection (when input is backspace)
   *
   * - the cursor position (affects suggestions, capitalization, etc.)
   *
   * If there is a selection just handle simple insertions and deletions
   * with no extra behavior. (I think)
   *
   * If input is a space or punctuation:
   *
   *  If there is a autocorrection ready, and we are correcting and
   *  the cursor is at the end of a word, make the correction
   *
   *  If the previous character is a space, fix the punctuation. Note that
   *  this only works for a subset of the punctuation characters.
   *
   *  Otherwise just insert it.
   *
   *  If we're correcting and corrections are temporarily diabled, turn them
   *  back on.
   *
   * If input is a backspace:
   *
   *  If we just did an auto-correction, revert it and turn off corrections
   *  until the next space or punctuation character.
   *
   *  If we just inserted a suggested word that the user selected, revert
   *  the insertion, but don't disable autocorrect.
   *
   *  Should we undo punctuation corrections this way, too?
   *
   *  Otherwise, just delete the character before the cursor
   *
   * For any other input character, just insert it.
   *
   * Reset the backspace reversion state
   *
   * Update the capitalization state, if we're capitalizing
   */
  function click(keycode, repeat) {
    // If the key is anything other than a backspace, forget about any
    // previous changes that we would otherwise revert.
    if (keycode !== BACKSPACE) {
      revertTo = revertFrom = '';
      justAutoCorrected = false;
    }

    if (selection) {
      // If there is selected text, don't do anything fancy here.
      handleKey(keycode);
    }
    else {
      switch (keycode) {
      case SPACE:
      case RETURN:
      case PERIOD:
      case QUESTION:
      case EXCLAMATION:
      case COMMA:
      case COLON:
      case SEMICOLON:
        // These keys may trigger word or punctuation corrections
        handleCorrections(keycode);
        correctionDisabled = false;
        break;

      case BACKSPACE:
        handleBackspace();
        break;

      default:
        handleKey(keycode);
      }
    }

    // If there was a potential auto correction, we either used it in
    // handleCorrections() above or it is now out of date, so clear it
    // so it doesn't get used later
    autoCorrection = null;

    // And update the keyboard capitalization state, if necessary
    updateCapitalization();

    // If we're offering suggestions, ask the worker to make them now
    updateSuggestions(repeat);

    // Exit symbol layout mode after space or return key is pressed.
    if (keycode === SPACE || keycode === RETURN) {
      keyboard.setLayoutPage(LAYOUT_PAGE_DEFAULT);
    }

    lastSpaceTimestamp = (keycode === SPACE) ? Date.now() : 0;
  }

  // Handle any key (including backspace) and do the right thing even if
  // there is a selection in the text field. This method does not perform
  // auto-correction or auto-punctuation.
  function handleKey(keycode) {
    // First, update our internal state
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

    // Generate the key event
    keyboard.sendKey(keycode);
  }

  // If we just did auto correction or auto punctuation, then backspace
  // should undo it. Otherwise it is just an ordinary backspace.
  function handleBackspace() {
    // If we made a correction and haven't changed it at all yet,
    // then revert it.
    var len = revertFrom ? revertFrom.length : 0;
    if (len && cursor >= len &&
        inputText.substring(cursor - len, cursor) === revertFrom) {

      // Revert the content of the text field
      for (var i = 0; i < len; i++)
        keyboard.sendKey(BACKSPACE);
      keyboard.sendString(revertTo);

      // Revert our internal state
      inputText =
        inputText.substring(0, cursor - len) +
        revertTo +
        inputText.substring(cursor);
      cursor -= len - revertTo.length;

      // If the change we just reverted was an auto-correction then
      // temporarily disable auto correction until the next space
      if (justAutoCorrected) {
        correctionDisabled = true;
      }

      revertFrom = revertTo = '';
      justAutoCorrected = false;
    }
    else {
      handleKey(BACKSPACE);
    }
  }

  // This function is called when the user types space, return or a punctuation
  // character. It performs auto correction or auto punctuation or just
  // inserts the character.
  function handleCorrections(keycode) {
    if (correcting && autoCorrection && !correctionDisabled && atWordEnd()) {
      autoCorrect(keycode);
    }
    else if (punctuating && cursor >= 2 &&
             isWhiteSpace(inputText[cursor - 1]) &&
             !isWhiteSpace(inputText[cursor - 2]))
    {
      autoPunctuate(keycode);
    }
    else {
      handleKey(keycode);
    }
  }

  // Perform an autocorrection. Assumes that all pre-conditions for
  // auto-correction have been met.
  function autoCorrect(keycode) {
    // Get the word before the cursor
    var currentWord = wordBeforeCursor();
    var currentWordLength = currentWord.length;

    // Figure out the auto correction text
    var newWord = autoCorrection;                // Atart with suggested word
    newWord += String.fromCharCode(keycode);     // and add the user's input.
    if (keycode !== SPACE && keycode !== RETURN) // If not whitespace
      newWord += ' ';                            // add a space.

    // Backspace over the current word in the text field
    for (var i = 0; i < currentWordLength; i++)
      keyboard.sendKey(BACKSPACE);

    // And send the correction to the textfield
    keyboard.sendString(newWord);

    // Now update our internal state to match.
    inputText =
      inputText.substring(0, cursor - currentWordLength) +
      newWord +
      inputText.substring(cursor);

    // Update the cursor position, too.
    cursor = cursor - currentWordLength + newWord.length;

    // Remember the change we just made so we can revert it if the
    // user types backspace
    revertTo = currentWord;
    revertFrom = newWord;
    justAutoCorrected = true;
  }

  // Auto punctuate, converting space punctuation to punctuation space
  // or converting space space to period space if the two spaces were
  // close enough together. Assumes that pre-conditions for auto punctuation
  // have been met.
  function autoPunctuate(keycode) {
    switch (keycode) {
    case SPACE:
      if (Date.now() - lastSpaceTimestamp < DOUBLE_SPACE_TIME)
        fixPunctuation(PERIOD);
      else
        handleKey(keycode);
      break;

    case PERIOD:
    case QUESTION:
    case EXCLAMATION:
    case COMMA:
      fixPunctuation(keycode);
      break;

    default:
      // colon and semicolon don't auto-punctuate because they're
      // used after spaces for smileys.
      handleKey(keycode);
      break;
    }

    // In both the space space and the space period case we call this function
    function fixPunctuation(keycode) {
      keyboard.sendKey(BACKSPACE);
      keyboard.sendKey(keycode);
      keyboard.sendKey(SPACE);

      var newtext = String.fromCharCode(keycode) + ' ';

      inputText = inputText.substring(0, cursor - 1) +
        newtext +
        inputText.substring(cursor);
      cursor++;

      // Remember this change so we can revert it on backspace
      revertTo = ' ';
      revertFrom = newtext;
      justAutoCorrected = false;
    }
  }


  // When the worker thread sends us a batch of suggestions, deal
  // with them here.
  function handleSuggestions(input, suggestions) {
    if (suggestions.length === 0) {         // If no suggestions
      keyboard.sendCandidates(suggestions); // Clear any displayed suggestions
      return;                               // We're done
    }

    // Check that the word before the cursor has not changed since
    // we requested these suggestions. If the user has typed faster
    // than we could offer suggestions, ignore these.
    if (wordBeforeCursor() !== input) {
      keyboard.sendCandidates([]); // Clear any displayed suggestions
      return;
    }

    // Figure out if the first suggestion is good enough to offer as
    // an autocorrection. We define "good enough" as significantly better
    // than the second best suggestion. And significance is defined by
    // a tuneable constant.
    var significant =
      suggestions.length === 1 ||
      suggestions[0][1] / suggestions[1][1] > AUTO_CORRECT_THRESHOLD;

    // Loop through the suggestions discarding the weights, and checking
    // to see if the user's current input is one of the words. We don't
    // want to autocorrect a valid word. Also, if the input begins with
    // a capital letter, capitalize the suggestions
    var lcinput = input.toLowerCase();
    var inputStartsWithCapital = isUpperCase(input[0]);
    var inputIsWord = false;
    for (var i = 0; i < suggestions.length; i++) {
      suggestions[i] = suggestions[i][0];
      if (lcinput === suggestions[i].toLowerCase())
        inputIsWord = true;
      if (inputStartsWithCapital)
        suggestions[i] =
          suggestions[i][0].toUpperCase() + suggestions[i].substring(1);
    }

    // If we're going to use the first suggestion as an auto-correction
    // then we have to tell the renderer to highlight it and we have to
    // ensure that the raw input is also listed as a suggestion. If the
    // input is the same as the first suggestion, don't auto-correct it.
    if (correcting && !correctionDisabled && significant && !inputIsWord) {
      // Remember the word to use if the next character is a space.
      autoCorrection = suggestions[0];
      // Make sure the user also has their actual input as a choice
      // XXX: should this be highlighted in some special way?
      // XXX: or should we just have a x icon to dismiss the autocorrection?
      suggestions.push(input);
      // Mark the auto-correction so the renderer can highlight it
      suggestions[0] = '*' + suggestions[0];
    }

    keyboard.sendCandidates(suggestions);
  }

  // If the user selects one of the suggestions offered by this input method
  // the keyboard calls this method to tell us it has been selected.
  // We have to backspace over the current word, insert this new word, and
  // update our internal state to match.
  function select(word) {
    var oldWord = wordBeforeCursor();

    // Send backspaces
    for (var i = 0, n = oldWord.length; i < n; i++)
      keyboard.sendKey(BACKSPACE);

    // Send the word
    keyboard.sendString(word);

    // Send a space
    keyboard.sendKey(SPACE);

    // Update internal state
    inputText =
      inputText.substring(0, cursor - oldWord.length) +
      word +
      ' ' +
      inputText.substring(cursor);

    cursor += word.length - oldWord.length + 1;

    // Remember the change we just made so we can revert it if the
    // next key is a backspace. Note that it is not an autocorrection
    // so we don't need to disable corrections.
    revertFrom = word + ' ';
    revertTo = oldWord;
    justAutoCorrected = false;

    // Clear the suggestions
    keyboard.sendCandidates([]);

    // And update the keyboard capitalization state, if necessary
    updateCapitalization();
  }

  function setLayoutParams(params) {
    layoutParams = params;
    if (worker)
      worker.postMessage({ cmd: 'setLayout', args: [params]});
  }

  function updateSuggestions(repeat) {
    // If the user hasn't enabled suggestions, or if they're not appropriate
    // for this input type, or are turned off by the input mode, do nothing
    if (!suggesting && ! correcting)
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

    // If we're not at the end of a word, we want to clear any suggestions
    // that might already be there
    if (!atWordEnd()) {
      if (suggesting)
        keyboard.sendCandidates([]);
      return;
    }

    worker.postMessage({cmd: 'predict', args: [wordBeforeCursor()]});
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
    else if (atSentenceStart()) {
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
  // must be whitespace.  If there is a selection we never return true.
  function atWordEnd() {
    // If there is a selection we never want suggestions
    if (selection)
      return false;

    // If we're not at the end of the line and the character after the
    // cursor is not whitespace, don't offer a suggestion
    if (cursor < inputText.length && !WS.test(inputText[cursor]))
      return false;

    // We're at the end of a word if the cursor is not at the start and
    // the character before the cursor is not whitespace
    return cursor > 0 && !WS.test(inputText[cursor - 1]);
  }

  // Get the word before the cursor
  function wordBeforeCursor() {
    // Otherwise, find the word we're at the end of and ask for completions
    for (var firstletter = cursor - 1; firstletter >= 0; firstletter--) {
      if (WS.test(inputText[firstletter])) {
        break;
      }
    }
    firstletter++;

    // firstletter is now the position of the start of the word and cursor is
    // the end of the word
    return inputText.substring(firstletter, cursor);
  }

  function atSentenceStart() {
    var i = cursor - 1;

    if (i === -1)    // This is the empty string case
      return true;

    // Verify that the position before the cursor is whitespace
    if (!isWhiteSpace(inputText[i--]))
      return false;
    // Now skip any additional whitespace before that
    while (i >= 0 && isWhiteSpace(inputText[i]))
      i--;

    if (i < 0)     // whitespace all the way back to the end of the string
      return true;

    var c = inputText[i];
    return c === '.' || c === '?' || c === '!';
  }
}());
