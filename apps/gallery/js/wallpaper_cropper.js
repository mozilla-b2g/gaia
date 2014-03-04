/**
 *wallpaper_cropper.js: simple image crop viewer .
 *
 *Display a given image on to the screen by applying css transformations
 *inside the specified container element. The image will be fitted  within
 *the container's area.
 *
 *In addition to previewing the image, this class also defines a
 *addPanAndZoomHandlers() function which handles zoom & pan events on
 *container element.
 *
 *getCroppedRegionBlob() will get the required crop region blob.
 */
function Wallpapercropper(data, container, ready) {
  this.fileinfo = data.fileinfo || null;
  this.blob = data.blob || null;
  this.previewURL = data.previewURL || null;
  this.gestureDetector = null;
  this.container = container;

  this.frame = new MediaFrame(container);

  this.frame.displayImage(this.blob,
                          this.fileinfo.metadata.width,
                          this.fileinfo.metadata.height,
                          this.fileinfo.metadata.preview,
                          this.fileinfo.metadata.rotation,
                          false);
  //Need proper callback from displayImage to call ready function
  if (ready)
    ready();
}

/*
 * This module adds pan-and-zoom capability to images displayed by
 * shared/js/media/media_frame.js.
 */
Wallpapercropper.prototype.addPanAndZoomHandlers = function() {
  // frame is the MediaFrame object. container is its the DOM element.
  var frame = this.frame;
  var container = frame.container;

  // Generate gesture events for the container
  this.gestureDetector = new GestureDetector(container);
  this.gestureDetector.startDetecting();

  // And handle them with these listeners
  container.addEventListener('dbltap', handleDoubleTap);
  container.addEventListener('transform', handleTransform);
  container.addEventListener('pan', handlePan);

  function handleDoubleTap(e) {
    var scale;
    if (frame.fit.scale > frame.fit.baseScale) {
      scale = frame.fit.baseScale / frame.fit.scale;
    }
    else {
      scale = 2;
    }

    frame.zoom(scale, e.detail.clientX, e.detail.clientY, 200);
  }

  function handleTransform(e) {
    frame.zoom(e.detail.relative.scale, e.detail.midpoint.clientX, e.detail.midpoint.clientY);
  }

  function handlePan(e) {
    frame.pan(e.detail.relative.dx, e.detail.relative.dy);
  }
};

Wallpapercropper.prototype.hasBeenCropped = function() {
  return (Math.abs(this.frame.fit.scale - this.frame.fit.baseScale) > 0.01);
};

// Get the pixels of the selected crop region, and resize them if width
// and height are specifed, encode them as an image file of the specified
// type and pass that file as a blob to the specified callback
Wallpapercropper.prototype.getCroppedRegionBlob = function(type,
                                                      width, height,
                                                      callback)
{
  var fitWith = this.frame.fit.width;
  var fitHieght = this.frame.fit.height;
  var frmImgWidth = this.frame.image.width;
  var frmImgHeight = this.frame.image.height;
  var fitscale = this.frame.fit.scale;
  var fitbaseScale = this.frame.fit.baseScale;

  // If no destination size was specified, use the screen size
  if (!width || !height) {
    width = window.innerWidth * window.devicePixelRatio;
    height = window.innerHeight * window.devicePixelRatiop;
  }

  // Create a canvas of the desired size
  var canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  var context = canvas.getContext('2d');

  var sx;
  var sy;

  if (this.frame.fit.left > 0)
  {
    sx = 0;
  }
  else
  {
    sx = Math.floor(Math.abs(this.frame.fit.left) / fitscale);
  }
  if (this.frame.fit.top > 0)
  {
    sy = 0;
  }
  else
  {
    sy = Math.floor(Math.abs(this.frame.fit.top) / fitscale);
  }

  var swidth = Math.floor((frmImgWidth - sx));
  var sheight = Math.floor((frmImgHeight - sy));
  //This logic does not holds good , I am still working on calculating
  // limitwidth & limitheight, any suggestions on this will be helpful
  var limitWidth = Math.floor(width * (fitscale / fitbaseScale));
  var limitHeight = Math.floor(height * (fitscale / fitbaseScale));

  //No crop scenario
  if (Math.abs(this.frame.fit.scale - this.frame.fit.baseScale) > 0.01)
  {
    if (limitWidth < swidth)
    {
      swidth = limitWidth;
    }
    if (limitHeight < sheight)
    {
      sheight = limitHeight;
    }
  }
  context.drawImage(this.frame.image, sx, sy, swidth,
                    sheight, 0, 0, width, height);
  canvas.toBlob(callback, type);
};

Wallpapercropper.prototype.reset = function() {
  this.frame.clear();
  this.gestureDetector.stopDetecting();
  this.gestureDetector = null;
  this.frame = null;
};
