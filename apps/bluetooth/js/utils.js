/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function getTruncated(oldName, options) {

  // options
  var maxLine = options.maxLine || 2;
  var node = options.node;
  var ellipsisIndex = options.ellipsisIndex || 3;
  var ellipsisCharacter = options.ellipsisCharacter || '...';

  if (node === null) {
    return oldName;
  }

  // used variables and functions
  function hitsNewline(oldHeight, newHeight) {
    return oldHeight !== newHeight;
  }

  var newName = '';
  var oldHeight;
  var newHeight;
  var baseHeight;
  var currentLine;
  var ellipsisAt;
  var hasNewEllipsisPoint = true;
  var nameBeforeEllipsis = [];
  var nameBeforeEllipsisString;
  var nameAfterEllipsis = oldName.slice(-ellipsisIndex);
  var realVisibility = node.style.visibility;
  var realWordBreak = node.style.wordBreak;

  /*
   * Hide UI, because we are manipulating DOM
   */
  node.style.visibility = 'hidden';

  /*
   * Force breaking on boundaries
   */
  node.style.wordBreak = 'break-all';

  /*
   * Get the base height to count the currentLine at first
   */
  node.textContent = '.';
  baseHeight = node.clientHeight;
  node.textContent = '';

  var needEllipsis = oldName.split('').some(function(character, index) {

    nameBeforeEllipsis.push(character);
    nameBeforeEllipsisString = nameBeforeEllipsis.join('');

    oldHeight = node.clientHeight;
    node.textContent = nameBeforeEllipsisString +
        ellipsisCharacter + nameAfterEllipsis;
    newHeight = node.clientHeight;

    /*
     * When index is 0, we have to update currentLine according to
     * the first assignment (it is possible that at first the currentLine
     * is not 0 if the width of node is too small)
     */
    if (index === 0) {
      currentLine = Math.floor(newHeight / baseHeight);
    }

    if (hitsNewline(oldHeight, newHeight) && index !== 0) {

      /*
       * The reason why we have to check twice is because there is a
       * situation that truncated string is overflowed but there is
       * still room for original string.
       *
       * In this way, we have to memorize the ellipsis index and
       * slice `nameBeforeEllipsis` to the index in the end.
       */
      var testHeight;
      node.textContent = nameBeforeEllipsisString;
      testHeight = node.clientHeight;

      if (hitsNewline(oldHeight, testHeight)) {

        /*
         * We have to make it true again to keep the ellipsisAt
         * up to date.
         */
        hasNewEllipsisPoint = true;
        currentLine += 1;
      } else {
        /*
         * This is the situation that we still have room, so we have
         * to keep the ellipsisAt value for later use.
         */
        if (hasNewEllipsisPoint) {
          ellipsisAt = index;
          hasNewEllipsisPoint = false;
        }
      }
    }

    if (currentLine > maxLine) {
      if (index === 0) {

        /*
         * It means that at first, the whole string is already in
         * an overflowed situation, you have to avoid this situation.
         * And we will bypass oldName back to you.
         *
         * There are some options for you :
         *
         *   1. Check options.ellipsisCharacter
         *   2. Check options.maxLine
         *   3. Check node's width (maybe too narrow)
         */
        console.log(
          'Your string is in a overflowed situation, ' +
          'please check your options');
      }

      /*
       * Remove the last character, because it causes the overflow
       */
      nameBeforeEllipsis.pop();
      node.textContent = '';
      return true;
    }
  });

  // restore UI
  node.style.visibility = realVisibility;
  node.style.wordBreak = realWordBreak;

  if (!needEllipsis) {
    newName = oldName;
  } else {
    newName += nameBeforeEllipsis.join('').slice(0, ellipsisAt);
    newName += ellipsisCharacter;
    newName += nameAfterEllipsis;
  }

  return newName;
}
