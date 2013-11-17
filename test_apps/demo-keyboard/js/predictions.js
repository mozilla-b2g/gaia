/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
//
// This is a JavaScript predictive text engine: given a dictionary, a data
// structure that specifies which keys are near which other keys, and
// a string of user input, it guesses what the user meant to type or, (if
// if cannot find a word loosely matching the input) what the user is planning
// to type.
//
// This module defines a single global variable Predictions which is an
// object with the following methods:
//
//   setDictionary: specifies the dictionary to use
//
//   setNearbyKeys: specifies which keys are near which other keys
//
//   predict: given an input string, asynchronously find corrections or
//      predictions and pass them to a specified callback.
//
// The word prediction / auto-correction algorithm works by finding loose
// matches for the user's input. The hard part of this process is getting
// the "loose" part right. For each character in the user's input, we'll
// match variant forms of the character to handle case differences and
// diacritics. In languages that use apostrophes and hyphens, we'll match
// those at any point, even if the user omits them. Because we've been
// passed a data structure that tells us which keys are near each other (and
// how near they are) we use that information to correct typing errors.
// Other loose matching techniques we try include transpositions, insertions
// and deletions.
//
// During this loose matching process, we associate a weight with each
// candidate we're considering. This weight is based on the word frequency
// information from the dictionary file, but it is reduced when we make
// corrections to the user's input, to reflect our decreased confidence in
// the suggestion. Substituting variant forms and inserting apostrophes does
// not reduce the weight by much at all. Substituting a nearby key reduces
// the weight moderately (depending on how near the keys are), and
// insertions and deletions and transpositions reduce the weight
// significantly.
//
// The core part of the matching algorithm is in the process() function
// nested inside the predict() method. To fully understand it, however, you
// also need to understand the weighted Ternary Search Tree data structure
// used to represent the dictionary.
//
// Each node of the tree represents a single character, and is part of
// an ordinary binary tree. Nodes representing characters that are less
// than the current node are found by following the left pointer, and nodes
// that repesent characters that are greater than the character in the
// current node are found by following the right pointer.
//
// Our data structure is called a ternary tree because in addition to these
// left and right pointers, each node also has a center pointer that points
// to the subtree of nodes that represent the next character of the
// word. You can think of all the nodes found by recursively traversing
// left and right from the current node as being on the same level, and the
// node found by by traversing to the center pointer as being on the next
// level.
//
// Ternary trees are good for representing dictionaries and checking
// whether a string appears in the dictionary. In order to make
// predictions, however, our dictionary also contains word frequency
// information, and we use it to predict more frequently used words instead
// of less frequently used words. So instead of using a generic ternary
// search tree, we use a weighted ternary search tree. In addition to the
// left, center, and right pointers, each node also has a next pointer that
// points to the node that represents the next most likely letter at the
// current position. In effect, all of the nodes that are on the same level
// form a linked list sorted from most likely to least likely.
//
// To make this linked list work, the tree uses non-traditional
// balancing. Instead of balancing the binary tree so that there are
// approximately equal numbers of nodes on the left and the right, the tree
// is balanced so that when you follow the center pointer from one level to
// the next level, the node represents the most likely letter on that
// level. Each center pointer points to the head of a linked list.
//
// In addition to holding a character, each node of the tree also stores a
// frequency value. For each node, this number is the frequency of the most
// frequent word beneath that node. If you recursively follow the center
// pointer of a node, you'll find that most frequent word.
//
// It turns out that our matching algorithm does not actually use the left
// and right pointers of the tree at all, so they are omitted from the
// dictionary to dramatically reduce its file size. At any given "level" of
// the tree, we find the possible letters by following the next pointer. And
// at any given node, we move to the next level by following the center
// pointer.
//
// You can read more about the data structure in the script that generates the
// dictionary files:
//
//   gaia/dictionaries/xml2dict.py.
//
// Also see the following online resources which include helpful diagrams:
//
//   http://en.wikipedia.org/wiki/Ternary_search_tree
//   http://www.strchr.com/ternary_dags
//   http://www.strchr.com/dawg_predictive
//
// Note that this implementation does not convert the TST into a DAG to
// share common suffix nodes as described in the strchr.com blog
// posts. (That is an optimization that may be possible later: the shared
// suffix nodes can't hold correct word frequencies, so the search
// algorithm would have to be modified to carry the correct frequency
// through while processing a shared suffix.)
//
// TODO:
//
// Also have to figure out if something is going wrong with Polish.
// When I type an unaccented character, I'm not confident that I'm
// getting predictions that include accented versions of that character.
//
'use strict';

