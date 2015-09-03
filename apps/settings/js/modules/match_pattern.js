define(function(require) {
  'use strict';

  /**
   * Match pattern is ported from
   * https://mxr.mozilla.org/mozilla-central/source/toolkit/modules/addons
   *   /MatchPattern.jsm
   * which in itself implements pattern matching based on Chrome Apps Platform
   * API https://developer.chrome.com/extensions/match_patterns
   *
   * MatchPattern is used by the add-on manager to match add-ons to apps that
   * they affect.
   */

  const PERMITTED_SCHEMES = ['http', 'https', 'file', 'ftp', 'app'];

  // This function converts a glob pattern (containing * and possibly ?
  // as wildcards) to a regular expression.
  function globToRegexp(pat, allowQuestion) {
    // Escape everything except ? and *.
    pat = pat.replace(/[.+^${}()|[\]\\]/g, '\\$&');

    if (allowQuestion) {
      pat = pat.replace(/\?/g, '.');
    } else {
      pat = pat.replace(/\?/g, '\\?');
    }
    pat = pat.replace(/\*/g, '.*');
    return new RegExp('^' + pat + '$');
  }

  // These patterns follow the syntax in
  // https://developer.chrome.com/extensions/match_patterns
  function SingleMatchPattern(pat) {
    if (pat == '<all_urls>') {
      this.scheme = PERMITTED_SCHEMES;
      this.host = '*';
      this.path = new RegExp('.*');
    } else if (!pat) {
      this.scheme = [];
    } else {
      var re = new RegExp(
        '^(http|https|file|ftp|app|\\*)://(\\*|\\*\\.[^*/]+|[^*/]+|)(/.*)$');
      var match = re.exec(pat);
      if (!match) {
        console.error(`Invalid match pattern: '${pat}'`);
        this.scheme = [];
        return;
      }

      if (match[1] == '*') {
        this.scheme = ['http', 'https'];
      } else {
        this.scheme = [match[1]];
      }
      this.host = match[2];
      this.path = globToRegexp(match[3], false);

      // We allow the host to be empty for file URLs.
      if (this.host === '' && this.scheme[0] !== 'file') {
        console.error(`Invalid match pattern: '${pat}'`);
        this.scheme = [];
        return;
      }
    }
  }

  SingleMatchPattern.prototype = {
    matches(uri, ignorePath = false) {
      if (this.scheme.indexOf(uri.protocol.slice(0, -1)) == -1) {
        return false;
      }

      // This code ignores the port, as Chrome does.
      if (this.host == '*') {
        // Don't check anything.
      } else if (this.host[0] == '*') {
        // It must be *.foo. We also need to allow foo by itself.
        var suffix = this.host.substr(2);
        if (uri.hostname != suffix && !uri.hostname.endsWith('.' + suffix)) {
          return false;
        }
      } else {
        if (this.host != uri.hostname) {
          return false;
        }
      }

      if (!ignorePath && !this.path.test(uri.pathname)) {
        return false;
      }

      return true;
    }
  };

  /**
   * Match Pattern allows to match patterns based on set of URLs
   * @class MatchPattern
   * @returns {MatchPattern}
   */
  function MatchPattern(pat) {
    this.pat = pat;
    if (!pat) {
      this.matchers = [];
    } else if (pat instanceof String || typeof(pat) === 'string') {
      this.matchers = [new SingleMatchPattern(pat)];
    } else {
      this.matchers = [for (p of pat) new SingleMatchPattern(p)];
    }
  }

  MatchPattern.prototype = {
    // |uri| should be an nsIURI.
    matches(uri) {
      for (var matcher of this.matchers) {
        if (matcher.matches(uri)) {
          return true;
        }
      }
      return false;
    },

    matchesIgnoringPath(uri) {
      for (var matcher of this.matchers) {
        if (matcher.matches(uri, true)) {
          return true;
        }
      }
      return false;
    },

    serialize() {
      return this.pat;
    },
  };

  return MatchPattern;
});
