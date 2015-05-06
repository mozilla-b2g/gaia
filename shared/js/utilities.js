'use strict';
/* global Normalizer */
/* exported DateHelper, NumberHelper, HtmlHelper, StringHelper */

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
      while (s.length < len) {
        s = '0' + s;
      }
      return s;
    }
};

var StringHelper = {
  fromUTF8: function ut_fromUTF8(str) {
    var buf = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) {
      buf[i] = str.charCodeAt(i);
    }
    return buf;
  },

  camelCase: function ut_camelCase(str) {
    var rdashes = /-(.)/g;
    return str.replace(rdashes, function replacer(str, p1) {
      return p1.toUpperCase();
    });
  }
};

var HtmlHelper = {
  createHighlightHTML: function ut_createHighlightHTML(text, terms) {
    // We store here what positions in the text are going to be enclosed in
    // highlight tags as boolean values. Positions in toHighlight correspond to
    // positions in the text string.
    var toHighlight = [];
    var normalizedText = Normalizer.toAscii(text).toLowerCase();

    terms.forEach(function(term) {
      term = Normalizer.toAscii(term).toLowerCase();
      var index = normalizedText.indexOf(term);
      while (index >= 0) {
        for(var i = 0, length = term.length; i < length; i++){
          toHighlight[index + i] = true;
        }
        index = normalizedText.indexOf(term, index + term.length);
      }
    });

    var highlighted = [];
    for(var i = 0; i < text.length; i++){
      if (!toHighlight[i]) {
        highlighted.push(text[i]);
      } else {
        var term = '';
        while (toHighlight[i]) {
          term += text[i];
          i++;
        }
        i--;
        highlighted.push('<mark>', term, '</mark>');
      }
    }
    return highlighted.join('');
  },

  escapeHTML: function ut_escapeHTML(str, escapeQuotes) {
    var span = document.createElement('span');
    span.textContent = str;

    // Escape space for displaying multiple space in message.
    span.innerHTML = span.innerHTML.replace(/\s/g, '&nbsp;');

    if (escapeQuotes) {
      return span.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;'); //"
    }
    return span.innerHTML;
  },

  // Import elements into context. The first argument
  // is the context to import into, each subsequent
  // argument is the id of an element to import.
  // Elements can be accessed using the camelCased id
  importElements: function importElements(context) {
    var ids = [].slice.call(arguments, 1);
    ids.forEach(function(id) {
      context[StringHelper.camelCase(id)] = document.getElementById(id);
    });
  }

};
