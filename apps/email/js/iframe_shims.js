/*jshint browser: true */
/*global console, define */

define(['shared/js/gesture_detector'], function() {

'use strict';

var GestureDetector = window.GestureDetector;

/**
 * Some default styles to override the canonical HTML5 styling defaults that
 * make our display seem bad.  These are currently inline because we want to be
 * able to synchronously (re)flow the document without needing styles to load.
 * This does not need to be the case longterm; after our initial reflow to
 * detect newsletters, we could only add in a link to a CSS file shipped with
 * us for the non-newsletter case.  We could also internally load the CSS file
 * and splice it in rather than hardcoding it.
 */
var DEFAULT_STYLE_TAG =
  '<style type="text/css">\n' +
  // ## blockquote
  // blockquote per html5: before: 1em, after: 1em, start: 4rem, end: 4rem
  'blockquote {' +
  'margin: 0; ' +
  // so, this is quoting styling, which makes less sense to have in here.
  'border-left: 0.2rem solid gray;' +
  // padding-start isn't a thing yet, somehow.
  'padding: 0; -moz-padding-start: 0.5rem; ' +
  '}\n' +
  // Give the layout engine an upper-bound on the width that's arguably
  // much wider than anyone should find reasonable, but might save us from
  // super pathological cases.
  'html, body { max-width: 120rem; }\n' +
  // pre messes up wrapping very badly if left to its own devices
  'pre { white-space: pre-wrap; }\n' +
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
 * Newsletters tend to assume a screen width of around 60rem.  They also help
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
function createAndInsertIframeForContent(htmlStr, scrollContainer,
                                         parentNode, beforeNode,
                                         interactiveMode,
                                         clickHandler) {
  // Add padding to compensate for scroll-bars in environments (Firefox, not
  // b2g) where they can show up and cause themselves to exist in perpetuity.
  var scrollPad = 16;

  var viewportWidth = parentNode.offsetWidth - scrollPad;
  var viewport = document.createElement('div');
  var title = document.getElementsByClassName('msg-reader-header')[0];
  var header = document.getElementsByClassName('msg-envelope-bar')[0];
  var extraHeight = title.clientHeight + header.clientHeight;
  viewport.setAttribute(
    'style',
    'overflow: hidden; position: relative; ' +
    'width: 100%;');
  var iframe = document.createElement('iframe');

  iframe.setAttribute('sandbox', 'allow-same-origin');
  // Styling!
  // - no visible border
  // - we want to approximate seamless, so turn off overflow and we'll resize
  //   things below.
  // - 60rem wide; this is approximately the standard expected width for HTML
  //   emails.
  iframe.setAttribute(
    'style',
    'position: absolute; ' +
    'border-width: 0;' +
    'overflow: hidden;'
//    'pointer-events: none; ' +
//    '-moz-user-select: none; ' +
//    'width: ' + (scrollWidth) + 'px; ' +
//    'height: ' + (viewportHeight) + 'px;'
  );
  viewport.appendChild(iframe);
  parentNode.insertBefore(viewport, beforeNode);
  //iframe.setAttribute('srcdoc', htmlStr);

  // we want this fully synchronous so we can know the size of the document
  iframe.contentDocument.open();
  iframe.contentDocument.write('<!doctype html><html><head>');
  iframe.contentDocument.write(DEFAULT_STYLE_TAG);
  iframe.contentDocument.write('</head><body>');
  // (currently our sanitization only generates a body payload...)
  iframe.contentDocument.write(htmlStr);
  iframe.contentDocument.write('</body>');
  iframe.contentDocument.close();
  var iframeBody = iframe.contentDocument.documentElement;
  var scrollWidth = iframeBody.scrollWidth;
  var scrollHeight = iframeBody.scrollHeight;

  var newsletterMode = scrollWidth > viewportWidth,
      resizeFrame;

  var scale = Math.min(1, viewportWidth / scrollWidth),
      baseScale = scale,
      lastScale = scale,
      scaleMode = 0;

  viewport.setAttribute(
    'style',
    'padding: 0; border-width: 0; margin: 0; ' +
    'position: relative; ' +
    'overflow: hidden;');
  viewport.style.width = (scrollWidth * scale) + 'px';
  viewport.style.height = (scrollHeight * scale) + 'px';

  // setting iframe.style.height is not sticky, so be heavy-handed.
  // Also, do not set overflow: hidden since we are already clipped by our
  // viewport or our containing card and Gecko slows down a lot because of the
  // extra clipping.
  iframe.setAttribute(
    'style',
    'padding: 0; border-width: 0; margin: 0; ' +
    'transform-origin: top left; ' +
    'pointer-events: none;');
  iframe.style.width = scrollWidth + 'px';

  resizeFrame = function(updateHeight) {
    if (updateHeight) {
      iframe.style.height = '';
      scrollHeight = iframeBody.scrollHeight;
    }
    if (scale !== 1)
      iframe.style.transform = 'scale(' + scale + ')';
    else
      iframe.style.transform = '';
    iframe.style.height =
      ((scrollHeight * Math.max(1, scale)) + scrollPad) + 'px';
    viewport.style.width = (scrollWidth * scale) + 'px';
    viewport.style.height = ((scrollHeight * scale) + scrollPad) + 'px';
  };
  resizeFrame(true);

  var zoomFrame = function(newScale, centerX, centerY) {
    if (newScale === scale)
      return;

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

    var vertScrollDelta = iy * scaleDelta,
        horizScrollDelta = ix * scaleDelta;

    scale = newScale;
    resizeFrame();
    scrollContainer.scrollTop = vertScrollDelta + extraHeight - centerY;
    scrollContainer.scrollLeft = horizScrollDelta - centerX;
  };

  var iframeShims = {
    iframe: iframe,
    resizeHandler: function() {
      resizeFrame(true);
    }
  };
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
  // If mail is not newsletter mode, ignore zoom/dbtap event handling.
  if (!newsletterMode || interactiveMode !== 'interactive') {
    return iframeShims;
  }
  detectorTarget.addEventListener('dbltap', function(e) {
    var newScale = scale;
    if (lastScale === scale) {
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
    }
    else {
      // If already zoomed in, zoom out to starting scale
      if (scale > 1) {
        newScale = lastScale;
        scaleMode = 0;
      }
      // Otherwise zoom in to 2x
      else {
        newScale = 2;
        scaleMode = 2;
      }
    }
    lastScale = newScale;
    try {
      zoomFrame(newScale, e.detail.clientX, e.detail.clientY);
    } catch (ex) {
      console.error('zoom bug!', ex, '\n', ex.stack);
    }
  });
  detectorTarget.addEventListener('transform', function(e) {
    var scaleFactor = e.detail.relative.scale;
    var newScale = scale * scaleFactor;
    // Never zoom in farther than 2x
    if (newScale > 2) {
      newScale = 2;
    }
    // And never zoom out farther than baseScale
    else if (newScale < baseScale) {
      newScale = baseScale;
    }
    zoomFrame(newScale,
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
      iframeDoc, inputStyle;
  // Tap gesture event for HTML type mail and click event for plain text mail
  if (iframe) {
    root = document.getElementsByClassName('scrollregion-horizontal-too')[0];
    title = document.getElementsByClassName('msg-reader-header')[0];
    header = document.getElementsByClassName('msg-envelope-bar')[0];
    attachmentsContainer =
      document.getElementsByClassName('msg-attachments-container')[0];
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
        // Because the attachments are updating late,
        // get the client height while clicking iframe.
        attachmentsHeight = attachmentsContainer.clientHeight;
        inputStyle = window.getComputedStyle(attachmentsContainer);
        attachmentsMarginTop =
          (attachmentsHeight) ? parseInt(inputStyle.marginTop) : 0;
        var dx, dy;
        var transform = iframe.style.transform || 'scale(1)';
        var scale = transform.match(/(\d|\.)+/g)[0];
        dx = event.detail.clientX + root.scrollLeft - msgBodyMarginLeft;
        dy = event.detail.clientY + root.scrollTop -
             titleHeight - headerHeight -
             attachmentsHeight - attachmentsMarginTop - msgBodyMarginTop;
        node = iframeDoc.elementFromPoint(dx / scale, dy / scale);
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
  bindSanitizedClickHandler: bindSanitizedClickHandler
};

});
