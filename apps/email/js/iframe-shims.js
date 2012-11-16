'use strict';

/**
 * Some default styles to override the canonical HTML5 styling defaults that
 * make our display seem bad.  These are currently inline because we want to be
 * able to synchronously (re)flow the document without needing styles to load.
 * This does not need to be the case longterm; after our initial reflow to
 * detect newsletters, we could only add in a link to a CSS file shipped with
 * us for the non-newsletter case.  We could also internally load the CSS file
 * and splice it in rather than hardcoding it.
 */
const DEFAULT_STYLE_TAG =
  '<style type="text/css">\n' +
  // ## blockquote
  // blockquote per html5: before: 1em, after: 1em, start: 40px, end: 40px
  'blockquote {' +
  'margin: 0; ' +
  // so, this is quoting styling, which makes less sense to have in here.
  'border-left: 2px solid gray;' +
  // padding-start isn't a thing yet, somehow.
  'padding: 0; -moz-padding-start: 5px; ' +
  '}\n' +
  '.moz-external-link { color: blue; cursor: pointer; }\n' +
  '</style>';

/**
 * Logic to help with creating, populating, and handling events involving our
 * HTML message-disply iframes.
 *
 * All HTML content is passed through a white-list-based sanitization process,
 * but we still want the iframe so that:
 *
 * - We can guarantee the content can't escape out into the rest of the page.
 * - We can both avoid the content being influenced by our stylesheets as well
 *   as to allow the content to use inline "style" tags without any risk to our
 *   styling.
 * - We MAYBE SOMEDAY get the security benefits of an iframe "sandbox".
 *
 * Our iframe sandbox attributes (not) specified and rationale are:
 * - "allow-same-origin": YES.  We do this because in order to touch the
 *   contentDocument we need to live in the same origin.  Because scripts are
 *   not enabled in the iframe this is not believed to have any meaningful
 *   impact.
 * - "allow-scripts": NO.  We never ever want to let scripts from an email
 *   run.  And since we are setting "allow-same-origin", even if we did want
 *   to allow scripts we *must not* while that setting is on.  Our CSP should
 *   limit the use of scripts if the iframe has the same origin as us since
 *   everything in the iframe should qualify as
 * - "allow-top-navigation": NO.  The iframe should not navigate if the user
 *   clicks on a link.  Note that the current plan is to just capture the
 *   click event and trigger the browse event ourselves so we can show them the
 *   URL, so this is just extra protection.
 * - "allow-forms": NO.  We already sanitize forms out, so this is just extra
 *   protection.
 * - "allow-popups": NO.  We would never want this, but it also shouldn't be
 *   possible to even try to trigger this (scripts are disabled and sanitized,
 *   links are sanitized to forbid link targets as well as being nerfed), so
 *   this is also just extra protection.
 *
 * The spec makes a big deal that flag changes only take effect when navigation
 * occurs.  Accordingly, we may need to actually trigger navigation by using
 * a data URI (currently, and which should be able to inherit our origin)
 * rather than relying on about:blank.  On the other hand, sandbox flags have
 * been added to CSP, so we might also be able to rely on our CSP having set
 * things so that even the instantaneously created about:blank gets locked down.
 *
 * The only wrinkle right now is that gecko does not support the "seamless"
 * attribute.  This is not a problem since our content insertion is synchronous
 * and we can force a size calculation, but it would be nice if we didn't
 * have to do it.
 *
 * ## Document Width and Zooming ##
 *
 * There are two types of HTML e-mails:
 *
 * 1) E-mails written by humans which are basically unstructured prose plus
 *    quoting.  The biggest problems these face are deep quoting causing
 *    blockquote padding to cause text to have very little screen real estate.
 *
 * 2) Newsletter style e-mails which are structured and may have multiple
 *    columns, grids of images and stuff like that.
 *
 * Newsletters tend to assume a screen width of around 600px.  They also help
 * us out by usually explicitly sizing (parts) of themselves with that big
 * number, but usually a few levels of DOM in.  We could try and look for
 * explicit 'width' style directives (or attributes for tables), possibly
 * during sanitization, or we can try and force the layout engine to figure out
 * how wide the document really wants to be and then figure out if we need
 * a zoom strategy.  The latter approach is more reliable but will result in
 * layout having to perform 2 reflows (although one of them could probably be
 * run during synchronization and persisted).
 *
 * We use the make-layout-figure-it-out strategy and declare any width that
 * ended up being wider than the viewport's width is a newsletter.  We then
 * deal with the cases like so:
 *
 * 1) We force the iframe to be the width of our screen and try and imitate a
 *    seamless iframe by setting the height of the iframe to its scrollHeight.
 *
 * 2) We force the iframe to be the size it wants to be and use transform magic
 *    and gallery interaction logic to let the user pan and zoom to their
 *    heart's content.  We lack the ability to perform reflows-on-zoom like
 *    browser frames can do right now, so this sucks, but not as bad as if we
 *    tried to force the newsletter into a smaller width than it was designed
 *    for.  We could implement some workarounds for this, but it seems useful
 *    to try and drive this in platform.
 *
 * Here's an interesting blog post on font inflation for those that want to
 * know more:
 * http://jwir3.wordpress.com/2012/07/30/font-inflation-fennec-and-you/
 *
 * BUGS BLOCKING US FROM DOING WHAT WE REALLY WANT, MAYBE:
 *
 * - HTML5 iframe sandbox attribute which is landing soon.
 *   https://bugzilla.mozilla.org/show_bug.cgi?id=341604
 *
 * - reflow on zoom doesn't exist yet?
 *   https://bugzilla.mozilla.org/show_bug.cgi?id=710298
 *
 * BUGS MAKING US DO WORKAROUNDS:
 *
 * - iframe "seamless" doesn't work, so we manually need to poke stuff:
 *   https://bugzilla.mozilla.org/show_bug.cgi?id=80713
 *
 * - iframes can't get the web browser pan-and-zoom stuff for free, so we
 *   use logic from the gallery app.
 *   https://bugzilla.mozilla.org/show_bug.cgi?id=775456
 *
 * ATTENTION: ALL KINDS OF CODE IS COPIED AND PASTED FROM THE GALLERY APP TO
 * GIVE US PINCH AND ZOOM.  IF YOU SEE CODE THAT SAYS PHOTO, THAT IS WHY.
 * ALSO, PHOTOS WILL REPLACE EMAIL AS THE MEANS OF COMMUNICATION.
 *
 * Uh, the ^ stuff below should really be @, but it's my jstut syntax that
 * gjslint simply hates, so...
 *
 * ^args[
 *   ^param[htmlStr]
 *   ^param[parentNode]{
 *     The (future) parent node of the iframe.
 *   }
 *   ^param[adjacentNode ^oneof[null HTMLNode]]{
 *     insertBefore semantics.
 *   }
 *   ^param[linkClickHandler ^func[
 *     ^args[
 *       ^param[event]{
 *       }
 *       ^param[linkNode HTMLElement]{
 *         The actual link HTML element
 *       }
 *       ^param[linkUrl String]{
 *         The URL that would be navigated to.
 *       }
 *       ^param[linkText String]{
 *         The text associated with the link.
 *       }
 *     ]
 *   ]]{
 *     The function to invoke when (sanitized) hyperlinks are clicked on.
 *     Currently, the links are always 'a' tags, but we might support image
 *     maps in the future.  (Or permanently rule them out.)
 *   }
 * ]
 */
