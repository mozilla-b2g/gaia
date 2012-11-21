
/*
 * This module is in charge of keep the historical of SIM changes in order
 * to rebuild the accurate usage of each SIM.
 *
 * This is needed due to two Statistics API limitations:
 * 1- There is no distinction per SIM in BE
 * 2- The minimum resolution is 24 hours.
 *
 * Bascically, the data structure is a list of tags. A tag is an object with a
 * SIM id, start and end dates that labels the usage during this period to
 * belong the SIM with that id.
 *
 * Take a look to this example:
 * ============================
 *
 * [{sim:"A", start: 1, actual: 2000,               offset: 2000, end:  2},
 *  {sim:"B", start: 2, actual: 5000, fixing: 3000, offset: 2000, end:  3},
 *  {sim:"A", start: 3, actual: 6000,               offset: 3000, end:  4},
 *  {sim:"B", start: 4, actual:16000 ,              offset:12000, end: 72},
 *  {sim:"A", start:72}]
 *
 * Each row is a Tag. Suppose times are hours in a day. Let's verbose these
 * lines:
 *
 * First row means from time 1 to 2, usage belongs to A and when A was removed
 * there was a real ussage of 2000 bytes and A consumed 2000 bytes as well.
 *
 * Second row means from time 2 to 3, usage belongs to B. B was reset when a
 * real consumption of 3000 bytes was done and removed when actual consumption
 * of 5000 was. So the total for B is 5000 - 3000 = 2000, the offset value.
 *
 * Third means from time 3 to 4, usage belongs to A again and, at the moment
 * of switching, the real usage was 6000 so the SIM usage is the new usage
 * from the former SIM to this (6000 - 5000 = 1000) plus the usage the same
 * SIM had before, this is, the last offset of the last tag with same SIM
 * (1000 + 2000 = 3000).
 *
 * Fourth means from time 4 to 72, usage belongs to B again.
 * Current value: 16000
 * Offset value: new usage + last offset = (16000 - 6000) + 2000 = 12000
 *
 * The last one means sim A was inserted at time 48 and is currently inserted.
 *
 * This example show how the limitations affect the frontend. Limitation 1 avoid
 * us to make a API reset because we were erasing all data including that not
 * belonging to us.
 *
 * Limitation 2 compels us to get the total usage by day. There is no doubt
 * about which SIM used the mobile interface for day 2 (time 24 to 48). It was
 * SIM B but, what happend during day 1 (time 0 to 24) or day 3 (time 48 to 72)?
 *
 * The module involves three mechanisms:
 * =====================================
 *
 * 1- Building the list of tags
 * ----------------------------
 * In order to build the list of tags, the module should be informed as soon as
 * the device is started to check if a SIM change was made. If so, the last tag
 * is closed and a new one open.
 *
 * Closing a tag is to compute current and offset values and set the end date.
 * Opening a tag is to add a new tag object with the SIM id and the start date.
 *
 * > current value is got by asking Statistics API for the actual value at the
 *   moment of the switch.
 *
 * > offset value is calculated by:
 *   a) if there is a fixing value -> offset = actual - fixing
 *   b) if there is only one tag   -> offset = actual
 *   c) if there is more than one, -> offset =
 *      (actual - <previous tag's current>) + <last tag with same SIM's offset>
 *
 * 2- Setting a fixing value
 * -------------------------
 * To simulate a reset, we need to take in count the amount spent at that moment
 * and keep it to correct the consumption of that SIM. This is done by setting
 * the fixing value to the real data spent at the moment of the reset.
 * This operation is not here but in the common.js module due to should be
 * accessed from several entry points of the application. Take a look at
 * resetData() method.
 *
 * In addition, when a reset is done, former references to the same SIM in the
 * tag list are deleted keeping the list short.
 *
 * 3- Getting the usage for a SIM in a goal date
 * ---------------------------------------------
 * To get this value we need to retrieve an ordered subset of the tag list
 * labelling the goal date. We say a tag labels a date if:
 *   a) tag's start or end refer to the same day as date or
 *   b) date is between tag's start and tag's end or
 *   c) date is latter then tag's start and there is no tag's end
 *
 * Now passing through this subset in reverse order we look for the first tag
 * with the SIM required. Two cases can occur:
 *   a) if the tag has no end or the end is not the goal date, -> usage =
 *      (actual - <previous tag's current>) + <last tag with same SIM's offset>
 *   b) else -> usage = tag's offset
 *
 * Conclussions
 * ============
 * With these 3 mechanisms we can provide accurate data usage statistics about
 * which SIM spent what data in the device. It is impossible to know about
 * consumption out of the device.
 *
 * Current implementation is not optimal in terms of space not time but it
 * has been made to meet scheduling constrins.
 */

