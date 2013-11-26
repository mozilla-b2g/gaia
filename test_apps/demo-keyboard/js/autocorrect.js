(function(exports) {
  'use strict';

  var predictionStartTime;
  var correction = null;  // A pending correction
  var reversion = null;   // A pending reversion
  var autocorrectDisabled = false;

  // worker for predicting the next char and getting word suggestions
  var worker = new Worker('js/worker.js');
  // XXX: english hardcoded for now
  worker.postMessage({ cmd: 'setLanguage', args: ['en_us']});
  // XXX: get real key data
  // XXX: should I have the keyboard generate an event when the
  // current pageview changes?
  worker.postMessage({ cmd: 'setNearbyKeys', args: [{}]});

  worker.onmessage = function(e) {
    switch (e.data.cmd) {
    case 'log':
      console.log(e.data.message);
      break;
    case 'error':
      console.error(e.data.message);
      break;
    case 'chars':
      // Make sure the prediction is still valid
      if (e.data.input === InputField.wordBeforeCursor()) {
        //console.log("char predictions in",
        //            performance.now() - predictionStartTime);
        KeyboardTouchHandler.setExpectedChars(e.data.chars);
      }
      break;
    case 'predictions':
      // console.log("word suggestions in",
      //             performance.now() - predictionStartTime);
      // The worker is suggesting words: ask the keyboard to display them
      handleSuggestions(e.data.input, e.data.suggestions);
      break;
    }
  };

  InputField.addEventListener('inputstatechanged', requestPredictions);
  InputField.addEventListener('inputfieldchanged', requestPredictions);

  function requestPredictions() {
    // Undo the result of any previous predictions
    KeyboardTouchHandler.setExpectedChars([]);
    Suggestions.display([]);

    // If we're at the end of a word, ask the worker to predict
    // what charcters are most likely next and what words we should suggest
    if (InputField.atWordEnd()) {
      var word = InputField.wordBeforeCursor();
      predictionStartTime = performance.now();
      // XXX: combine these two into a single call
      worker.postMessage({ cmd: 'predictNextChar', args: [word] });
      worker.postMessage({ cmd: 'predict', args: [word]});
    }
  }

  Suggestions.addEventListener('suggestionselected', function(e) {
    var suggestion = e.detail;
    var current = InputField.wordBeforeCursor();
    InputField.replaceSurroundingText(suggestion, current.length, 0);
    reversion = {
      from: suggestion,
      to: current
    };
    correction = null;
    autocorrectDisabled = false;
  });

  const SPACE = 32;
  const BACKSPACE = 8;
  const RETURN = 13; // return keycode code isn't the same as newline charcode
  const PERIOD = 46;
  const QUESTION = 63;
  const EXCLAMATION = 33;
  const COMMA = 44;
  const COLON = 58;
  const SEMICOLON = 59;

  KeyboardTouchHandler.addEventListener('key', function(e) {
    // autocorrect on space, or re-enable corrections.
    // revert on backspace and temporarily block corrections
    var keyname = e.detail;
    // XXX: pass the page view with the event
    var keyobj = currentPage.keys[keyname];

    switch (keyobj.keycode) {
    case SPACE:
    case RETURN:
    case PERIOD:
    case QUESTION:
    case EXCLAMATION:
    case COMMA:
    case COLON:
    case SEMICOLON:
      // These characters trigger autocorrection or re-enable autocorrection
      // if it was disabled
      if (autocorrectDisabled) {
        autocorrectDisabled = false;
      }
      else if (correction &&
               correction.from === InputField.wordBeforeCursor()) {
        var charcode = keyobj.keycode;
        if (charcode === RETURN)
          charcode = 10;  // Use newline, not carriage return
        var s = correction.to + String.fromCharCode(charcode);
        InputField.replaceSurroundingText(s, correction.from.length, 0);

        reversion = { from: s, to: correction.from };
        correction = null;
        e.stopImmediatePropagation();
      }
      else {
        reversion = null;
      }
      break;

    case BACKSPACE:
      if (reversion) {
        if (InputField.textBeforeCursor.endsWith(reversion.from)) {
          InputField.replaceSurroundingText(reversion.to,
                                            reversion.from.length, 0);
          autocorrectDisabled = true;
          e.stopImmediatePropagation();
        }
        reversion = null;
      }
      break;

    default:
      reversion = null;
      break;
    }
  });

  // When the worker sends us back word suggestions, we handle them here.
  // The argument is an array of arrays [[word1, weight1], [word2, weight2]...]
  function handleSuggestions(input, suggestions) {
    if (input !== InputField.wordBeforeCursor()) {
      // If these suggestions no longer match what is in the input field
      // ignore them
      return;
    }

    // See if the user's input is a valid word on the list of suggestions
    var inputIsSuggestion = false;
    var inputWeight = 0;
    var inputIndex;
    for (inputIndex = 0; inputIndex < suggestions.length; inputIndex++) {
      if (suggestions[inputIndex][0] === input) {
        inputIsSuggestion = true;
        inputWeight = suggestions[inputIndex][1];
        break;
      }
    }

    // We never want to display the user's input as a suggestion so
    // remove it from the list if it is there.
    if (inputIsSuggestion) {
      suggestions.splice(inputIndex, 1);
    }

    // If we don't have any suggestions we're done
    if (suggestions.length === 0)
      return;

    // Make sure we have no more than three words
    if (suggestions.length > 3)
      suggestions.length = 3;

    // Now get an array of just the suggested words
    var words = suggestions.map(function(x) { return x[0]; });

    // Decide whether the first word is going to be an autocorrection.
    // If the user's input is already a valid word, then don't
    // autocorrect Unless the first suggested word is more common than
    // the input.  Note that if the first suggested word has a higher
    // weight even after whatever penalty is applied for not matching
    // exactly, then it is significantly more common than the actual input.
    // (This rule means that "ill" will autocorrect to "I'll",
    // "wont" to "won't", etc.)
    if (!autocorrectDisabled &&
        (!inputIsSuggestion || suggestions[0][1] > inputWeight)) {
      correction = { from: input, to: words[0] };
      words[0] = '*' + words[0]; // Special code for the Suggestions module
    }
    else {
      correction = null;
    }

    Suggestions.display(words);
  }


  /*
    I thought about setting this up as a state machine. The states would
    be something like this. Maybe that is overkill.

    State machine:

    State 0: initial state: no suggestions displayed
       oninputstatechange:
       oninputfieldchange:
         if we're at the end of a word ask for suggestions

       onmessage:
         when we get suggestions, display them, decide whether
         we are autocorrecting and switch to state 1

    State 1: suggestions displayed (possibly with autocorrect ready)

       ontouchend:
         if a suggestion was touched, insert it, clear, and go to state 2
         if the cancel button was touched, clear suggestions and go to state 3

       onkey:
         if we are autocorrecting and space or punctuation is pressed
           insert the autocorrection, clear and go to state 2
         otherwise switch back to state 0

       oninputstatechanged:
         this happens synchronously after we insert a suggestion or make
         an autocorrection. Ignore it if we just did that. Otherwise
         switch to state 0 and process.

       oninputfieldchanged:
         this probably means the user tapped somewhere in the field
         switch to state 0 and handle the event in that state

    State 2: just autocorrected (possible to revert)

       onkey:
         If the key is backspace, revert the change and go to state 3.
         Otherwise, go to state 0.

       oninputstatechanged:
         Ignore it if it follows the revert. Otherwise process in state 0

       oninputfieldchanged:
         switch to state 0 and handle the event in that state

    State 3: disabled (because just reverted, or cancelled)
       onkey:
         if the key is space (or return) or punctuation, switch to state 0
         otherwise: do nothing

       oninputfieldchanged:
         switch to state 0 and handle the event in that state



   */


}(window));