function createAndInsertIframeForContent(htmlStr, parentNode, beforeNode,
                                         interactiveMode,
                                         clickHandler) {
  var viewportWidth = Cards._containerNode.offsetWidth,
      viewportHeight = Cards._containerNode.offsetHeight - 140;

  var viewport = document.createElement('div');
  viewport.setAttribute(
    'style',
    'overflow: hidden; ' +
    // we want to be able to move the iframe in its own coordinate space
    // inside of us.
    'position: relative; ' +
    'width: ' + viewportWidth + 'px; ' +
    'height: ' + viewportHeight + 'px;'
  );
  var interacter = document.createElement('div');
  interacter.setAttribute(
    'style',
    'position: absolute; top: 0; left: 0; width: 100%; height: 100%; ' +
    '-moz-user-select: none;');

  var iframe = document.createElement('iframe');

  iframe.setAttribute('sandbox', 'allow-same-origin');
  // Styling!
  // - no visible border
  // - we want to approximate seamless, so turn off overflow and we'll resize
  //   things below.
  // - 600px wide; this is approximately the standard expected width for HTML
  //   emails.
  iframe.setAttribute(
    'style',
    'position: absolute; ' +
    'border-width: 0px; ' +
    'overflow: hidden; '
//    'pointer-events: none; ' +
//    '-moz-user-select: none; ' +
//    'width: ' + scrollWidth + 'px; ' +
//    'height: ' + viewportHeight + 'px;'
  );

  //iframe.setAttribute('srcdoc', htmlStr);
  viewport.appendChild(iframe);
  parentNode.insertBefore(viewport, beforeNode);

  // we want this fully synchronous so we can know the size of the document
  iframe.contentDocument.open();
  iframe.contentDocument.write('<!doctype html><html><head>');
  iframe.contentDocument.write(DEFAULT_STYLE_TAG);
  iframe.contentDocument.write('</head><body>');
  // (currently our sanitization only generates a body payload...)
  iframe.contentDocument.write(htmlStr);
  iframe.contentDocument.write('</body>');
  iframe.contentDocument.close();
  var iframeBody = iframe.contentDocument.body;
  var scrollHeight = iframeBody.scrollHeight;

  var newsletterMode = iframeBody.scrollWidth > viewportWidth;

  if (newsletterMode) {
    var scrollWidth = iframeBody.scrollWidth;
    viewport.appendChild(interacter);

    if (interactiveMode === 'interactive') {
      // setting iframe.style.height is not sticky, so be heavy-handed:
      iframe.setAttribute(
        'style',
        'border-width: 0px; overflow: hidden; ' +
        'transform-origin: top left; ' +
        'width: ' + scrollWidth + 'px; ' +
        'height: ' + scrollHeight + 'px;');

      var currentPhoto = iframe;
      var photoState =
        new PhotoState(iframe, scrollWidth, scrollHeight,
                       viewportWidth, viewportHeight);

      var lastScale = photoState.scale, scaleMode = 0;
      var detector = new GestureDetector(interacter);
      // We don't need to ever stopDetecting since the closures that keep it
      // alive are just the event listeners on the iframe.
      detector.startDetecting();
      viewport.addEventListener('pan', function(event) {
        photoState.pan(event.detail.relative.dx,
                       event.detail.relative.dy);
      });
      viewport.addEventListener('dbltap', function(e) {
        var scale = photoState.scale;

        currentPhoto.style.MozTransition = 'all 100ms linear';
        currentPhoto.addEventListener('transitionend', function handler() {
          currentPhoto.style.MozTransition = '';
          currentPhoto.removeEventListener('transitionend', handler);
        });

        if (lastScale === scale) {
          scaleMode = (scaleMode + 1) % 3;
          switch (scaleMode) {
            case 0:
              scale = photoState.baseScale;
              break;
            case 1:
              scale = 1;
              break;
            case 2:
              scale = 2;
              break;
          }
          photoState.scale = lastScale = scale;
          photoState._reposition();
        }
        else {
          if (scale > 1)      // If already zoomed in,
            scale = 1 / scale;  // zoom out to starting scale
          else                           // Otherwise
            scale = 2;                   // Zoom in by a factor of 2
          photoState.zoom(scale, e.detail.clientX, e.detail.clientY);
        }
      });
      viewport.addEventListener('transform', function(e) {
        photoState.zoom(e.detail.relative.scale,
                        e.detail.midpoint.clientX,
                        e.detail.midpoint.clientY);
      });
    }
    else {
      var scale = Math.min(1, viewportWidth / scrollWidth);
      iframe.setAttribute(
        'style',
        'border-width: 0px; ' +
        ((scale < 1) ?
          ('transform-origin: top left; transform: scale(' + scale + '); ') :
          '') +
        // these dimensions are pre-scaling and affect what gets transformed,
        // but we will still impact the page layout so...
        'width: ' + scrollWidth + 'px; ' +
        'height: ' + scrollHeight + 'px;');
      // ...so we want the viewport to clip appropriately
      viewport.setAttribute(
        'style',
        'position: relative; ' +
        'overflow: hidden; ' +
        'width: ' + viewportWidth + 'px; ' +
        'height: ' + Math.ceil(scrollHeight * scale) + 'px;');
    }
  }
  else {
    viewport.removeAttribute('style');
    // setting iframe.style.height is not sticky, so be heavy-handed:
    iframe.setAttribute(
      'style',
      'border-width: 0px; ' +
      '-moz-user-select: none; ' +
      'width: ' + viewportWidth + 'px; ' +
      'height: ' + scrollHeight + 'px;');
  }

  if (clickHandler)
    bindSanitizedClickHandler(iframe.contentDocument.body, clickHandler, null);

  return iframe;
}

