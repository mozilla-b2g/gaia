
var INTSIZE    = 4;
var FLOATSIZE  = 4;
var SHORTSIZE  = 2;

// maps EMScript member pointers to their parent object
// whenever an object is free'd, we first have to free object members
// entry[0] = parentAddress
// entry[1-n] = memberAdresses
var memoryManager = [];

// takes a parent address and an array of member addresses
// params:
// int parent
// int[] members
function storeMemberPointers(parent, members) {
  var map = [];
  map[0] = parent;
  for (var i = 0; i < members.length; i++) {
    map[i+1] = members[i];
  }
  memoryManager.push(map);
}

function freeMemberPointers(parent) {
  for (var i = 0; i < memoryManager.length; i++) {
    if (memoryManager[i][0] == parent) {
      for (var j = 1; j < memoryManager[i].length; j++) {
        Module._freeMem(memoryManager[i][j]);
      }
      memoryManager[i][0] = -1;
      break;
    }
  }
}

// copy's JavaScript array elements into EmScripten Heap
function JSInt32ArrayToEmSriptenInt32Array(dstAddress, srcArray) {
  for (var i = 0; i < srcArray.length; i++) {
    Module.HEAP32[(dstAddress>>2)+i] = srcArray[i];
  }
}

function Float32ArrayToEmScriptenInt32Array(dstAddress, srcArray) {
  for (var i = 0; i < srcArray.length; i++) {
    Module.HEAPF32[(dstAddress>>2)+i] = srcArray[i];
  }
}

function emScriptenInt16ArrayToJSInt32Array(srcAddr, dstArray) {
  for (var i = 0; i < dstArray.length; i++) {
    dstArray[i] = Module.HEAP16[(srcAddr>>1)+i];
  }
}

function emScriptenInt32ArrayToJSInt32Array(srcAddr, dstArray) {
  for (var i = 0; i < dstArray.length; i++) {
    dstArray[i] = Module.HEAP32[(srcAddr>>2)+i];
  }
}

function JSInt32ArrayToEmScriptenInt16Array(dstAddress, srcArray) {
  for (var i = 0; i < srcArray.length; i++) {
    Module.HEAP16[(dstAddress>>1)+i] = srcArray[i];
  }
}

