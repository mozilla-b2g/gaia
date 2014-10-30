(function() {
  'use strict';

  function BlanketConsoleReporter() {

  }

  BlanketConsoleReporter.prototype = {

    enhance: function enhance(server) {
      server.on('coverage report', this._onCoverageData.bind(this));
    },

    _onCoverageData: function _onCoverageData(data) {
      data = this._parseCoverageData(data);
      this._printConsoleFormat(data);
    },

    _parseCoverageData: function _parseCoverageData(data) {
      var coverResults = [],
          files = data.files,
          fileInfo,
          covered,
          total,
          coveredSum = 0,
          totalSum = 0;

      var percentage = function(covered, total) {
        return (Math.round(((covered / total) * 100) * 100) / 100) + ' %';
      };

      var stmts = function(covered, total) {
        return covered + '/' + total;
      };

      for (var filename in files) {
        fileInfo = files[filename];
        covered = 0;
        total = 0;

        for (var key in fileInfo) {
          if (typeof(fileInfo[key]) === 'number') {
            total++;
            if (fileInfo[key] > 0) {
              covered++;
            }
          }
        }

        coveredSum += covered;
        totalSum += total;

        coverResults.push({
          filename: filename,
          stmts: stmts(covered, total),
          percentage: percentage(covered, total)
        });
      }

      coverResults.push({
        filename: 'Global Total',
        stmts: stmts(coveredSum, totalSum),
        percentage: percentage(coveredSum, totalSum)
      });

      return coverResults;
    },

    _printConsoleFormat: function _printConsoleFormat(coverResults) {
      var titleColor = '\u001b[1;36m',
          fileNameColor = '\u001b[0;37m',
          stmtColor = '\u001b[0;33m',
          percentageColor = '\u001b[0;36m',
          originColor = '\u001b[0m',
          outputFormat;

      // Print title
      console.log('\n%s-- Blanket.js Test Coverage Result --\n', titleColor);
      console.log('%sFile Name%s - %sCovered/Total Smts%s - %sCoverage(%)%s\n',
        fileNameColor, originColor, stmtColor, originColor, percentageColor,
        originColor);

      // Print coverage result for each file
      coverResults.forEach(function(dataItem) {
        var filename = dataItem.filename,
            formatPrefix = (filename === 'Global Total' ? '\n' : '  '),
            seperator = ' - ';

        filename = (filename === 'Global Total' ? filename :
          (filename.substr(0, filename.indexOf('?')) || filename));
        outputFormat = formatPrefix;
        outputFormat += fileNameColor + filename + originColor + seperator;
        outputFormat += stmtColor + dataItem.stmts + originColor  + seperator;
        outputFormat += percentageColor + dataItem.percentage + originColor;

        console.log(outputFormat);
      });
    }
  };

  module.exports = BlanketConsoleReporter;

}());
