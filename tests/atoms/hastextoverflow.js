/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';
/* globals marionetteScriptFinished, waitFor */

var textOverflowDetect = {
  allOverflowedNodes : [],

  getLargestWidthOfTextNode: function(aTextNode) {
    var range = document.createRange();
    range.selectNodeContents(aTextNode);
    var rects = range.getClientRects();
    var width = 0;
    for (var i=0;i<rects.length;i++) {
      if (rects[i].width > width)
        width = rects[i].width;
    }
    return width;
  },

  checkAllInlineElements: function(aElement, aWidth) {
        var nodes = aElement.childNodes;
        for (var j=0;j<nodes.length;j++){
          if (nodes[j].nodeType == 3) {
            var width = this.getLargestWidthOfTextNode(nodes[j]).toFixed(2);
            if (width > aWidth)
              this.allOverflowedNodes.push({'width': width, 'nodeValue': nodes[j].nodeValue , 'containerwidth': aWidth})
          }
          if (nodes[j].nodeType == 1 && window.getComputedStyle(nodes[j],null).getPropertyValue("display") == 'inline') {
            this.checkAllInlineElements(nodes[j], aWidth)
          }
        }
  },

  checkalloverflow: function(aElement) {
    var startNode = document;
    if (aElement)
      startNode = aElement;
    var x=startNode.getElementsByTagName('*');
    for (var i=0;i<x.length;i++) {
      if (x[i].scrollWidth >  x[i].clientWidth) {
        var prop = window.getComputedStyle(x[i],null).getPropertyValue("text-overflow");
        if (prop != '' && prop != 'clip') {
          this.checkAllInlineElements(x[i], x[i].clientWidth);
        }
      }
    }
  return textOverflowDetect.allOverflowedNodes;
  }
}
