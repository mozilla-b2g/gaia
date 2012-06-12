/*
 *  Module: Strip.
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telefónica I+D S.A.U.
 *
 *  LICENSE: Apache 2.0
 *
 *  @author José M. Cantera (jmcf@tid.es)
 *
 *
 *
*/


'use strict';

if(typeof owdStrip === 'undefined') {
(function() {
  // Status
  var overX,overY;

  // initial slide
  var initialSlide;

  // Size of the strip
  var stripSize;
  // Current Translation
  var currentTranslation;

  var difference;

  // Pointer to the scaled element
  var scaledElement;

  // Size of each entry on the strip
  var entrySize;

  // If the movement is less than this the focused element will return
  var threshold;
  var overtheStrip = false;

  var lastDistance;

  // Width of the viewport
  var viewport;

  var downTimestamp;

  var timerPreview;

  window.owdStrip = {};

  var ui = owdStrip.ui = {};

  var ul = document.querySelector('ol');
  // Num entries on the strip
  var numEntries = ul.querySelectorAll('li').length;

  var topLeftTranslation,topRightTranslation;

  window.console.log('Num Entries on the strip: ',numEntries);


  /**
   *   Initializes the strip parameters and layout
   *
   */
   ui.init = function() {

    ul.addEventListener('mousedown',stripDown,true);
    ul.addEventListener('click',clicked,true);

    var ali = document.querySelector('li');
    window.console.log('Scroll Width:',ali.scrollWidth);

    entrySize = ali.scrollWidth + 2;

    threshold = Math.round((entrySize / 2) * 95 / 100);

    window.console.log('Threshold: ',threshold);

    stripSize = entrySize * 9;
    window.console.log('Total: ',stripSize);

    ul.style.width = stripSize + 'px';

    viewport = document.documentElement.clientWidth;

    difference = stripSize - viewport;

    window.console.log('Client Width: ' ,viewport,difference);

    initialSlide = difference / 2;
    currentTranslation = -initialSlide;

    topLeftTranslation = 0 + (viewport / 2 - entrySize / 2);
    topRightTranslation = - difference - (viewport / 2 - entrySize / 2);

    // The ul is translated absolutely to the center
    ul.translate(currentTranslation,0,true);
  }

  /**
   *   Invoked when a mouse move event is raised over the strip
   *
   *
   */
  function stripMove(e) {
    // window.console.log('Move',e.clientX,e.clientY);

    if(document.body.dataset.state === 'strip') {

      window.clearTimeout(timerPreview);

      window.console.log('Last Distance',lastDistance,threshold);

      var distanceX = e.clientX - overX;

      if(Math.abs(distanceX) > 7) {
        var distanceY = e.clientY - overY;

        lastDistance = distanceX;

        // The strip is moved

        window.console.log('Distance X: ',distanceX);

        var suggestedTranslation = currentTranslation + distanceX;
        window.console.log('Suggested Translation: ',currentTranslation + distanceX);

        if(suggestedTranslation >= topRightTranslation
                                  && suggestedTranslation <= topLeftTranslation) {
          currentTranslation += distanceX;
        }
        else {
          if(suggestedTranslation < topRightTranslation) {
            currentTranslation = topRightTranslation;
          }
          else if(suggestedTranslation > topLeftTranslation) {
            currentTranslation = topLeftTranslation;
          }
        }

        ul.translate(currentTranslation,0,true);

        doFocus();

        e.stopPropagation();
        e.preventDefault();

        overX = e.clientX;
        overY = e.clientY;
      }

      /*
      document.querySelector('#preview').style.height = '0%';
      document.querySelector('#preview').style.top = '32%';
      */
    }
  } // strip Move


  /**
   *  Event handler for supporting viewport resizes on the desktop
   *
   */
  window.onresize = function() {
    window.console.log('On resize');

    viewport = document.documentElement.clientWidth;

    doFocus();
  }

/**
  function stripMagneto() {
    window.console.log('Magneto!');
    window.removeEventListener('mousemove',stripMove);
  }
*/

  function openPreview(selected) {
    // document.querySelector('#preview').style.height = '56%';
    // document.querySelector('#preview').style.top = '10%';

    var app = selected.querySelector('a').href;

    var manifest = owdAppManager.getByOrigin(app).manifest;

    if(manifest.previewMode === true || app === 'http://facebook.gaiamobile.org/') {
      // owdAppManager.launch(app,{preview: '1'});
      var opreview = document.querySelector('#preview');
      var preview;

      if(opreview === null) {
        window.console.log('Creating a new preview iframe');
        preview = document.createElement('iframe');
      }
      else {
            preview = opreview;
            // preview.setAttribute('hidden',false);
      }

      preview.id = 'preview';

      preview.zIndex = 1;

      preview.src = app + manifest.launch_path + "?preview=1";

      if(!opreview) {
        document.body.appendChild(preview);
        window.setTimeout(function() {preview.style.height = '55%';},25);
      }

      window.console.log('Preview opened!!');
    }
    else {
      // close preview if (any)
      // owdAppManager.launch('http://facebook.gaiamobile.org/',{close: '1'});
      var opreview = document.querySelector('#preview');
      if(opreview) {
        document.body.removeChild(opreview);
      }
    }
  }

  /**
   *  Focuses the strip
   *
   *
   */
  function doFocus() {
    var nextScaled = stripCenterElement();

    if(nextScaled !== scaledElement) {
      window.console.log('Next Scaled: ',nextScaled);

      // The old scaled is reset
      if(scaledElement) {
        scaledElement.className = '';
      }

      // New element to be scaled
      scaledElement = document.querySelector('li:nth-child(' + nextScaled + ')');

      scaledElement.className = 'scaled';

      window.clearTimeout(timerPreview);

      var opreview = document.querySelector('#preview');
      if(opreview) {
        document.body.removeChild(opreview);
      }

      timerPreview = window.setTimeout(
                            function() { openPreview(scaledElement); } ,1900);
    }
  }

  /**
   *  Invoked when a mouse down event is raised over the strip
   *
   */
  function stripDown(e) {
    if(document.body.dataset.state === 'strip') {
      downTimestamp = Date.now();

      window.console.log('Over: ', e.clientX,e.clientY);
      overX = e.clientX;
      overY = e.clientY;

      window.addEventListener('mousemove',stripMove,true);
      window.addEventListener('mouseup',stripUp,true);

      doFocus();

      e.stopPropagation();
      e.preventDefault();
    }
  }

  /**
   *   Invoked when a mouse up event is raised over the strip
   *
   *
   */
  function stripUp(e) {
    if(document.body.dataset.state === 'strip') {
      var now = Date.now();

      window.removeEventListener('mousemove',stripMove,true);
      window.removeEventListener('mouseup',stripUp,true);

      window.console.log('time ellapsed:', now - downTimestamp);

      if(now - downTimestamp < 200) {
        if(e.target.tagName === 'IMG') {
          if(e.target.parentNode) {

            window.clearTimeout(timerPreview);

            var app = e.target.parentNode.href;
            window.console.log('App to be launched: ',app);
            owdAppManager.launch(app);
          }
        }
      }
      else {
        var remaining = Math.abs(currentTranslation % (entrySize / 2));
        if(remaining !== 0) {
          window.console.log('Remaining: ',remaining);

          if(lastDistance > 0) {
            currentTranslation += remaining;
          }
          else {
            currentTranslation -= remaining;
          }

          if(currentTranslation < topRightTranslation) {
            currentTranslation = topRightTranslation;
          }
          else if(currentTranslation > topLeftTranslation) {
            currentTranslation = topLeftTranslation;
          }

          window.setTimeout(function() {  ul.translate(currentTranslation,0,true); doFocus(); },100);
        }
      }

      e.stopPropagation();
      e.preventDefault();
    }
      /*
      window.console.log('Mouse Up');

      if(Math.abs(lastDistance) < threshold) {
        window.setTimeout(function() {currentTranslation -= lastDistance;

        ul.translate(currentTranslation,0,true);},0);
        }
    }

    var remaining = currentTranslation % entrySize;

    window.console.log('Remaining: ',currentTranslation,entrySize,remaining);

    if(remaining !== 0) {
      currentTranslation  -= remaining;
      ul.translate(currentTranslation,0,true);
    } */
  }

  /**
   *  Calculates the element on the middle
   *
   *
   */
  function stripCenterElement() {
    var visibleEntries = viewport / entrySize;

    var middleEntry = Math.floor(visibleEntries / 2) + 1;

    var firstVisibleEntry = Math.floor(-currentTranslation / (entrySize * 0.90));

    var ret = firstVisibleEntry + middleEntry;

    if(ret < 1) {
      ret = 1;
    }

    return ret;

/*
    var vpSize = document.documentElement.clientWidth;
    var sp = normalize(currentTranslation / entrySize);

    window.console.log('Delta: ',sp);
    var middleNum = normalize((vpSize / 2) / entrySize) - sp;
﻿
    return middleNum; */
  }

  /**
   *   When a click event on the strip is raised this event handler is invoked
   *
   */
  function clicked(e) {
    if(document.body.dataset.state === 'strip') {
      e.preventDefault();
      e.stopPropagation();
    }
  }


  function normalize(n) {
    var integer = Math.floor(n);

    var rest = n - integer;
    var result = integer;

    if(rest >= entrySize * 0.95) {
      result += 1;
    }

    return result;
  }

})();

}