function bindSanitizedClickHandler(node, clickHandler, topNode) {
  node.addEventListener(
    'click',
    function clicked(event) {
      var node = event.originalTarget;
      while (node !== topNode) {
        if (node.nodeName === 'A') {
          if (node.hasAttribute('ext-href')) {
            clickHandler(event, node, node.getAttribute('ext-href'),
                         node.textContent);
            event.preventDefault();
            event.stopPropagation();
            return;
          }
        }
        node = node.parentNode;
      }
    });
}

// figure out the size and position of an image based on its size
// and the screen size.
function fitImage(photoWidth, photoHeight, viewportWidth, viewportHeight) {
  var scalex = viewportWidth / photoWidth;
  // fit width for now.
  var scale = scalex;

  // Set the image size and position
  var width = Math.floor(photoWidth * scale);
  var height = Math.floor(photoHeight * scale);

  return {
    width: width,
    height: height,
    left: 0, //Math.floor((viewportWidth - width) / 2),
    top: 0, //Math.floor((viewportHeight - height) / 2),
    scale: scale
  };
}

/*
 * This class encapsulates the zooming and panning functionality for
 * the gallery app and maintains the current size and position of the
 * currently displayed photo as well as the transition state (if any)
 * between photos.
 */
function PhotoState(img, width, height, viewportWidth, viewportHeight) {
  // The <img> element that we manipulate
  this.img = img;

  // The actual size of the photograph
  this.photoWidth = width;
  this.photoHeight = height;
  this.viewportWidth = viewportWidth;
  this.viewportHeight = viewportHeight;

  // Do all the calculations
  this.reset();
}

