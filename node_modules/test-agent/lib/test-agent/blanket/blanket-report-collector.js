(function() {
  'use strict';

  function BlanketReportCollector(options) {
    var key;

    options = options || {};

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  }

  BlanketReportCollector.prototype = {

    enhance: function enhance(server) {
      this.server = server;
      this._receiveCoverageData();
      server.on('test runner end', this._onTestRunnerEnd.bind(this));
    },

    _coverageResults: [],

    _templateResult: function() {
      return { files: {}, instrumentation: 'blanket' };
    },

    _receiveCoverageData: function() {
      var self = this;

      if (window) {
        window.addEventListener('message', function(event) {
          var data = JSON.parse(event.data);

          if (data[0] === 'coverage report') {
            self._coverageResults.push(data[1]);
          }
        });
      }
    },

    _onTestRunnerEnd: function() {
      this._aggregateReport();
      this._coverageResults = [];
    },

    _aggregateReport: function() {
      var data = this._coverageResults,
          aggregateResult,
          self = this;

      aggregateResult = data.reduce(function(aggregateResult, coverageResult) {
        var aggregateFiles = aggregateResult.files,
            coverageFiles = coverageResult.files;

        for (var file in coverageFiles) {
          if (!(file in aggregateFiles)) {
            aggregateFiles[file] = coverageFiles[file];
          } else {
            aggregateFiles[file] = self._accumulateCoverageFile(
              aggregateFiles[file], coverageFiles[file]);
          }
        }

        if (!aggregateResult.stats) {
          aggregateResult.stats = coverageResult.stats;
        } else {
          aggregateResult.stats = self._accumulateCoverageStats(
            aggregateResult.stats, coverageResult.stats);
        }

        return aggregateResult;
      }, this._templateResult());

      this._splitReportByDomain(aggregateResult);
    },

    _splitReportByDomain: function(results) {
      var multiDomainResults = [],
          previousDomain,
          currentDomain,
          index = -1,
          self = this;

      for (var file in results.files) {
        currentDomain = new URL(file).hostname;

        if (currentDomain !== previousDomain) {
          previousDomain = currentDomain;
          multiDomainResults.push(this._templateResult());
          index++;
        }

        multiDomainResults[index].files[file] = results.files[file];
      }

      // After aggregated every coverage result for each domain, we invoke
      // blanket's default reporter
      multiDomainResults.forEach(function(domainResult) {
        window.blanket.defaultReporter(domainResult);
        self.server.send('coverage report', domainResult);
      }, this);
    },

    _accumulateCoverageFile: function(aggregateFile, coverageFile) {
      for (var key in coverageFile) {
        if (coverageFile.hasOwnProperty(key) && key !== 'source') {
          if (!aggregateFile[key]) {
            aggregateFile[key] = coverageFile[key];
          } else {
            aggregateFile[key] += coverageFile[key];
          }
        }
      }

      return aggregateFile;
    },

    _accumulateCoverageStats: function(aggregateStats, coverageStats) {
      for (var key in coverageStats) {
        if (coverageStats.hasOwnProperty(key)) {
          if (typeof(coverageStats[key]) === 'number') {
            aggregateStats[key] += coverageStats[key];
          } else {
            aggregateStats.end = coverageStats.end;
          }
        }
      }

      return aggregateStats;
    }

  };

  window.TestAgent.Common.BlanketReportCollector = BlanketReportCollector;

})();
