/**
 * Factory for creating values for the modify event form.
 * Converts the .start & .end properties to .startDate/.endDate.
 */
Factory.define('form.modifyEvent', {
  oncreate: function(obj) {
    if (obj.start) {
      var start = obj.start;
      delete obj.start;

      obj.startDate = Calendar.InputParser.exportDate(start);
      obj.startTime = Calendar.InputParser.exportTime(start);
    }

    if (obj.end) {
      var end = obj.end;
      delete obj.end;

      obj.endDate = Calendar.InputParser.exportDate(end);
      obj.endTime = Calendar.InputParser.exportTime(end);
    }
  }
});