// Java: "setProximityInfoNative", "(IIIII[II[I[I[I[I[I[F[F[F)I"
//
// params:
// int maxProximityCharsSize
// int displayWidth
// int displayHeight
// int gridWidth
// int gridHeight
// uint32[] proximityCharsArray
// int keyCount
// uint32[] keyXCoordinateArray
// uint32[] keyYCoordinateArray
// int32[] keyWidthArray
// int32[] keyHeightArray
// int32[] keyCharCodeArray
// float[] sweetSpotCenterXArray
// float[] sweetSpotCenterYArray
// float[] sweetSpotRadiusArray
function emScriptenCreateProximityInfo(maxProximityCharsSize, displayWidth,
                                       displayHeight, gridWidth, gridHeight,
                                       proximityCharsArray, keyCount,
                                       keyXCoordinateArray, keyYCoordinateArray,
                                       keyWidthArray, keyHeightArray,
                                       keyCharCodeArray, sweetSpotCenterXArray,
                                       sweetSpotCenterYArray,
                                       sweetSpotRadiusArray) {
	
  emProximityCharsArray = Module._allocateMem(proximityCharsArray.length * INTSIZE);
  JSInt32ArrayToEmSriptenInt32Array(emProximityCharsArray, proximityCharsArray);
  
  emKeyXCoordinateArray = Module._allocateMem(keyXCoordinateArray.length * INTSIZE);
  JSInt32ArrayToEmSriptenInt32Array(emKeyXCoordinateArray, keyXCoordinateArray);
  
  emKeyYCoordinateArray = Module._allocateMem(keyYCoordinateArray.length * INTSIZE);
  JSInt32ArrayToEmSriptenInt32Array(emKeyYCoordinateArray, keyYCoordinateArray);
  
  emKeyWidthArray = Module._allocateMem(keyWidthArray.length * INTSIZE);
  JSInt32ArrayToEmSriptenInt32Array(emKeyWidthArray, keyWidthArray);
  
  emKeyHeightArray = Module._allocateMem(keyHeightArray.length * INTSIZE);
  JSInt32ArrayToEmSriptenInt32Array(emKeyHeightArray, keyHeightArray);
   
  emKeyCharCodeArray = Module._allocateMem(keyCharCodeArray.length * INTSIZE);
  JSInt32ArrayToEmSriptenInt32Array(emKeyCharCodeArray, keyCharCodeArray);
  
  emSweetSpotCenterXArray = Module._allocateMem(sweetSpotCenterXArray.length * FLOATSIZE);
  Float32ArrayToEmScriptenInt32Array(emSweetSpotCenterXArray, sweetSpotCenterXArray);
 
  emSweetSpotCenterYArray = Module._allocateMem(sweetSpotCenterYArray.length * FLOATSIZE);
  Float32ArrayToEmScriptenInt32Array(emSweetSpotCenterYArray, sweetSpotCenterYArray);
  
  emSweetSpotRadiusArray = Module._allocateMem(sweetSpotRadiusArray.length * FLOATSIZE);
  Float32ArrayToEmScriptenInt32Array(emSweetSpotRadiusArray, sweetSpotRadiusArray);

  var emProximityInfo =
	  Module._createProximityInfo(maxProximityCharsSize, keyboardWidth,
                                keybaordHeight, gridWidth, gridHeight,
                                emProximityCharsArray, keyCount,
                                emKeyXCoordinateArray, emKeyYCoordinateArray,
                                emKeyWidthArray, emKeyHeightArray,
                                emKeyCharCodeArray, emSweetSpotCenterXArray,
                                emSweetSpotCenterYArray,
                                emSweetSpotRadiusArray);
  
  var memAddr = [];
  memAddr.push(emProximityCharsArray);
  memAddr.push(emKeyXCoordinateArray);
  memAddr.push(emKeyYCoordinateArray);
  memAddr.push(emKeyWidthArray);
  memAddr.push(emKeyHeightArray);
  memAddr.push(emKeyCharCodeArray);
  memAddr.push(emSweetSpotCenterXArray);
  memAddr.push(emSweetSpotCenterYArray);
  memAddr.push(emSweetSpotRadiusArray);

  storeMemberPointers(emProximityInfo, memAddr);

  return emProximityInfo;
}

// Java: releaseProximityInfoNative", "(I)V"
//
// params:
// int proximityInfo 
function mScriptenReleaseProximityInfo(proximityInfo) {
  freeMemberPointers(proximityInfo);
  Module._freeMem(proximityInfo);
}

// Java: "openNative", "(Ljava/lang/String;JJIIIII)I"
//
// params:
// string sourceDir
// int dictSize
// int typedLetterMultiplier
// int fullWordMultiplier
// int maxWordLength
// int maxWords
// int maxAlternatives 
function emScriptenCreateDictionary(sourceDir, dictOffset, dictSize,
                                    typedLetterMultiplier, fullWordMultiplier,
                                    maxWordLength, maxWords, maxAlternatives) {
  
    // TODO:
    // currently the dictionary is integrated 'hardcoded' in c++ before the
    // library is converted to JavaScript using emScripten. once this code
    // is fully integrated in chrome, we have to replace the hardcoded dict
    // in c++ using the FileReader API and loading the binary dictionary into
    // the variable dictBuf.
    
    // var binFile = File(sourceDir);
    // var fileReader = new FileReader();
    // fileReader.readAsDataURL(binFile);
  
    var dictBuf = 0;
    var fd = 0;
    var adjust = 0;

    var emDictionary = Module._createDictionary(dictBuf, dictSize, fd, adjust,
                                                typedLetterMultiplier,
                                                fullWordMultiplier,
                                                maxWordLength, maxAlternatives);
                                    
    return emDictionary;                                            
}

// Java "closeNative", "(I)V"
// params:
// int dictionary
function emScriptenCloseDictionary(dictionary) {
  Module._freeDictionary(dictionary);
}

