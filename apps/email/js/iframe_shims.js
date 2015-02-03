define(['shared/js/gesture_detector'], function() {

'use strict';

var GestureDetector = window.GestureDetector;

/**
 * Style tag to put in the header of the body.  We currently only support inline
 * styles in general, so these are primarily overrides and defaults.
 */
var DEFAULT_STYLE_TAG =
  '<style type="text/css">\n' +
  // ## blockquote
  // blockquote per html5: before: 1em, after: 1em, start: 4rem, end: 4rem
  'blockquote {' +
  'margin: 0; ' +
  // so, this is quoting styling, which makes less sense to have in here.
  '-moz-border-start: 0.2rem solid gray;' +
  // padding-start isn't a thing yet, somehow.
  'padding: 0; -moz-padding-start: 0.5rem; ' +
  '}\n' +
  // Give the layout engine an upper-bound on the width that's arguably
  // much wider than anyone should find reasonable, but might save us from
  // super pathological cases.
  'html, body { max-width: 120rem; word-wrap: break-word;' +
  // don't let the html/body grow the scrollable area.  Also, it's not clear
  // overflow: hidden actually works in either of these cases, but I did most of
  // the development and testing where things worked with the overflow: hidden
  // present and I'm worried about removing it now.
  ' overflow: hidden; padding: 0; margin: 0; }\n' +
  // pre messes up wrapping very badly if left to its own devices
  'pre { white-space: pre-wrap; word-wrap: break-word; }\n' +
  '.moz-external-link { color: #00aac5; cursor: pointer; }\n' +
  '</style>';

/**
 * Tweakable display settings for timings.  If you want to mess with these
 * values from the debugger, do requirejs('iframe_shims').iframeShimsOpts.
 *
 * All current poll timeouts (circa Sep 19, 2014) are ballpark figures arrived
 * at on a Flame device.  We could probably tighten things up if need be.
 */
var iframeShimsOpts = {
  /**
   * What is the minimum delay between changing the transform setting?  You
   * might think that we want this low, but because we experience memory-spikes
   * if we modify the transform from a setTimeout, we currently want this
   * to be short enough that a human would be unlikely to actually re-trigger
   * while this is active.  It's handy to keep around to turn it way up so that
   * we can reproduce the setTimeout problem for debugging, however.
   */
  zoomDelayMS: 200,
  /**
   * What should our initial scale-factor be?  If 1, it's 100%.  If null, we use
   * the fit-page-width value.
   */
  initialScale: null,
  /**
   * How many times should we poll the dimensions of the HTML iframe before
   * ceasing?  This is used both for initial display and after "display external
   * images" or "display embedded images" is triggered.
   */
  resizeLimit: 4,
  /**
   * After first creating the document, how long should we wait before we start
   * to poll?  Note that the "load" event doesn't work for us and
   * "DOMContentLoaded" turns out to be too early.  Even though we forbid remote
   * resources, it seems like our fonts or something can still need to
   * asynchronously load or the HTML5 parser no longer synchronously lays
   * everything out for us.
   */
  initialResizePollIntervalMS: 200,
  /**
   * If we polled and there was no change in dimensions, how long should we wait
   * before our next poll?  The idea is you might make this shorter in order to
   * make sure we respond sooner / faster.
   */
  noResizePollIntervalMS: 250,
  /**
   * If we polled and there was a change in dimensions, how long should we wait
   * before our next poll?  The idea is you might make this longer so as to
   * avoid churn if there is something going on that would affect sizing.
   */
  didResizePollIntervalMS: 300,
  /**
   * How long should we wait until after we get the last picture "load" event
   * before polling?  Note that in this case we will have reset our resize count
   * back to 0 so resizeLimit will need to be hit again.  The waiting is
   * accomplished by constantly resetting the timeout, so extremely small values
   * are dangerous here.  Also, experience has shown that when we previously
   * tried to update our size immediately or near-immediately getting the final
   * load event, we still would be too early.
   */
  pictureDelayPollIntervalMS: 200
};

/**
 * Logic to help with creating, populating, and handling events involving our
 * HTML message-disply iframes.
 *
 * ## UX Goals ##
 *
 * We want a continuous scrolling experience.  The message's envelope and the
 * HTML body should scroll continuously.
 *
 * Pinch-and-zoom: We want the user to be able to zoom in and out on the message
 * in a responsive fashion without crashing the app.  We also want to start
 * with fit-to-page-width because when the email is wider than the screen it
 * tends to look stupid.
 *
 * ## Security ##
 *
 * All HTML content is passed through a white-list-based sanitization process,
 * but we still want the iframe so that:
 *
 * - We can guarantee the content can't escape out into the rest of the page.
 * - We can both avoid the content being influenced by our stylesheets as well
 *   as to allow the content to use inline "style" tags without any risk to our
 *   styling.
 *
 * Our iframe sandbox attributes (not) specified and rationale are as follows.
 * Note that "NO" means we don't specify the string in our sandbox.
 * - "allow-same-origin": YES.  We do this because in order to touch the
 *   contentDocument we need to live in the same origin.  Because scripts are
 *   not enabled in the iframe this is not believed to have any meaningful
 *   impact.
 *
 *   In the future when we are able to do nested APZ stuff, what we
 *   will likely do is have two layers of iframes.  The outer mozbrowser iframe
 *   will have its own origin but be running (only) our code.  It will talk to
 *   us via postMessage.  Then it will have a sandboxed iframe where script is
 *   disabled but that lives in the same origin.  So our code in that origin
 *   can then poke at things as needed.
 *
 * - "allow-scripts": NO.  We never ever want to let scripts from an email
 *   run.  And since we are setting "allow-same-origin", even if we did want
 *   to allow scripts we *must not* while that setting is on.  Our CSP should
 *   limit the use of scripts if the iframe has the same origin as us since
 *   everything in the iframe should qualify as
 *
 * - "allow-top-navigation": NO.  The iframe should not navigate if the user
 *   clicks on a link.  Note that the current plan is to just capture the
 *   click event and trigger the browse event ourselves so we can show them the
 *   URL, so this is just extra protection.
 *
 * - "allow-forms": NO.  We already sanitize forms out, so this is just extra
 *   protection.
 *
 * - "allow-popups": NO.  We would never want this, but it also shouldn't be
 *   possible to even try to trigger this (scripts are disabled and sanitized,
 *   links are sanitized to forbid link targets as well as being nerfed), so
 *   this is also just extra protection.
 *
 * ## Platform Limitations: We Got'em! ##
 *
 * ### Seamless iframes ###
 *
 * Gecko does not support seamless iframes, so we have to manually make sure
 * that we set the iframe's outer size to what its inner size is.  Because
 * layout is asynchronous (even in the document.write case, apparently), we end
 * up polling after any notable event that might affect layout.
 *
 * I did experiment with the gecko-specific 'overflow' event a bit.  Although I
 * suspect there were complicating factors, I do believe I ran into trouble with
 * it since it is an event that is only generated each time you transition from
 * overflow and back to underflow.  So if you get an overflow event but didn't
 * actually cause yourself to go back to underflow (like if you have weird CSS
 * maybe doing something like setting a width to 105% or something?), you won't
 * get another overflow event.
 *
 * ### Pinch-and-Zoom ###
 *
 * Gecko supports Asynchronous Pan-and-Zoom (APZ), but we can't use it for our
 * HTML pages right now because it can only be used for the root of an
 * app/browser window.  And there is no support for nested subprocesses yet.
 * When that stuff happens, we want to just use that instead of doing manual
 * pinchy-zoomy support.
 *
 * We fake some level of usable pinch-zoom by using a "transform: scale()" on
 * our iframe.  Because the transform is a painting thing and not a layout thing
 * we have to wrap the iframe in a "viewport" div that provides our effective
 * DOM size for scrolling.  We could maybe use better nomenclature for this and
 * maybe even stop nesting the iframe in the viewport.  (The current structure
 * is somewhat historical from when the viewport div actually was clipping the
 * iframe.)
 *
 * For example, let's say our iframe is internally 580px by 1000px but we are
 * displaying it at 50% scale so it's 290px by 500px.  In that case the iframe's
 * size still needs to be 580px by 1000px, but the viewport needs to be 290px by
 * 500px so that the scrolling works out right.  Otherwise you end up with lots
 * of white space at the right and bottom.
 *
 * Likewise if we are zooming it to 200% we need the viewport's dimensions to be
 * doubled so that there is the extra space to scroll into.
 *
 * ### Transform Performance / Memory Limitations ###
 *
 * We can't actually mess with "transform: scale()" in realtime.  This is
 * primarily because it results in memory spikes that can get our process killed
 * as the graphics subsystem's logic glitches and ends up allocating graphics
 * buffers for the entirety of the HTML document, even the parts not on the
 * screen.  But a secondary concern is that especially when it's drawing too
 * much, it can take a very long time to scale.
 *
 * So we've implemented a "quantized" scaling approach where we have four zoom
 * levels: "fit-to-width" (which is <= 1), 100%, 150%, and 200%.  Pinching to
 * zoom in moves you to the right in the list, pinching to zoom out moves you
 * out in the list.
 *
 * We use the shared gesture_detector code to figure out what's going on.
 * Specifically, once the scale in absolute terms is clearly a zoom in or a zoom
 * out, we trigger the scale change and then ignore the rest of the gesture
 * until a new gesture occurs.  This is arguably intuitive, but more importantly
 * it avoids the problems we had in the past where you could just absurdly
 * oscillate your pinchers and kill the app as we swamped the system with a
 * gazillion transforms.
 *
 *
 * ## Email types and Pinchy-Zoomy time ##
 *
 * There are two types of HTML e-mails:
 *
 * 1) E-mails written by humans which are basically unstructured prose plus
 *    quoting.  The biggest problems these face are deep quoting causing
 *    blockquote padding to cause text to have very little screen real estate.
 *
 * 2) Newsletter style e-mails which are structured and may have multiple
 *    columns, grids of images and stuff like that.  They historically have
 *    tended to assume a size of about 600px.  However, it's increasingly common
 *    to be smart and use media queries.  Unfortunately, we don't support media
 *    queries right now and so it's very likely we'll end up in the desktop
 *    case.
 *
 * We originally treated these types of mails differently, but over time it
 * became clear that this was not a great strategy, especially since showing
 * external images/etc. could push a "normal" email into being a "newsletter"
 * email.  We also intentionally would trigger a layout with relaxed constraints
 * then try and tighten them up.
 *
 * Our (new) strategy is to create the iframe so that it fits in the width we
 * have available.  On flame devices that's 290px right now, though the actual
 * size is discovered at runtime and doesn't matter.
 *
 * As discussed above, we poll the scrollWidth and scrollHeight for a while to
 * make sure that it stabilizes.  The trick is that if something is a newsletter
 * it will end up wanting to be wider than our base/screen 290px.  We will
 * detect this and update our various dimensions, including our "fit-to-width"
 * scale.  Since we pick 100% or the computed fit-to-width scale, whichever is
 * smaller, the non-newsletter case is just us using a fit-to-width zoom factor
 * that just happens to be 100%.  The newsletter case is when fit-to-width is
 * less than 100%.
 *
 * ## Bugs / Doc Links ##
 *
 * - Font-inflation is a thing.  It's not clear it affects us:
 *   http://jwir3.wordpress.com/2012/07/30/font-inflation-fennec-and-you/
 *
 * - iframe "seamless" doesn't work, so we manually need to poke stuff:
 *   https://bugzilla.mozilla.org/show_bug.cgi?id=80713
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
function createAndInsertIframeForContent(htmlStr, scrollContainer,
                                         parentNode, beforeNode,
                                         interactiveMode,
                                         clickHandler) {
  // We used to care about running in Firefox nightly.  This was a fudge-factor
  // to account for its stupid scroll-bars that could not be escaped.  If you
  // are using nightly, maybe it makes sense to turn this back up.  Or maybe we
  // leave this zero and style the scrollbars to be overlays in b2g.  Who knows.
  var scrollPad = 0;

  var viewportWidth = parentNode.offsetWidth - scrollPad;
  var viewport = document.createElement('div');
  viewport.setAttribute(
    'style',
    'padding: 0; border-width: 0; margin: 0; ' +
    //'position: relative; ' +
    'overflow: hidden;');
  viewport.style.width = viewportWidth + 'px';
  // leave height unsized for now.

  var iframe = document.createElement('iframe');

  iframe.setAttribute('sandbox', 'allow-same-origin');
  // Styling!
  iframe.setAttribute(
    'style',
    // no border! no padding/margins.
    'padding: 0; border-width: 0; margin: 0; ' +
    // I don't think this actually stops the iframe from being internally
    // scrolly, but I wouldn't remove this without some testing...
    'overflow: hidden; ' +
    // When scaling, use the top-left for math sanity.
    'transform-origin: top ' +
    (document.documentElement.dir === 'rtl' ? 'right' : 'left') + '; ' +
    // The iframe does not want to process its own clicks!  that's what
    // bindSanitizedClickHandler is for!
    'pointer-events: none;');
  if (iframeShimsOpts.tapTransform) {
    iframe.style.transform = 'scale(1)';
  }
  // try and get the page to size itself to our actually available space.
  iframe.style.width = viewportWidth + 'px';

  // We need to be linked into the DOM tree to be able to write to our document
  // and have CSS and improtant things like that work.
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

  // NOTE.  This has gone through some historical iterations here AKA is
  // evolved.  Technically, getBoundingClientRect() may be superior since it can
  // have fractional parts.  I believe I tried using it with
  // iframe.contentDocument.documentElement and it ended up betraying me by
  // reporting clientWidth/clientHeight instead of scrollWidth, whereas
  // scrollWidth/scrollHeight worked better.  However I was trying a lot of
  // things; I might just have been confused by some APZ glitches where panning
  // right would not work immediately after zooming and you'd have to pan left
  // first in order to pan all the way to the newly expaned right.  What we know
  // right now is this gives the desired behaviour sizing behaviour.
  var scrollWidth = iframeBody.scrollWidth;
  var scrollHeight = iframeBody.scrollHeight;

  // fit-to-width scale.
  var baseScale = Math.min(1, viewportWidth / scrollWidth),
      // If there's an initial scale, use that, otherwise fall back to the base
      // (fit-to-width) scale
      lastRequestedScale = iframeShimsOpts.initialScale || baseScale,
      scale = lastRequestedScale,
      lastDoubleTapScale = scale,
      scaleMode = 0;

  viewport.style.width = Math.ceil(scrollWidth * scale) + 'px';
  viewport.style.height = Math.ceil(scrollHeight * scale) + 'px';

  // setting iframe.style.height is not sticky, so be heavy-handed.
  // Also, do not set overflow: hidden since we are already clipped by our
  // viewport or our containing card and Gecko slows down a lot because of the
  // extra clipping.
  iframe.style.width = scrollWidth + 'px';

  var resizeFrame = function(why) {
    if (why === 'initial' || why === 'poll') {
      scrollWidth = iframeBody.scrollWidth;
      scrollHeight = iframeBody.scrollHeight;
      // the baseScale will almost certainly have changed
      var oldBaseScale = baseScale;
      baseScale = Math.min(1, viewportWidth / scrollWidth);
      if (scale === oldBaseScale) {
        scale = baseScale;
      }
      iframe.style.width = scrollWidth + 'px';
      console.log('iframe_shims: recalculating height / width because', why,
                  'sw', scrollWidth, 'sh', scrollHeight, 'bs', baseScale);
    }
    console.log('iframe_shims: scale:', scale);
    iframe.style.transform = 'scale(' + scale + ')';
    iframe.style.height =
      ((scrollHeight * Math.max(1, scale)) + scrollPad) + 'px';
    viewport.style.width = Math.ceil(scrollWidth * scale) + 'px';
    viewport.style.height = (Math.ceil(scrollHeight * scale) + scrollPad) +
                              'px';
  };
  resizeFrame('initial');

  var activeZoom = false, lastCenterX, lastCenterY;
  /**
   * Zoom to the given scale, eventually.  If we are actively zooming or have
   * recently zoomed and need for various async things to catch up, we will
   * wait a bit before actually zooming to that scale.  We latch the most recent
   * value in all cases.
   */
  var zoomFrame = function(newScale, centerX, centerY) {
    // There is nothing to do if we are actually already at this scale level.
    // (Note that there still is something to do if newScale ===
    //  lastRequestedScale, though!)
    if (newScale === scale) {
      return;
    }
    lastRequestedScale = newScale;
    lastCenterX = centerX;
    lastCenterY = centerY;
    if (activeZoom) {
      return;
    }
    activeZoom = true;

    // Our goal is to figure out how to scroll the window so that the
    // location on the iframe corresponding to centerX/centerY maintains
    // its position after zooming.

    // centerX, centerY  are in screen coordinates.  Offset coordinates of
    // the scrollContainer are screen (card) relative, but those of things
    // inside the scrollContainer exist within that coordinate space and
    // do not change as we scroll.
    // console.log('----ZOOM from', scale, 'to', newScale);
    // console.log('cx', centerX, 'cy', centerY,
    //             'vl', viewport.offsetLeft,
    //             'vt', viewport.offsetTop);
    // console.log('sl', scrollContainer.offsetLeft,
    //             'st', scrollContainer.offsetTop);

    // Figure out how much of our iframe is scrolled off the screen.
    var iframeScrolledTop = scrollContainer.scrollTop - extraHeight,
        iframeScrolledLeft = scrollContainer.scrollLeft;

    // and now convert those into iframe-relative coords
    var ix = centerX + iframeScrolledLeft,
        iy = centerY + iframeScrolledTop;

    var scaleDelta = (newScale / scale);

    var vertScrollDelta = Math.ceil(iy * scaleDelta),
        horizScrollDelta = Math.ceil(ix * scaleDelta);

    scale = newScale;
    resizeFrame('zoom');
    scrollContainer.scrollTop = vertScrollDelta + extraHeight - centerY;
    scrollContainer.scrollLeft = horizScrollDelta - centerX;

    // Right, so on a Flame device I'm noticing serious delays in getting all
    // this painting and such done, so it seems like we really want to up this
    // constant to let any async stuff happen and to give the system some time
    // to recover and maybe run a GC.  Because there is a very real chance of
    // someone happilly zooming in-and-out over and over to cause us to hit a
    // GC ceiling.
    window.setTimeout(clearActiveZoom, iframeShimsOpts.zoomDelayMS);
  };
  var clearActiveZoom = function() {
    activeZoom = false;
    if (scale !== lastRequestedScale) {
      window.requestAnimationFrame(function() {
        // This is almost certainly going to cause a memory spike, so log it.
        // ugh.
        console.log('delayed zoomFrame timeout, probably causing a mem-spike');
        zoomFrame(lastRequestedScale, lastCenterX, lastCenterY);
      });
    }
  };

  // See giant block comment and timer constants for a description of our
  // polling logic and knobs.
  var resizePollerTimeout = null;
  // track how many times we've checked.  We want to bound this for battery life
  // purposes and also to avoid weird sad cases.
  var resizePollCount = 0;
  var pollResize = function() {
    var opts = iframeShimsOpts;
    var desiredScrollWidth = iframeBody.scrollWidth;
    var desiredScrollHeight = iframeBody.scrollHeight;
    var resized = false;
    // if we need to grow, grow.  (for stability reasons, we never want to
    // shrink since it could lead to infinite oscillation)
    if (desiredScrollWidth > scrollWidth ||
        desiredScrollHeight > scrollHeight) {
      resizeFrame('poll');
      resized = true;
    }

    if (++resizePollCount < opts.resizeLimit) {
      // we manually schedule ourselves for slack purposes
      resizePollerTimeout = window.setTimeout(
        pollResize,
        resized ? opts.didResizePollIntervalMS : opts.noResizePollIntervalMS);
    } else {
      resizePollerTimeout = null;
    }
  };
  resizePollerTimeout = window.setTimeout(
    pollResize, iframeShimsOpts.initialResizePollIntervalMS);

  var iframeShims = {
    iframe: iframe,
    // (This is invoked each time an image "load" event fires.)
    resizeHandler: function() {
      resizePollCount = 0;
      // Reset the existing timeout because many emails with external images
      // will have a LOT of external images so it could take a while for them
      // all to load.
      if (resizePollerTimeout) {
        window.clearTimeout(resizePollerTimeout);
      }
      resizePollerTimeout = window.setTimeout(
        pollResize, iframeShimsOpts.pictureDelayPollIntervalMS);
    }
  };

  if (interactiveMode !== 'interactive') {
    return iframeShims;
  }

  var detectorTarget = viewport;
  var detector = new GestureDetector(detectorTarget);
  // We don't need to ever stopDetecting since the closures that keep it
  // alive are just the event listeners on the iframe.
  detector.startDetecting();
  // Using tap gesture event for URL link handling.
  if (clickHandler) {
    viewport.removeEventListener('click', clickHandler);
    bindSanitizedClickHandler(viewport, clickHandler, null, iframe);
  }

  var title = document.getElementsByClassName('msg-reader-header')[0];
  var header = document.getElementsByClassName('msg-envelope-bar')[0];
  var extraHeight = title.clientHeight + header.clientHeight;

  // -- Double-tap zoom idiom
  detectorTarget.addEventListener('dbltap', function(e) {
    var newScale = scale;
    if (lastDoubleTapScale === lastRequestedScale) {
      scaleMode = (scaleMode + 1) % 3;
      switch (scaleMode) {
        case 0:
          newScale = baseScale;
          break;
        case 1:
          newScale = 1;
          break;
        case 2:
          newScale = 2;
          break;
      }
      console.log('already in double-tap, deciding on new scale', newScale);
    }
    else {
      // If already zoomed in, zoom out to starting scale
      if (lastRequestedScale > 1) {
        newScale = lastDoubleTapScale;
        scaleMode = 0;
      }
      // Otherwise zoom in to 2x
      else {
        newScale = 2;
        scaleMode = 2;
      }
      console.log('user was not in double-tap switching to double-tap with',
                  newScale);
    }
    lastDoubleTapScale = newScale;
    try {
      zoomFrame(newScale, e.detail.clientX, e.detail.clientY);
    } catch (ex) {
      console.error('zoom bug!', ex, '\n', ex.stack);
    }
  });

  // -- quantized pinchy-zoomy idiom
  // track whether we've already transformed this transform event cycle
  var transformDone = false;
  // reset when the transform has ended.  (there is no transformbegin event)
  detectorTarget.addEventListener('transformend', function(e) {
    transformDone = false;
  });
  detectorTarget.addEventListener('transform', function(e) {
    // if we already zoomed in/out this time, then just bail
    if (transformDone) {
      return;
    }

    var scaleFactor = e.detail.absolute.scale;
    var newScale = lastRequestedScale;
    // once it's clear this is a zoom-in, we can handle
    if (scaleFactor > 1.15) {
      transformDone = true;
      // Zoom in if we can.
      // (Note that if baseScale is 1, we will properly go direct to 1.5 from
      // baseScale.  Hooray!)
      if (lastRequestedScale < 1) {
        newScale = 1;
      }
      else if (lastRequestedScale < 1.5) {
        newScale = 1.5;
      }
      else if (lastRequestedScale < 2) {
        newScale = 2;
      }
      else {
        return;
      }
    }
    else if (scaleFactor < 0.9) {
      transformDone = true;
      if (lastRequestedScale > 1.5) {
        newScale = 1.5;
      }
      else if (lastRequestedScale > 1) {
        newScale = 1;
      }
      else if (lastRequestedScale > baseScale) {
        newScale = baseScale;
      }
      else {
        return;
      }
    }
    else {
      return;
    }
    zoomFrame(
      newScale,
      e.detail.midpoint.clientX, e.detail.midpoint.clientY);
  });


  return iframeShims;
}

function bindSanitizedClickHandler(target, clickHandler, topNode, iframe) {
  var eventType, node;
  // Variables that only valid for HTML type mail.
  var root, title, header, attachmentsContainer, msgBodyContainer,
      titleHeight, headerHeight, attachmentsHeight,
      msgBodyMarginTop, msgBodyMarginLeft, attachmentsMarginTop,
      iframeDoc, inputStyle, loadBar, loadBarHeight;
  // Tap gesture event for HTML type mail and click event for plain text mail
  if (iframe) {
    root = document.getElementsByClassName('scrollregion-horizontal-too')[0];
    title = document.getElementsByClassName('msg-reader-header')[0];
    header = document.getElementsByClassName('msg-envelope-bar')[0];
    attachmentsContainer =
      document.getElementsByClassName('msg-attachments-container')[0];
    loadBar = document.getElementsByClassName('msg-reader-load-infobar')[0];
    msgBodyContainer = document.getElementsByClassName('msg-body-container')[0];
    inputStyle = window.getComputedStyle(msgBodyContainer);
    msgBodyMarginTop = parseInt(inputStyle.marginTop);
    msgBodyMarginLeft = parseInt(inputStyle.marginLeft);
    titleHeight = title.clientHeight;
    headerHeight = header.clientHeight;
    eventType = 'tap';
    iframeDoc = iframe.contentDocument;
  } else {
    eventType = 'click';
  }
  target.addEventListener(
    eventType,
    function clicked(event) {
      if (iframe) {
        // Because the "show (external) images" loadBar could be opened or
        // closed depending on what the user does relative to this click, get
        // the client height at the time of click.
        loadBarHeight = loadBar.clientHeight;

        // Because the attachments are updating late,
        // get the client height while clicking iframe.
        attachmentsHeight = attachmentsContainer.clientHeight;
        inputStyle = window.getComputedStyle(attachmentsContainer);
        attachmentsMarginTop =
          (attachmentsHeight) ? parseInt(inputStyle.marginTop) : 0;
        var dx, dy;
        var transform = iframe.style.transform || 'scale(1)';
        var scale = transform.match(/(\d|\.)+/g)[0];

        // When in rtl mode, scroll is relative to right side, but the
        // document inside the iframe is ltr based, since it does not set a
        // document-wide dir setting and instead the DOM content inside the
        // message manages the dir itself.
        if (document.dir === 'rtl') {
          dx = event.detail.clientX - msgBodyMarginLeft +
               // The scrollLeft is calculated from the right side, with right
               // being zero and left being a negative value from the *right*
               // edge of the element. So to get the x value from the left, need
               // the difference of scrollWidth from scrollLeft (which is a
               // negative value), and also subtracting out the width of the
               // element to get the value relative to the *left* side of the
               // element.
               root.scrollWidth + root.scrollLeft - root.clientWidth;
        } else {
          dx = event.detail.clientX + root.scrollLeft - msgBodyMarginLeft;
        }

        dy = event.detail.clientY + root.scrollTop -
             titleHeight - headerHeight - loadBarHeight -
             attachmentsHeight - attachmentsMarginTop - msgBodyMarginTop;

        node = iframeDoc.elementFromPoint(dx / scale, dy / scale);

        // Uncomment to show a red square on where the code thinks the tap
        // occurred in the iframe. Useful for debugging.
        // var temp = iframeDoc.createElement('div');
        // temp.style.position = 'absolute';
        // temp.style.overflow = 'hidden';
        // temp.style.top = ((dy / scale) - 5) + 'px';
        // temp.style.left = ((dx / scale) - 5) + 'px';
        // temp.style.width = '10px';
        // temp.style.height = '10px';
        // temp.style.backgroundColor = 'red';
        // iframeDoc.body.appendChild(temp);
      } else {
        node = event.originalTarget;
      }
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

return {
  createAndInsertIframeForContent: createAndInsertIframeForContent,
  bindSanitizedClickHandler: bindSanitizedClickHandler,
  iframeShimsOpts: iframeShimsOpts
};

});