// An internal method called by reset(), zoom() and pan() to
// set the size and position of the image element.
PhotoState.prototype._reposition = function() {
  this.width = this.photoWidth * this.scale;
  this.height = this.photoHeight * this.scale;

  if (this.width <= this.viewportWidth)
    this.left = 0;
  if (this.height <= this.viewportHeight)
    this.top = 0;

  var transform = 'translate(' + this.left + 'px, ' +
                                  this.top + 'px) scale(' + this.scale + ')';
  this.img.style.transform = transform;
};

// Compute the default size and position of the photo
PhotoState.prototype.reset = function() {
  // Compute the default size and position of the image
  var fit = fitImage(this.photoWidth, this.photoHeight,
                     this.viewportWidth, this.viewportHeight);
  this.baseScale = fit.scale;
  this.width = fit.width;
  this.height = fit.height;
  this.top = fit.top;
  this.left = fit.left;

  // Start off with no zoom
  this.scale = this.baseScale;

  // We start off with no swipe from left to right
  this.swipe = 0;

  this._reposition(); // Apply the computed size and position
};

// Zoom in by the specified factor, adjusting the pan amount so that
// the image pixels at (centerX, centerY) remain at that position.
// Assume that zoom gestures can't be done in the middle of swipes, so
// if we're calling zoom, then the swipe property will be 0.
PhotoState.prototype.zoom = function(scale, centerX, centerY) {
  // Never zoom in farther than 2x the native resolution of the image
  if (this.baseScale * this.scale * scale > 2) {
    scale = 2 / (this.baseScale * this.scale);
  }
  // And never zoom out to make the image smaller than it would normally be
  else if (this.scale * scale < 1) {
    scale = 1 / this.scale;
  }

  this.scale = this.scale * scale;

  // Change the size of the photo
  this.width = Math.floor(this.photoWidth * this.baseScale * this.scale);
  this.height = Math.floor(this.photoHeight * this.baseScale * this.scale);

  // centerX and centerY are in viewport coordinates.
  // These are the photo coordinates displayed at that point in the viewport
  var photoX = centerX - this.left;
  var photoY = centerY - this.top;

  // After zooming, these are the new photo coordinates.
  // Note we just use the relative scale amount here, not this.scale
  var photoX = Math.floor(photoX * scale);
  var photoY = Math.floor(photoY * scale);

  // To keep that point still, here are the new left and top values we need
  this.left = centerX - photoX;
  this.top = centerY - photoY;

  // Now make sure we didn't pan too much: If the image fits on the
  // screen, center it. If the image is bigger than the screen, then
  // make sure we haven't gone past any edges
  if (this.width <= this.viewportWidth) {
    this.left = (this.viewportWidth - this.width) / 2;
  }
  else {
    // Don't let the left of the photo be past the left edge of the screen
    if (this.left > 0)
      this.left = 0;

    // Right of photo shouldn't be to the left of the right edge
    if (this.left + this.width < this.viewportWidth) {
      this.left = this.viewportWidth - this.width;
    }
  }

  if (this.height <= this.viewportHeight) {
    this.top = (this.viewportHeight - this.height) / 2;
  }
  else {
    // Don't let the top of the photo be below the top of the screen
    if (this.top > 0)
      this.top = 0;

    // bottom of photo shouldn't be above the bottom of screen
    if (this.top + this.height < this.viewportHeight) {
      this.top = this.viewportHeight - this.height;
    }
  }

  this._reposition();
};

PhotoState.prototype.pan = function(dx, dy) {
  // Handle panning in the y direction first, since it is easier.
  // Don't pan in the y direction if we already fit on the screen
  if (this.height > this.viewportHeight) {
    this.top += dy;

    // Don't let the top of the photo be below the top of the screen
    if (this.top > 0)
      this.top = 0;

    // bottom of photo shouldn't be above the bottom of screen
    if (this.top + this.height < this.viewportHeight)
      this.top = this.viewportHeight - this.height;
  }

  // Now handle the X dimension. In this case, we have to handle panning within
  // a zoomed image, and swiping to transition from one photo to the next
  // or previous.
  if (this.width <= this.viewportWidth) {
    // In this case, the photo isn't zoomed in, so we're just doing swiping
    this.swipe += dx;
  }
  else {
    this.left += dx;

    // If this would take the left edge of the photo past the
    // left edge of the screen, then we've got to do a swipe
    if (this.left > 0) {
      this.left = 0;
    }

    // Or, if this would take the right edge of the photo past the
    // right edge of the screen, then we've got to swipe the other way
    if (this.left + this.width < this.viewportWidth) {
      this.left = this.viewportWidth - this.width;
    }
  }

  this._reposition();
};