// Java "getSuggestionsNative", "(II[I[I[III[C[I)I"
//
// params:
// int dict
// int proximityInfo
// int[] xCoordinatesArray
// int[] yCoordinatesArray
// int[] inputArray
// int arraySize
// int flags
// int[] outputArray
// int[] frequencyArray
function emScriptenGetSuggestions(dict, proximityInfo,
                                  xCoordinatesArray, yCoordinatesArray,
                                  inputArray, arraySize, flags,
                                  outputArray, frequencyArray) {

  emXCoordinatesArray = Module._allocateMem(xCoordinatesArray.length * INTSIZE);
  JSInt32ArrayToEmSriptenInt32Array(emXCoordinatesArray, xCoordinatesArray);
  
  emYCoordinatesArray = Module._allocateMem(yCoordinatesArray.length * INTSIZE);
  JSInt32ArrayToEmSriptenInt32Array(emYCoordinatesArray, yCoordinatesArray);
  
  emInputArray = Module._allocateMem(inputArray.length * INTSIZE);
  JSInt32ArrayToEmSriptenInt32Array(emInputArray, inputArray);

  emOutputArray = Module._allocateMem(outputArray.length * INTSIZE);
  JSInt32ArrayToEmSriptenInt32Array(emOutputArray, outputArray);

  emFrequencyArray = Module._allocateMem(frequencyArray.length * INTSIZE);
  JSInt32ArrayToEmSriptenInt32Array(emFrequencyArray, frequencyArray);

  var count = Module._getSuggestions(dict, proximityInfo,
                                     emXCoordinatesArray, emYCoordinatesArray,
                                     emInputArray, arraySize, flags,
                                     emOutputArray, emFrequencyArray);

  emScriptenInt16ArrayToJSInt32Array(emOutputArray, outputArray);
  emScriptenInt32ArrayToJSInt32Array(emFrequencyArray, frequencyArray);

  Module._freeMem(emXCoordinatesArray);
  Module._freeMem(emYCoordinatesArray);
  Module._freeMem(emInputArray);
  Module._freeMem(emOutputArray);
  Module._freeMem(emFrequencyArray);

  return count;
}

// Java "isValidWordNative", "(I[CI)Z"
// 
// params:
// int dict
// int[] wordArray
function emScriptenIsValidWord(dict, wordArray) {

  var emWordArray = Module._allocateMem(wordArray.length * SHORTSIZE);
  JSInt32ArrayToEmScriptenInt16Array(emWordArray, wordArray);

  var result = Module._isValidWord(dict, emWordArray, wordArray.length);

  Module._freeMem(emWordArray);
  return result;
}

// Java "getBigramsNative", "(I[CI[II[C[IIII)I"
//   
// params:
// int dict
// int32[] word
// int32[] codes
// int32[] outWords
// int32[] frequencies
// int maxWordLength
// int maxBigrams
// int maxAlternatives
function emScriptenGetBigrams(dict, word, codes, outWords, frequencies,
                              maxWordLength, maxBigrams, maxAlternatives) {
	
  var emWord = Module._allocateMem(word.length * SHORTSIZE);
  JSInt32ArrayToEmScriptenInt16Array(emWord, word);
  
  var emCodes = Module._allocateMem(codes.length * INTSIZE);
  JSInt32ArrayToEmSriptenInt32Array(emCodes, codes);
  
  var emOutWords = Module._allocateMem(outWords.length * SHORTSIZE);
  JSInt32ArrayToEmScriptenInt16Array(emOutWords, outWords);
  
  var emFrequencies = Module._allocateMem(frequencies.length * INTSIZE);
  JSInt32ArrayToEmSriptenInt32Array(emFrequencies, frequencies);
  
  var count = Module._getBigrams(dict, emWord, word.length,
                                 emCodes, codes.length, emOutWords,
                                 emFrequencies, maxWordLength,
                                 maxBigrams, maxAlternatives);

  emScriptenInt16ArrayToJSInt32Array(emOutWords, outWords);
  emScriptenInt32ArrayToJSInt32Array(emFrequencies, frequencies);
  
  Module._freeMem(emWord);
  Module._freeMem(emCodes);
  Module._freeMem(emOutWords);
  Module._freeMem(emFrequencies);
  
  return count;
}
