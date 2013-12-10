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
  }
};
