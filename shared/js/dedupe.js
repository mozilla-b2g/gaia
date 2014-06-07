'use strict';

(function(exports) {

  /**
   * SearchDedupe maintains a list of web search results and uses fuzzy dedupe
   * logic to remove what we would consider to be duplicates.
   * This is used in the search app for example to deduplicate locally
   * installed applications from web results.
   */
  function SearchDedupe() {}

  SearchDedupe.prototype = {

    /**
     * A mapping of search results to be de-duplicated via manifesURL.
     */
    exactResults: {},

    /**
     * A mapping of search results to be de-duplicated by other than
     * manifestURL. This is our strategy of de-duplicating results from
     * Everything.me and locally installed apps.
     */
    fuzzyResults: {},

    /**
     * A list of common words that we ignore when de-duping
     */
    dedupeNullList: [
      'mobile', 'touch'
    ],

    /**
     * The main logic which allows us to reduce the current result set.
     * @param {Array} results Array of results.
     * @param {String} strategy Dedupe strategy to use. Either fuzzy or exact.
     */
    reduce: function(results, strategy) {
      var validResults = [];

      // Cache the matched dedupe IDs.
      // Providers should not attempt to deduplicate against themselves.
      // This should perform better and lead to less misses.
      var exactDedupeIdCache = [];
      var fuzzyDedupeIdCache = [];

      results.forEach(function eachResult(result) {
        var found = false;
        var dedupeId = result.dedupeId.toLowerCase();

        // Get the host of the dedupeId for the fuzzy result case
        var host;
        try {
          host = new URL(dedupeId).host;
        } catch (e) {
          host = dedupeId;
        }
        var fuzzyDedupeIds = [host, dedupeId];

        // Try to use some simple domain heuristics to find duplicates
        // E.g, we would want to de-dupe between:
        // m.site.org and touch.site.org, sub.m.site.org and m.site.org
        // We also try to avoid deduping on second level domains by
        // checking the length of the segment.
        // For each part of the host, we add it to the fuzzy lookup table
        // if it is more than three characters. This algorithm is far
        // from perfect, but it will likely catch 99% of our usecases.
        var hostParts = host.split('.');
        for (var i in hostParts) {
          var part = hostParts[i];
          if (part.length > 3 && this.dedupeNullList.indexOf(part) === -1) {
            fuzzyDedupeIds.push(part);
          }
        }

        // Check if we have already rendered the result
        if (strategy == 'exact') {
          if (this.exactResults[dedupeId]) {
            found = true;
          }
        } else {
          // Handle the fuzzy matching case
          // Try to match against either host or subdomain
          fuzzyDedupeIds.forEach(function eachFuzzy(eachId) {
            for (var i in this.fuzzyResults) {
              if (i.indexOf(eachId) !== -1) {
                found = true;
              }
            }
          }, this);
        }

        // At the end of each iteration, cache the dedupe keys.
        exactDedupeIdCache.push(dedupeId);
        fuzzyDedupeIdCache = fuzzyDedupeIdCache.concat(fuzzyDedupeIds);

        if (!found) {
          validResults.push(result);
        }
      }, this);

      exactDedupeIdCache.forEach(function eachFuzzy(eachId) {
        this.exactResults[eachId] = true;
      }, this);

      fuzzyDedupeIdCache.forEach(function eachFuzzy(eachId) {
        this.fuzzyResults[eachId] = true;
      }, this);

      return validResults;
    },

    /**
     * Resets our current result set. No reductions will take place
     * on the next reduce call.
     */
    reset: function() {
      this.exactResults = {};
      this.fuzzyResults = {};
    }

  };

  exports.SearchDedupe = SearchDedupe;

}(window));
