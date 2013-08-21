var DateHelper = {
  todayStarted: function dh_todayStarted() {
    var now = (new Date()).valueOf();
    return this.getMidnight(now);
  },

  yesterdayStarted: function dh_yesterdayStarted() {
    var now = (new Date()).valueOf();
    var dayAgo = now - 86400000;
    return this.getMidnight(dayAgo);
  },

  thisWeekStarted: function dh_thisWeekStarted() {
    var now = new Date();
    var dayOfTheWeek = now.getDay();
    var firstDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      //getDay is zero based so if today
      //is the start of the week it will not
      //change the date. Also if we get
      //into negative days the date object
      //handles that too...
      now.getDate() - dayOfTheWeek
    );
    return this.getMidnight(firstDay);
  },

  thisMonthStarted: function dh_thisMonthStarted() {
    var now = new Date();
    var firstDay = (new Date(
      now.getFullYear(),
      now.getMonth(),
      1).valueOf()
    );
    return firstDay;
  },

  lastSixMonthsStarted: function dh_lastSixMonthsStarted() {
    var now = new Date().valueOf();
    var sixMonthsAgo = now - 2629743830 * 6;
    return sixMonthsAgo;
  },

  thisYearStarted: function dh_thisYearStarted() {
    var now = new Date();
    var firstDay = (new Date(
      now.getFullYear(),
      0).valueOf()
    );
    return firstDay;
  },

  getMidnight: function dh_getMidnight(timestamp) {
    var day = new Date(timestamp);
    var midnight = (new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      0).valueOf());
    return midnight;
  }
};

var NumberHelper = {

  /**
   * Pad a string representaiton of an integer with leading zeros
   *
   * @param {String} string String to pad.
   * @param {Integer} len Desired length of output.
   * @return {String} Padded string.
   */
    zfill: function nh_zfill(string, len) {
      var s = string;
      while (s.length < len) s = '0' + s;
      return s;
    }
};

// Taken (and modified) from /apps/sms/js/searchUtils.js
// and /apps/sms/js/utils.js
var HtmlHelper = {
  createHighlightHTML: function ut_createHighlightHTML(text, searchRegExp) {
    if (!searchRegExp) {
      return this.escapeHTML(text);
    }
    searchRegExp = new RegExp(searchRegExp, 'gi');
    var sliceStrs = text.split(searchRegExp);
    var patterns = text.match(searchRegExp);
    if (!patterns) {
      return this.escapeHTML(text);
    }
    var str = '';
    for (var i = 0; i < patterns.length; i++) {
      str = str +
        this.escapeHTML(sliceStrs[i]) + '<span class="highlight">' +
        this.escapeHTML(patterns[i]) + '</span>';
    }
    str += this.escapeHTML(sliceStrs.pop());
    return str;
  },

  escapeHTML: function ut_escapeHTML(str, escapeQuotes) {
    var span = document.createElement('span');
    span.textContent = str;

    // Escape space for displaying multiple space in message.
    span.innerHTML = span.innerHTML.replace(/\s/g, '&nbsp;');

    if (escapeQuotes)
      return span.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;'); //"
    return span.innerHTML;
  }
};


var UrlHelper = {
  // Ported from:
  // http://mxr.mozilla.org/mozilla-central/source/docshell/base/nsDefaultURIFixup.cpp#783
  isNotURL: function htmlHelper_isNotURL(input) {
    // NOTE: NotFound is equal to the upper bound of Uint32 (2^32-1)
    var dLoc = input.indexOf('.') >>> 0;
    var cLoc = input.indexOf(':') >>> 0;
    var sLoc = input.indexOf(' ') >>> 0;
    var mLoc = input.indexOf('?') >>> 0;
    var qLoc = Math.min(input.indexOf('"') >>> 0, input.indexOf('\'') >>> 0);

    // Space at 0 index treated as NotFound
    if (sLoc === 0) {
      sLoc = -1 >>> 0;
    }

    // Question Mark at 0 index is a keyword search
    if (mLoc == 0) {
      return true;
    }

    // Space before Dot, Or Quote before Dot
    // Space before Colon, Or Quote before Colon
    // Space before QuestionMark, Or Quote before QuestionMark
    if ((sLoc < dLoc || qLoc < dLoc) &&
        (sLoc < cLoc || qLoc < cLoc) &&
        (sLoc < mLoc || qLoc < mLoc)) {
      return true;
    }

    // NotFound will always be greater then the length
    // If there is no Colon, no Dot and no QuestionMark
    // there is no way this is a URL
    if (cLoc > input.length && dLoc > input.length && mLoc > input.length) {
      return true;
    }

    return false;
  }
};