var MindGap = (function() {

  'use strict';

  function inStandAloneMode() {
    return window.parent.location.pathname === '/handle_gaps.html';
  }

  // Gets the tag list and currentUsage and pass it to the callback
  function updateTagList(newSIM) {
    var now = new Date();
    asyncStorage.getItem('dataUsageTags', function _onTags(tags) {
      tags = tags || [];
      var request = window.navigator.mozNetworkStats.getNetworkStats({
        start: now,
        end: now,
        connectionType: 'mobile'
      });
      request.onsuccess = function _onStats() {
        var data = request.result.data[0];
        var currentDataUsage = (data.rxBytes ? data.rxBytes : 0) +
                               (data.txBytes ? data.txBytes : 0);


        // Now close the last tag and open new
        closeLastTag(tags, currentDataUsage, now);
        openNewTag(tags, newSIM, now);
        debug('After: ' + JSON.stringify(tags));

        // Finally store tags again
        asyncStorage.setItem('dataUsageTags', tags, function _done() {
          asyncStorage.setItem('lastSIM', newSIM);
        });
      };
    });
  }

  // Adds a new tag to the taglist
  function openNewTag(tags, newSIM, when) {
    tags.push({ sim: newSIM, start: when });
  }

  // Adds fields end, actual and offset to current opened tag
  function closeLastTag(tags, currentDataUsage, when) {
    if (!tags.length)
      return;

    var tag = tags[tags.length - 1];
    tag.actual = currentDataUsage;

    if (tag.fixing !== undefined) {
      tag.offset = tag.actual - tag.fixing;

    } else if (tags.length < 2) {
      tag.offset = tag.actual;

    } else {
      var sim = tag.sim;
      var previous = tags[tags.length - 2];
      tag.offset = (tag.actual - previous.actual) + getLastOffset(sim, tags);
    }

    tag.end = when; // XXX: close at the end. Very important!
  }

  // Return the offset of the last time the same SIM was in use
  function getLastOffset(referenceSIM, tags) {
    for (var i = tags.length - 1; i >= 0; i--) {
      var ctag = tags[i];
      if (ctag.sim === referenceSIM && ctag.end !== undefined)
        return ctag.offset;
    }
    return 0;
  };

  // Return the usage for the inserted SIM for a date
  function getUsage(tags, currentUsage, date) {
    var tag = tags[tags.length - 1];
    var sim = tag.sim;
    var todayTags = getTagsForDate(tags, date);

    var usage; // undefined is a valid value (means no data for that date)
    for (var i = todayTags.length - 1; i >= 0; i--) {
      var ctag = todayTags[i];
      if (ctag.sim === tag.sim) {

        // Opened tag
        if (ctag.end === undefined || !sameDate(date, ctag.end)) {
          var prevUsage = tags[i - 1] === undefined ? 0 : tags[i - 1].actual;
          usage = currentUsage - prevUsage + getLastOffset(sim, todayTags);

        // Closed tag
        } else {
          usage = ctag.offset;
        }
        return usage;
      }
    }
    return usage;
  }

  // Return the tags for a date according to the criteria introduces before.
  // We say a tag labels a date if:
  //  a) tag's start or end refer to the same day as date or
  //  b) date is between tag's start and tag's end or
  //  c) date is latter then tag's start and there is no tag's end
  function getTagsForDate(tags, date) {
    var time = date.getTime();
    var todayTags = [];
    for (var i = 0, len = tags.length; i < len; i++) {
      var tag = tags[i];
      if (sameDate(date, tag.start) || tag.end && sameDate(date, tag.end) ||
          tag.start.getTime() < time && tag.end === undefined ||
          tag.start.getTime() < time && time < tag.end.getTime())

        todayTags.push(tag);
    }
    return todayTags;
  }

  // Return true is dateA and dateB refer to the same day
  function sameDate(dateA, dateB) {
    return dateA.getYear() === dateB.getYear() &&
           dateA.getMonth() === dateB.getMonth() &&
           dateA.getDay() === dateB.getDay();
  }

  return {
    // Mechanism 1: build the tag list
    updateTagList: updateTagList,

    // Mechanism 2: see resetData() at common.js

    // Mechanism 3: get the usage for a SIM and date
    getUsage: getUsage
  };

}());
