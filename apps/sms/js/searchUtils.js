'use strict';

var SearchUtils = {
  createHighlightHTML: function su_createHighlightHTML(text, regExp, style) {
    var sliceStrs = text.split(regExp);
    var patterns = text.match(regExp);
    if (!patterns) {
      return Utils.escapeHTML(text);
    }
    var str = '';
    for (var i = 0; i < patterns.length; i++) {
      str = str +
          Utils.escapeHTML(sliceStrs[i]) + '<span class="' + style + '">' +
          Utils.escapeHTML(patterns[i]) + '</span>';
    }
    str += Utils.escapeHTML(sliceStrs.pop());
    return str;
  }
};
