/**
 * Factory for creating values for the modify event form.
 * Converts the .start & .end properties to .startDate/.endDate.
 */
Factory.define('form.modifyEvent', {
  oncreate: function(obj) {

    var InputParser = Calendar.Utils.InputParser;

    if (obj.start) {
      var start = obj.start;
      delete obj.start;

      obj.startDate = InputParser.exportDate(start);
      obj.startTime = InputParser.exportTime(start);
    }

    if (obj.end) {
      var end = obj.end;
      delete obj.end;

      obj.endDate = InputParser.exportDate(end);
      obj.endTime = InputParser.exportTime(end);
    }
  }
});
