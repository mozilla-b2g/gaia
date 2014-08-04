var VideoUtils = {
  /**
   * fit the video player to the container. This function aspects the video
   * ratio and scales video player to fit as large as possible area of
   * container.
   *
   * @param {DOM} |container| the container for displaying this video.
   * @param {DOM} |player| the video element to fit the container.
   * @param {int} |videoRotation| the rotation of video content. (optional)
   */
  fitContainer: function(container, player, videoRotation) {
    var containerWidth = container.clientWidth;
    var containerHeight = container.clientHeight;

    // Don't do anything if we don't know our size.
    // This could happen if we get a resize event before our metadata loads
    if (!player.videoWidth || !player.videoHeight)
      return;

    var width, height; // The size the video will appear, after rotation
    var rotation = videoRotation || 0;

    switch (rotation) {
    case 0:
    case 180:
      width = player.videoWidth;
      height = player.videoHeight;
      break;
    case 90:
    case 270:
      width = player.videoHeight;
      height = player.videoWidth;
    }

    var xscale = containerWidth / width;
    var yscale = containerHeight / height;
    var scale = Math.min(xscale, yscale);

    // scale large videos down and scale small videos up
    // this might result in lower image quality for small videos
    width *= scale;
    height *= scale;

    var left = ((containerWidth - width) / 2);
    var top = ((containerHeight - height) / 2);

    /*
     * The translate and scale only takes a number + length unit. According to
     * MDN's number definition, the scientific notation, 2.1234e-14, is not a
     * valid value. To prevent that, we use toFixed(4) to round at the 4th
     * digits after decimal point.
     */
    var transform;
    switch (rotation) {
    case 0:
      transform = 'translate(' + left.toFixed(4) + 'px,' +
                                 top.toFixed(4) + 'px)';
      break;
    case 90:
      transform =
        'translate(' + (left + width).toFixed(4) + 'px,' +
                       top.toFixed(4) + 'px) ' +
        'rotate(90deg)';
      break;
    case 180:
      transform =
        'translate(' + (left + width).toFixed(4) + 'px,' +
                       (top + height).toFixed(4) + 'px) ' +
        'rotate(180deg)';
      break;
    case 270:
      transform =
        'translate(' + left.toFixed(4) + 'px,' +
                       (top + height).toFixed(4) + 'px) ' +
        'rotate(270deg)';
      break;
    }

    transform += ' scale(' + scale.toFixed(4) + ')';

    player.style.transform = transform;
  },

  /**
   * To get the truncated string. It loads oldName into a HTML Element provided
   * with options. This element must put into DOM tree and all css are applied.
   * We use the height of this element to detect the creation of new line. So,
   * the height of this element should not be fixed.
   *
   * arguments:
   *     oldName {string}   the original string
   *     options {object}   an object with the following attributes:
   *             node {HTMLElement}: the element contains the text.
   *             maxLine {int}: optional, maximum line of text. The default
   *                            value is 2.
   *             ellipsisIndex {int}: optional, the number of left text in the
   *                                  end. The default value is 3.
   *             ellipsisCharacter {string}: optional, the text of ellipsis
   *                                         char. The default value is '...'.
   *
   */
  getTruncated: function(oldName, options) {

    // options
    var maxLine = options.maxLine || 2;
    var node = options.node;
    var ellipsisIndex = (options.ellipsisIndex || options.ellipsisIndex === 0) ?
                        ellipsisIndex = options.ellipsisIndex : 3;
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
    var nameBeforeEllipsis = [];
    var nameBeforeEllipsisString;
    var nameAfterEllipsis = ellipsisIndex ? oldName.slice(-ellipsisIndex) : '';
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

    /*
     * Determine if the title needs truncating
     */
    node.textContent = oldName;
    var originalTitleHeight = node.clientHeight;
    var linesForOriginalTitle = (originalTitleHeight / baseHeight);
    if (linesForOriginalTitle <= maxLine) {
      /*
       * Title does not need truncating. Restore UI and return original title
       */
      node.style.visibility = realVisibility;
      node.style.wordBreak = realWordBreak;
      return oldName;
    }

    node.textContent = '';

    var ellipseIndex;
    oldName.split('').some(function(character, index) {

      ellipseIndex = index;
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

        currentLine += 1;
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
          console.error(
            'Your string is in a overflowed situation, ' +
            'please check your options');
        }

        /*
         * Remove the last character, because it causes the overflow
         */
        nameBeforeEllipsis.pop();
        node.textContent = '';

        newName = nameBeforeEllipsis.join('').slice(0, ellipseIndex);
        newName += ellipsisCharacter;
        newName += nameAfterEllipsis;

        return;
      }
    });

    // restore UI
    node.style.visibility = realVisibility;
    node.style.wordBreak = realWordBreak;

    return newName;
  }
};
