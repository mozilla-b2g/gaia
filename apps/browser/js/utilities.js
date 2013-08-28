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
  isNotURL: function htmlHelper_isNotURL(input) {
    var schemeReg = /^\w+\:\/\//;

    // in bug 904731, we use <input type='url' value=''> to
    // validate url. However, there're still some cases
    // need extra validation. We'll remove it til bug fixed
    // for native form validation.
    //
    // for cases, ?abc and "a? b" which should searching query
    var case1Reg = /^(\?)|(\?.+\s)/;
    // for cases, pure string
    var case2Reg = /[\?\.\s\:]/;
    // for cases, data:uri
    var case3Reg = /^(data\:)/;
    var str = input.trim();
    if (case1Reg.test(str) || !case2Reg.test(str)) {
      return true;
    }
    if (case3Reg.test(str)) {
      return false;
    }
    // require basic scheme before form validation
    if (!schemeReg.test(str)) {
      str = 'http://' + str;
    }
    if (!this.urlValidate) {
      this.urlValidate = document.createElement('input');
      this.urlValidate.setAttribute('type', 'url');
    }
    this.urlValidate.setAttribute('value', str);
    return !this.urlValidate.validity.valid;
  }
};
