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
   *             ellipsisCharacter {string}: optional, the text of ellipsis
   *                                         char. The default value is '...'.
   *
   */
  getTruncated: function(oldName, options) {

    // options
    var maxLine = options.maxLine || 2;
    var node = options.node;
    var ellipsisCharacter = options.ellipsisCharacter || '...';

    if (node === null) {
      return oldName;
    }

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
     * Get the height of a line of text
     */
    node.textContent = '.';
    var baseHeight = node.clientHeight;
    var computedStyle = window.getComputedStyle(node, null);
    var paddingTop =
      parseInt(computedStyle.getPropertyValue('padding-top'), 10);
    var paddingBottom =
      parseInt(computedStyle.getPropertyValue('padding-bottom'), 10);
    var padding = paddingTop + paddingBottom;
    var lineHeight = baseHeight - padding;

    /*
     * Determine if the title needs truncating
     */
    node.textContent = oldName;
    var originalTitleHeight = node.clientHeight - padding;
    var linesForOriginalTitle = (originalTitleHeight / lineHeight);
    if (linesForOriginalTitle <= maxLine) {
      /*
       * Title does not need truncating. Restore UI and return original title
       */
      node.style.visibility = realVisibility;
      node.style.wordBreak = realWordBreak;
      return oldName;
    }

    function titleTooLong(pos) {
      node.textContent = oldName.slice(0, pos) + ellipsisCharacter;
      var tempTitleHeight = node.clientHeight - padding;
      return (tempTitleHeight / lineHeight) > maxLine;
    }

    var low = 0;
    var high = oldName.length - 1;
    var mid;
    var ellipsisIndex = 0;

    do {
      mid = Math.floor((low + high) / 2);
      if (titleTooLong(mid)) {
        high = mid - 1;
      }
      else {
        ellipsisIndex = mid;
        low = mid + 1;
      }
    }
    while (low <= high);

    var newName = oldName.slice(0, ellipsisIndex) + ellipsisCharacter;

    // restore UI
    node.style.visibility = realVisibility;
    node.style.wordBreak = realWordBreak;

    return newName;
  }
};