var Predictions = function() {
  const cacheSize = 255;    // how many suggestions to remember

  // Weights of various permutations we do when matching input
  const variantFormMultiplier = .99;          // slightly prefer exact match
  const punctuationInsertionMultiplier = .95; // apostrophes are almost free
  const nearbyKeyReplacementMultiplier = 1;   // adjusted by actual distance
  const transpositionMultiplier = .3;
  const insertionMultiplier = .3;
  const substitutionMultiplier = .2;          // for keys that are not nearby
  const deletionMultiplier = .1;
  // profane words don't have a frequency themselves, so we bump their
  // frequency to a value which will make it pop up (only do if matches input)
  // 15 is a value that still allows very obvious corrections to be made
  // see #803189 for more information.
  const profaneInputMatchWeight = 15;

  // If we can't find enough exact word matches for the user's input
  // we have to expand some of the candidates we found into complete
  // words. But we want words that are close in length to the user's
  // input. The most frequent word beginning with r in the en.us wordlist is
  // received, but we don't want that as a suggestion if the user just
  // type r. We want things like red and run. So for each extra character
  // we have to add, we multiply the weight by this amount.
  const wordExtensionMultiplier = 0.4;

  // How many candidates do we consider before pausing with a setTimeout()?
  // Smaller values make the prediction code more interruptible and
  // possibly result in a more responsive UX. Larger values may reduce the
  // total time required to get predictions
  const candidatesPerBatch = 10;

  var tree;                // A typed array of bytes holding the dictionary tree
  var maxWordLength;       // We can reject any input longer than this
  var characterTable = []; // Maps charcodes to frequency in dictionary
  var variants = [];       // Maps charcodes to variant forms
  var rootform = [];       // Maps charcodes to the root form
  var nearbyKeys;          // Maps charcodes to a set of codes of nearby keys
  var cache;               // Cache inputs to completions.

  // This function is called to pass our dictionary to us as an ArrayBuffer.
  function setDictionary(buffer) {
    cache = new LRUCache(cacheSize); // Start with a new cache
    var file = Uint8Array(buffer);

    function uint32(offset) {
      return (file[offset] << 24) +
        (file[offset + 1] << 16) +
        (file[offset + 2] << 8) +
        file[offset + 3];
    }

    function uint16(offset) {
      return (file[offset] << 8) +
        file[offset + 1];
    }

    if (uint32(0) !== 0x46784F53 ||   // "FxOS"
        uint32(4) !== 0x44494354)     // "DICT"
      throw new Error('Invalid dictionary file');

    if (uint32(8) !== 1)
      throw new Error('Unknown dictionary version');

    // Read the maximum word length.
    // We add 1 because word predictions can delete characters, so the
    // user could type one extra character and we might still predict it.
    maxWordLength = file[12] + 1;

    // Read the table of characters and their frequencies
    var numEntries = uint16(13);
    for (var i = 0; i < numEntries; i++) {
      var offset = 15 + i * 6;
      var ch = uint16(offset);
      var count = uint32(offset + 2);
      characterTable[ch] = count;
    }

    // The dictionary data begins right after the character table
    tree = new Uint8Array(buffer, 15 + numEntries * 6);

    // The rest of this function processes the character table to create a
    // list of variant forms that we'll accept for each character in the
    // dictionary. Variants cover case differences and unaccented forms of
    // accented letters. Characters with no variants are considered word
    // internal punctuation like apostophes and hyphens.

    // Map from lowercase ASCII to all known accented forms of the letter
    var rootToAccentedForm = {
      'a': 'ÁáĂăǍǎÂâÄäȦȧẠạȀȁÀàẢảȂȃĀāĄąÅåḀḁȺⱥÃãǼǽǢǣÆæ',
      'b': 'ḂḃḄḅƁɓḆḇɃƀƂƃ',
      'c': 'ĆćČčÇçĈĉĊċƇƈȻȼ',
      'd': 'ĎďḐḑḒḓḊḋḌḍƊɗḎḏĐđƋƌð',
      'e': 'ÉéĔĕĚěȨȩÊêḘḙËëĖėẸẹȄȅÈèẺẻȆȇĒēĘę',
      'f': 'ḞḟƑƒ',
      'g': 'ǴǵĞğǦǧĢģĜĝĠġƓɠḠḡǤǥ',
      'h': 'ḪḫȞȟḨḩĤĥⱧⱨḦḧḢḣḤḥĦħ',
      'i': 'ÍíĬĭǏǐÎîÏïỊịȈȉÌìỈỉȊȋĪīĮįƗɨĨĩḬḭı',
      'j': 'ĴĵɈɉ',
      'k': 'ḰḱǨǩĶķⱩⱪꝂꝃḲḳƘƙḴḵꝀꝁ',
      'l': 'ĹĺȽƚĽľĻļḼḽḶḷⱠⱡꝈꝉḺḻĿŀⱢɫŁł',
      'm': 'ḾḿṀṁṂṃⱮɱ',
      'n': 'ŃńŇňŅņṊṋṄṅṆṇǸǹƝɲṈṉȠƞÑñ',
      'o': 'ÓóŎŏǑǒÔôÖöȮȯỌọŐőȌȍÒòỎỏƠơȎȏꝊꝋꝌꝍŌōǪǫØøÕõŒœ',
      'p': 'ṔṕṖṗꝒꝓƤƥⱣᵽꝐꝑ',
      'q': 'Ꝗꝗ',
      'r': 'ŔŕŘřŖŗṘṙṚṛȐȑȒȓṞṟɌɍⱤɽ',
      's': 'ŚśŠšŞşŜŝȘșṠṡṢṣß$',
      't': 'ŤťŢţṰṱȚțȾⱦṪṫṬṭƬƭṮṯƮʈŦŧ',
      'u': 'ÚúŬŭǓǔÛûṶṷÜüṲṳỤụŰűȔȕÙùỦủƯưȖȗŪūŲųŮůŨũṴṵ',
      'v': 'ṾṿƲʋṼṽ',
      'w': 'ẂẃŴŵẄẅẆẇẈẉẀẁⱲⱳ',
      'x': 'ẌẍẊẋ',
      'y': 'ÝýŶŷŸÿẎẏỴỵỲỳƳƴỶỷỾỿȲȳɎɏỸỹ',
      'z': 'ŹźŽžẐẑⱫⱬŻżẒẓȤȥẔẕƵƶ'
    };

    // The reverse mapping from accented forms to the normalized ASCII form
    var accentedFormToRoot = {};
    for (var letter in rootToAccentedForm) {
      var s = rootToAccentedForm[letter];
      for (var i = 0, len = s.length; i < len; i++)
        accentedFormToRoot[s[i]] = letter;
    }

    // Now through all the characters that appear in the dictionary
    // and figure out their variant forms.
    for (var charcode in characterTable) {

      // Start off by with an empty set of variants for each character.
      variants[charcode] = '';

      // Handle upper and lowercase forms
      var ch = String.fromCharCode(charcode);
      var upper = ch.toUpperCase();
      var lower = ch.toLowerCase();
      if (upper !== ch) {
        variants[charcode] += upper;
        // It is not upper case it is probably the root form.
        // If it is an accented character, we'll override this below
        rootform[charcode] = charcode;
      }

      if (lower !== ch) {
        variants[charcode] += lower;
        rootform[charcode] = lower.charCodeAt(0);
      }

      // Handle accented forms
      if (accentedFormToRoot[ch]) {
        var root = accentedFormToRoot[ch];
        rootform[charcode] = root.charCodeAt(0);

        // The root form and its uppercase version are variants we'll
        // accept in user input instead of this accented character.
        variants[charcode] += root + root.toUpperCase();
      }

      // log("Variants for " + ch + " " + variants[charcode]);
      // log("Root form of " + ch + " " +
      //     String.fromCharCode(rootform[charcode]))
    }
  }

  // latin.js passes us a data structure that holds the inverse square
  // distance between keys that are near each other on the keyboard.
  // This method just stores it for use later. We use these values as
  // weights for nearby character replacement. With typical FirefoxOS
  // keyboard layouts, adjacent keys on the same row have a value of
  // about .5, keys directly above or below each other have a value of
  // about .25 and keys diagonally adjacent to each other have a value of
  // about .16.
  function setNearbyKeys(data) {
    cache = new LRUCache(cacheSize); // Discard any cached results
    nearbyKeys = data;
    // log("Nearby Keys: " + JSON.stringify(data));
  }

  //
  // This function asynchronously computes word completions for the specified
  // input string. When called, it immediately returns an object used for
  // communicating with the caller and defers its computations with
  // setTimeout.
  //
  // The returned object has an abort() method that, when called, will
  // cause the predictions to be cancelled the next time it calls setTimeout()
  // to pause.
  //
  // This method communicates with the caller by invoking the specified
  // callback and onerror functions. If an exception occurs while predicting
  // the onerror function is called with an error message.
  //
  // If no error occurs, then the callback function is called with an array
  // argument. Each element of this array is also an array holding a word
  // and a number. The word is a proposed completion or correction to the
  // input word and the number is the weight that the prediction algorithm
  // assigns to that suggestions. Higher numbers mean better
  // suggestions. Suggestions may take tens of milliseconds to compute which
  // is why this method is designed to be asynchronous. Periodcally during
  // the search process, the code returns to the event loop with
  // setTimeout(0) which gives other code time to run and potentially call
  // the abort method
  //
  // Before calling this function you must call setDictionary() and
  // setNearbyKeys() to provide the data it needs to make predictions.
  //
  function predict(input,           // the user's input
                   maxSuggestions,  // how many suggestions are requested
                   maxCandidates,   // how many candidates to consider
                   maxCorrections,  // how many corrections to allow per word
                   callback,        // call this on success
                   onerror)         // and call this on error
  {
    if (!tree || !nearbyKeys)
      throw Error('not initialized');

    // The search algorithm compares the user's input to the dictionary tree
    // data structure and generates a set of candidates for each character.
    // This variable will store the set of candidates we're evaluating as we
    // do a breadth first search of the dictionary tree and allows us to
    // pull out the best candidates first for further evaluation.
    var candidates = new BoundedPriorityQueue(maxCandidates);

    // This is where we store the best complete words we've found so far.
    var words = new BoundedPriorityQueue(maxSuggestions);

    // If the first letter of the input is a capital letter, then we
    // want to capitalize the first letter of all the suggested words.
    // We do this here rather than in latin.js so that we can filter out
    // repeated words that come in both upper and lowercase forms
    var capitalize = (input[0] === input[0].toUpperCase());

    // This is the object we return. It allows the caller to abort a
    // prediction in progress.
    var status = {
      state: 'predicting',
      abort: function() {
        if (this.state !== 'done' && this.state !== 'aborted')
          this.state = 'aborting';
      }
    };

    var cacheKey = input +
      ',' + maxSuggestions +
      ',' + maxCandidates +
      ',' + maxCorrections;

    // Start searching for words soon...
    setTimeout(getWords);

    // But first, return the status object to the caller.
    return status;

    // We use this to check whether the user aborted the search and to
    // set the state property appropriately.
    function aborted() {
      if (status.state === 'aborting') {
        status.state = 'aborted';
        return true;
      }
      return false;
    }

    function getWords() {
      try {
        // Check the cache. If we've seen this input recently we can return
        // suggestions right away.
        var cached_suggestions = cache.get(cacheKey);
        if (cached_suggestions) {
          status.state = 'done';
          status.suggestions = cached_suggestions;
          callback(status.suggestions);
          return;
        }

        // Check length and check for invalid characters. If the input is
        // bad, we can reject it right away.
        if (input.length > maxWordLength || !validChars(input)) {
          status.state = 'done';
          status.suggestions = [];
          callback(status.suggestions);
          return;
        }

        // Start off with a single root candidate. The first argument is the
        // address of the root node of the tree
        addCandidate(0, input, '', 1, 1, 0);

        // And then process it. This will generate more candidates to
        // process. processCandidates() runs until all the words we want
        // have been found or until all possiblities have been tried. It
        // returns to the event loop with setTimeout() so the search can be
        // aborted, but arranges to resume. It calls the callback when done.
        processCandidates();
      }
      catch (e) {
        status.state = 'error';
        status.error = e;
        onerror(e.toString() + '\n' + e.stack);
      }
    }

    // Check whether all the characters of s appear in the dictionary or are
    // at least near characters that do. If we are passed a string that does
    // not pass this test then there is no way we will be able to offer
    // suggestions and it is not even worth searching.
    function validChars(s) {
      outer: for (var i = 0, n = s.length; i < n; i++) {
        var c = s.charCodeAt(i);
        if (characterTable.hasOwnProperty(c))  // character is valid
          continue;
        // If the character does not occur in this language, but there is
        // a nearby key that does occur, then maybe it is okay
        if (!nearbyKeys.hasOwnProperty(c))
          return false;  // no nearby keys, so no suggestions possible
        var nearby = nearbyKeys[c];
        for (c in nearby) {
          if (characterTable.hasOwnProperty(c))
            continue outer;
        }
        // no nearby keys are in the dictionary, so no suggestions possible
        return false;
      }

      // All the characters of s are valid
      return true;
    }

    // Add a candidate to the list of promising candidates if frequency *
    // multiplier is high enough. A candidate is a pointer (byte offset) to
    // a node in the tree, the portion of the user's input that has not yet
    // been considered, the output string that has been generated so far, a
    // number based on the highest frequency word that begins with the
    // output we've generated, a multipler that adjusts that frequency based
    // on how much we've modified the user's input, and a number that
    // indicates how many times we've already corrected the user's input for
    // this candidate.
    function addCandidate(pointer, remaining, output,
                          multiplier, frequency, corrections)
    {
      var weight = frequency * multiplier;

      // If no major corrections have been made to this candidate, then
      // artificially increase its weight so that it appears in the
      // candidates list before any corrected candidates. This should
      // ensure that if the user is typing an infrequent word we don't
      // bump the actual word off the list if there are lots of frequent
      // words that have similar spellings. The artificial weight does
      // not carry through to the list of words, so more frequent words may
      // still be predicted instead of the user's input when the user is
      // typing an infrequent word. But we shouldn't ever not be able to
      // find the user's input as a valid word.  Adding letters to the
      // end of partial input does not count as a correction so we also
      // test the multiplier so that we don't boost the weight of every
      // extension. But we do allow one letter to be added on and still
      // get the extra weight.
      if (corrections === 0 &&
          multiplier > wordExtensionMultiplier * wordExtensionMultiplier) {
        weight += 100;
      }

      // If this candidate could never become a word, don't add it
      if (weight <= words.threshold)
        return;

      candidates.add({
        pointer: pointer,
        input: remaining,
        output: output,
        multiplier: multiplier,
        weight: weight,
        corrections: corrections
      }, weight);
    }

    // Add a word to the priority queue of words
    function addWord(word, weight) {
      // If the input was capitalized, capitalize the word
      if (capitalize)
        word = word[0].toUpperCase() + word.substring(1);

      // Make sure we don't already have the word in the queue
      for (var i = 0, n = words.items.length; i < n; i++) {
        if (words.items[i][0] === word) {
          // If the version we already have has higher weight, skip this one
          if (words.priorities[i] >= weight)
            return;
          else // otherwise, remove the existing lower-weight copy
            words.removeItemAt(i);
          break;
        }
      }

      words.add([word, weight], weight);
    }

    // Take the highest-ranked candidate from the list of candidates and
    // process it. (This will often add more candidates to the list). After
    // we've processed a batch of candidates this way, use setTimeout() to
    // schedule the processing of the next batch after returning to the
    // event loop. If there are no more candidates or if the highest ranked
    // one is not highly ranked enough, then we're done finding words.
    function processCandidates() {
      try {
        if (aborted())
          return;

        for (var count = 0; count < candidatesPerBatch; count++) {
          var candidate = candidates.remove();

          // If there are no more candidates, or if the weight isn't
          // high enough, we're done. Call the callback with the current
          // set of words.
          if (!candidate || candidate.weight <= words.threshold) {
            status.state = 'done';
            status.suggestions = words.items; // the array in the word queue
            cache.add(cacheKey, status.suggestions);
            callback(status.suggestions);
            return;
          }

          process(candidate);

          //
          // If the predicted words don't seem right, uncomment these lines
          // to see how the call to process() modifies the set of candiates
          // at each step. The output is verbose, but with careful study it
          // reveals what is going on in the algorithm.
          //
          // var s = "";
          // for(var i = 0; i < candidates.items.length; i++) {
          //   s += candidates.priorities[i].toPrecision(2) + " "
          //     + candidates.items[i].output + " " +
          //     + candidates.items[i].multiplier.toPrecision(2) + ", ";
          // }
          // log(input + " Candidate " + candidate.output +
          //     " for " + candidate.input[0] + ": " + s);
        }

        // After processing one batch of candidates, use setTimeout to
        // schedule another invocation of this function. This returns to
        // the event loop so we can process messages from the main thread
        // and allows us to abort the search if more input arrives.
        setTimeout(processCandidates);
      }
      catch (e) {
        status.state = 'error';
        status.error = e;
        onerror(e.toString() + '\n' + e.stack);
      }
    }

    //
    // This function is the heart of the dictionary search algorithm. The
    // key to understanding it is that we do not traverse the dictionary
    // tree as we would when looking for an exact match. Instead, at each
    // level, we visit the nodes in frequency order, following the next
    // pointer. If we find nodes that loosely match the first character of
    // input, we use those nodes to generate new candidates for further
    // evaluation later. Note that by maintaining a list of candidates like
    // this, we're doing a breadth-first search rather than a depth-first
    // search. (But since we weight the candidates, it is not a pure
    // breadth-first search).
    //
    // The input candidate specifies a node in the dictionary tree, the next
    // character of the user's input, and the output generated so far. This
    // function uses the dictionary to loop through all possible characters
    // that could appear after the current output, and considers those
    // characters in most frequent to least frequent order. It compares each
    // character to the next character of the user's input and generates new
    // candidates based on that comparison.
    //
    // The candidate generation considers things such as accented characters
    // from the dictionary, nearby keys from the keyboard layout and the
    // possibility of user input errors such as transpositions and
    // omissions.
    //
    function process(candidate) {
      var remaining = candidate.input;
      var output = candidate.output;
      var multiplier = candidate.multiplier;
      var corrections = candidate.corrections;
      var node = {};

      // The next character of the user's input
      var char, code;
      if (remaining.length > 0) {
        char = remaining[0];
        code = remaining.charCodeAt(0);
      }

      for (var next = candidate.pointer; next !== -1; next = node.next) {
        readNode(next, node);

        // How common is the most common word under this node?
        var frequency = node.freq;
        var weight = frequency * multiplier;

        // If this node does not have a high enough weight to make it into
        // the list of candidates, we don't need to continue. None of the
        // nodes that follow in the next pointer linked list will have a
        // higher weight than this one.
        // Note however, that we only use this shortcut if we've already
        // made at least one correction because uncorrected matches are given
        // high weight by addCandidate.
        if (corrections > 0 && weight <= candidates.threshold)
          break;

        // If we generate new candidates from this node, this is what
        // their output string will be
        var newoutput = output + String.fromCharCode(node.ch);

        // The various ways we can generate new candidates from this node
        // follow. Note that each one can have a different associated
        // multiplier. And note that some are considered "corrections". To
        // prevent explosive growth in the number of candidates we limit the
        // number of corrections allowed on any candidate.

        // If there isn't any more input from the user, then we'll try to
        // extend the output we've already got to find a complete word. But
        // we apply a penalty for each character we add so that shorter
        // completions are favored over longer completions
        if (remaining.length === 0) {
          // If a word ends here, add it to the queue of words
          if (node.ch === 0) {
            // Only suggest profane (freq == 1) words if the input is
            // already the same
            if (node.freq === 1 &&
                input.toUpperCase() === output.toUpperCase()) {
              // Profane words have very low frequency themselves.
              // To make sure they pop up we bump the frequency
              addWord(output, profaneInputMatchWeight);
            }
            else if (node.freq !== 1) {
              addWord(output, weight);
            }
            continue;
          }

          // Otherwise, extend the candidate with the current node. We
          // reduce the multiplier but do not count this as a correction so
          // that we can extend candidates as far as needed to find words.
          addCandidate(node.center,
                       remaining,  // the empty string
                       newoutput,
                       multiplier * wordExtensionMultiplier,
                       frequency, corrections);

          // If there isn't any more input then we don't want to consider
          // any of the other possible corrections below.
          continue;
        }

        // Handle the case where this node marks the end of a word.
        if (node.ch === 0) {
          // If there is just one more character of user input remaining,
          // maybe the user accidentally typed an extra character at the
          // end, so try just dropping the last character. Note that this
          // case is unique in that instead of following the center pointer
          // it revisits the same node just without the one remaining
          // character of input.
          if (remaining.length === 1) {
            addCandidate(next,    // stay at this same node
                         '',      // no more remaining characters
                         output,  // not newoutput
                         multiplier * deletionMultiplier,
                         frequency, corrections + 1);
          }
          continue;
        }

        // If we get to here, we know that we're still processing the user's
        // input and that there is a character associated with this node.

        // These next few cases are all in an if/else chain. Each of them
        // match (or substitute) the character in the node with the next
        // character of the user's input: they all add the same candidate,
        // so it never makes sense for more than one of them to run. But
        // note that it is possible for the match to happen more than one
        // way, so we have to be sure to do the tests in highest to lowest
        // multiplier order.

        if (node.ch === code) {
          // We found an exact match
          addCandidate(node.center,
                       remaining.substring(1),
                       newoutput,
                       multiplier,
                       frequency, corrections);
        }
        else if (variants[node.ch].indexOf(char) !== -1) {
          // The user's input is a variant form of the character in this
          // node, so we'll accept that input as a substitute for the node
          // character. This covers case differences and unaccented forms of
          // accented characters. (We don't accept accented forms typed by
          // the user as variants of unaccented characters in the
          // dictionary, however.)
          addCandidate(node.center,
                       remaining.substring(1),
                       newoutput,
                       multiplier * variantFormMultiplier,
                       frequency, corrections);
        }
        else if (corrections < maxCorrections) {
          // If we haven't made any corrections on this candidate yet, try
          // substituting the character from this node for the current
          // character in the user's input. If the two keys are near each
          // other on the keyboard, then we do this with higher weight than
          // if they are distant.
          var root = rootform[node.ch];
          var rootcode = rootform[code];
          var nearby = nearbyKeys[root] ? nearbyKeys[root][rootcode] : 0;
          if (nearby) {
            var adjust =
              Math.max(nearby * nearbyKeyReplacementMultiplier,
                       substitutionMultiplier);
            // If the node holds a character that is near the one the user
            // typed, try it, assuming that the user has fat fingers and
            // just missed the key. Note that we use a weight based on the
            // distance between the keys. (Keys on the same row are
            // generally closer together than keys above or below each
            // other)
            addCandidate(node.center,
                         remaining.substring(1),
                         newoutput,
                         multiplier * adjust,
                         frequency, corrections + 1);
          }
          else if (output.length > 0) {
            // If it wasn't a nearby key, try substituting it anyway, but
            // with a much lower weight. This handles the case where the
            // user just doesn't know how to spell the word. We assume that
            // the user knows the correct first letter of the word.
            addCandidate(node.center,
                         remaining.substring(1),
                         newoutput,
                         multiplier * substitutionMultiplier,
                         frequency, corrections + 1);
          }
        }

        // Now we try some other tests that generate different candidates
        // than the above. These involve insertion, deletion or
        // transposition. Note that to avoid exponential blow-up of the
        // search space, we generally only allow maxCorrections (usually 1)
        // correction per candidate.

        // First, just try inserting this character. Maybe the user forgot
        // to type it or omitted punctuation on purpose. If this character
        // has no variants, then it is a punctuation character and we allow
        // it to be inserted with a high multiplier and no correction
        // penalty. If it is not word punctuation, then the insertion is
        // more costly. Also: assume that the user got the first character
        // correct and don't insert at position 0.
        if (!variants[node.ch]) {  // If it is a punctuation character
          addCandidate(node.center,
                       remaining, // insertion, so no substring here
                       newoutput,
                       multiplier * punctuationInsertionMultiplier,
                       frequency, corrections);
        }
        else if (corrections < maxCorrections && output.length > 0) {
          addCandidate(node.center,
                       remaining,
                       newoutput,
                       multiplier * insertionMultiplier,
                       frequency, corrections + 1);
        }

        // If there is more input after this character, and if this node of
        // the tree matches the next character of the input, try deleting
        // the current character and try transposing the two. But assume
        // that the user got their first character correct and don't mess
        // with that.
        if (corrections < maxCorrections &&
            remaining.length > 1 && output.length > 0 &&
            (node.ch === remaining.charCodeAt(1) ||
             variants[node.ch].indexOf(remaining[1]) !== -1))
        {
          // transpose
          addCandidate(node.center,
                       remaining[0] + remaining.substring(2),
                       newoutput,
                       multiplier * transpositionMultiplier,
                       frequency, corrections + 1);

          // delete
          addCandidate(node.center,
                       remaining.substring(2),
                       newoutput,
                       multiplier * deletionMultiplier,
                       frequency, corrections + 1);
        }
      }
    }
  }

  //
  // This function unpacks binary data from the dictionary and returns
  // the nodes of the dictionary tree in expanded form as JS objects.
  // See gaia/dictionaries/xml2dict.py for the corresponding code that
  // serializes the nodes of the tree into this binary format. Full
  // documentation of the binary format is in that file.
  //
  function readNode(offset, node) {
    if (offset === -1) {
      throw Error('Assertion error: followed invalid pointer');
    }

    var firstbyte = tree[offset++];
    var haschar = firstbyte & 0x80;
    var bigchar = firstbyte & 0x40;
    var hasnext = firstbyte & 0x20;
    node.freq = (firstbyte & 0x1F) + 1;  // frequencies range from 1 to 32

    if (haschar) {
      node.ch = tree[offset++];
      if (bigchar)
        node.ch = (node.ch << 8) + tree[offset++];
    }
    else {
      node.ch = 0;
    }

    if (hasnext) {
      node.next =
        (tree[offset++] << 16) +
        (tree[offset++] << 8) +
        tree[offset++];
    }
    else {
      node.next = -1;
    }

    if (haschar)
      node.center = offset;
    else
      node.center = -1;

/*
    log("readNode:" +
        " haschar:" + haschar +
        " bigchar:" + bigchar +
        " hasnext:" + hasnext +
        " freq:" + node.freq +
        " char:" + node.ch +
        " next:" + node.next +
        " center:" + node.center);
*/
  }

  //
  // A priority queue with a maximum size.
  //
  // add() inserts an item at a position according to its priority. It
  // returns true if the item was inserted or false if the item's priority
  // was too low for a spot in the fixed-size queue.
  //
  // remove() removes and returns the highest priority item in the queue or
  // null if there are no items
  //
  // threshold is 0 if the queue is not yet full. Otherwise it is the
  // priority of the lowest-priority item in the queue. Items with
  // priorities higher lower than this will never be added to the queue.
  //
  // items is the sorted array of items, with the highest priority item
  // first.
  //
  function BoundedPriorityQueue(maxSize) {
    this.maxSize = maxSize;
    this.threshold = 0;
    this.items = [];
    this.priorities = [];
  }

  BoundedPriorityQueue.prototype.add = function add(item, priority) {
    // If the array is full we have to reject this item or make room for it
    if (this.items.length === this.maxSize) {
      if (priority <= this.threshold) { // Reject the item.
        return false;
      }
      else {                            // Make room for it.
        this.items.pop();
        this.priorities.pop();
      }
    }

    // Search to find the insertion point for this new item
    var index;
    if (this.priorities.length > 60) {
      // Binary search only for relatively long arrays.
      // See http://jsperf.com/linear-or-binary-search for perf data.
      var start = 0, end = this.priorities.length;
      while (start !== end) {
        var mid = Math.floor((start + end) / 2);
        if (priority > this.priorities[mid]) {
          end = mid;
        }
        else {
          start = mid + 1;
        }
      }
      index = start;
    }
    else {
      // Linear search for small arrays
      for (var i = 0, n = this.priorities.length; i < n; i++) {
        if (priority > this.priorities[i])
          break;
      }
      index = i;
    }

    // Insert the new item at that position
    this.items.splice(index, 0, item);
    this.priorities.splice(index, 0, priority);

    // Update the threshold
    this.threshold = this.priorities[this.maxSize - 1] || 0;
  };

  BoundedPriorityQueue.prototype.remove = function remove() {
    if (this.items.length === 0)
      return null;
    this.priorities.shift();
    this.threshold = this.priorities[this.maxSize - 1] || 0;
    return this.items.shift();
  };

  BoundedPriorityQueue.prototype.removeItemAt = function removeItemAt(index) {
    this.priorities.splice(index, 1);
    this.items.splice(index, 1);
    this.threshold = this.priorities[this.maxSize - 1] || 0;
  };

  //
  // A very simple Least Recently Used cache. It depends on the fact that the
  // JavaScript for/in loop enumerates properties in order from least recently
  // to most recently added. (Note that this does not work for properties
  // that are numbers, however.)
  //
  function LRUCache(maxsize) {
    this.maxsize = maxsize;
    this.size = 0;
    this.map = Object.create(null); // map keys to values
  }

  // Cache the key/value pair
  LRUCache.prototype.add = function add(key, value) {
    // If the key is already in the cache, adjust the size since we'll
    // be incrementing below
    if (key in this.map) {
      this.size--;
    }

    // Now insert the item
    this.map[key] = value;
    this.size++;

    // If the size is too big delete the first property returned by
    // for/in. This should be the least recently used because the get()
    // method deletes and reinserts
    if (this.size > this.maxsize) {
      for (var p in this.map) {
        delete this.map[p];
        break;
      }
      this.size--;
    }
  };

  // Look for a cached value matching the specified key
  LRUCache.prototype.get = function(key) {
    if (key in this.map) {        // If the key is in the cache
      var value = this.map[key];  // Get the value
      delete this.map[key];       // Delete the key/value mapping
      this.map[key] = value;      // And re-insert to make it most recent
      return value;               // Return the value
    }
    return null;
  };

  // Find the input in the dictionary and return an array of possible
  // next characters ordered by likelyhood
  function predictNextChar(input) {
    var pointer = 0;
    var node = {};
    var result = [];
    readNode(pointer, node);

    for (var i = 0, len = input.length; i < len; i++) {
      var charcode = input.charCodeAt(i);

      // Find the node that matches this input character
      while (node.ch !== charcode) {
        pointer = node.next;
        if (pointer === -1)
          break;
        readNode(pointer, node);
      }

      if (pointer === -1) {
        // The input is not in the dictionary. Return an empty result.
        return result;
      }

      // We found the character, so move on to the next;
      pointer = node.center;
      readNode(pointer, node);
    }

    // When we get here, the pointer should be pointing to the most likely
    // character after the specified input.
    while (true) {
      result.push(node.ch, node.freq);
      if (node.next === -1)
        return result;
      pointer = node.next;
      readNode(pointer, node);
    }
  }

  // This is the Predictions object that is the public API of this module.
  return {
    setDictionary: setDictionary,
    setNearbyKeys: setNearbyKeys,
    predict: predict,
    predictNextChar: predictNextChar
  };
}();
