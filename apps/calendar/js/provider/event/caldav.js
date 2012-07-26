Calendar.ns('Provider.Event').Caldav = (function() {

  function Event() {
  }

  Event.prototype = {
    __proto__: Calendar.Provider.Event.Abstract.prototype,


    _remoteString: function(vevent, prop) {
      if (vevent.hasProperty(prop)) {
        return vevent.getFirstPropertyValue(prop).toString();
      }

      return '';
    },

    _remoteDate: function (vevent, prop) {

      if (vevent.hasProperty(prop)) {
        var data = vevent.getFirstProperty(prop).data;
        //FIXME: This should always start
        //       as a UTC time and then
        //       translated into the current
        //       global timezone.
        return new Date(
          data.year,
          // ICAL.js is 1 based
          (data.month - 1),
          data.day,
          data.hour,
          data.minute,
          data.second
        );
      }
    },

    /**
     * Maps remote ICAL event
     */
    mapRemote: function(event) {
      // map to a component
      if (!(event instanceof ICAL.icalcomponent)) {
        event = new ICAL.icalcomponent(event);
      }

      var vevent = event.getFirstSubcomponent(
        'VEVENT'
      );

      // simple strings...

      this.title = this._remoteString(
        vevent, 'SUMMARY'
      );

      this.description = this._remoteString(
        vevent, 'DESCRIPTION'
      );

      this.location = this._remoteString(
        vevent, 'LOCATION'
      );

      this.startDate = this._remoteDate(
        vevent, 'DTSTART'
      );

      this.endDate = this._remoteDate(
        vevent, 'DTEND'
      );
    }
  };

  return Event;

}());
