
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
 * is closed and a new one is open.
 *
 * Closing a tag is to compute current and offset values and set the end date.
 * Opening a tag is to add a new tag object with the SIM id and the start date.
 *
 * When closing, we get tags labelling the current date. We say a tag labels a
 * date if:
 *   a) tag's start or end refer to the same day as date or
 *   b) date is between tag's start and tag's end or
 *   c) date is latter than tag's start and there is no tag's end
 *
 * At least one (the last and current) is retrieved. Now:
 *
 * > current value is got by asking Statistics API for the actual value at the
 *   moment of the switch.
 *
 * > offset value is calculated by:
 *   a) if there is a fixing value for now -> offset = actual - fixing
 *   b) if there is only one tag           -> offset = actual
 *   c) if there is more than one,         -> offset =
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
 * labelling the goal date.
 *
 * Now passing through this subset in reverse order we look for the first tag
 * with the SIM required. Several cases can occur:
 *   a) the tag has no end or the end is not the goal date, -> usage =
 *
 *     (actual - <previous tag's actual>*) + <last tag with same SIM's offset>**
 *       if there is no fixing value for the goal date
 *
 *     actual - <fixing value for goal date>
 *       if there is a fixing value for the goal date
 *
 *   ( *) Or 0 if there is no previous tag
 *   (**) Or 0 if there is no a closed tag
 *
 *   b) the tag is closed -> usage = tag's offset
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

  // Closes the current tag and open a new one
  function updateTagList(newSIM) {
    var now = new Date();
    asyncStorage.getItem('dataUsageTags', function _onTags(tags) {
      tags = tags || [];
      var request = NetworkstatsProxy.getNetworkStats({
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
        debug('After: ', tags);

        // Finally store tags again
        asyncStorage.setItem('dataUsageTags', tags, function _done() {
          asyncStorage.setItem('lastSIM', newSIM);
        });
      };
    });
  }

  // Adds a new tag to the taglist
  function openNewTag(tags, newSIM, when) {
    tags.push({ sim: newSIM, start: when, fixing: [] });
  }

  // Adds fields end, actual and offset to current open tag
  function closeLastTag(allTags, currentDataUsage, when) {
    if (!allTags.length) {
      return; // nothing to close, trivially closed
    }

    var tag = allTags[allTags.length - 1];
    tag.actual = currentDataUsage;

    var tags = getTagsForDate(allTags, when);
    if (!tags.length) {
      console.error('Impossible, we should be closing an unexistent tag.');
      return;
    }

    if (tags.length < 2) {
      tag.offset = tag.actual;

    } else {
      var fixing = getFixingFor(when, tag.fixing);
      if (fixing !== null) {
        tag.offset = tag.actual - fixing;
      } else {
        var sim = tag.sim;
        var previous = tags[tags.length - 2];
        tag.offset = (tag.actual - previous.actual) +
                      getLastClosedOffset(sim, tags);
      }
    }

    tag.end = when; // XXX: close at the end. Very important!
  }

  // Return the offset of the last closed tag for the reference SIM
  function getLastClosedOffset(referenceSIM, tags) {
    for (var i = tags.length - 1; i >= 0; i--) {
      var ctag = tags[i];
      if (ctag.sim === referenceSIM && ctag.end !== undefined) {
        return ctag.offset;
      }
    }
    return 0;
  };

  // Return the usage for the inserted SIM for a date
  function getUsage(tags, currentUsage, date) {
    debug('Current TAGS:', tags);
    debug('Current date:', date);
    debug('Current usage:', currentUsage);

    var tag = tags[tags.length - 1];
    var sim = tag.sim;
    var dateTags = getTagsForDate(tags, date);

    debug('Last tag:', tag);
    var usage; // XXX: undefined is a valid value (means no data for that date)
    for (var i = dateTags.length - 1; i >= 0; i--) {
      var ctag = dateTags[i];
      if (ctag.sim === tag.sim) {
        debug('Same SIM tag:', ctag);

        // Open tag
        if (ctag.end === undefined || !sameDate(date, ctag.end)) {
          debug('Open tag case.');

          var fixing = getFixingFor(date, ctag.fixing);
          if (fixing !== null) {
            debug('Fixing with:', fixing);
            usage = currentUsage - fixing;

          } else {
            var prevUsage = dateTags[i - 1] === undefined ? 0 :
                            dateTags[i - 1].actual;
            var offset = getLastClosedOffset(sim, dateTags);
            debug('Previous usage:', prevUsage);
            debug('Last same SIM usage:', offset);
            usage = currentUsage - prevUsage + offset;
          }

        // Closed tag
        } else {
          debug('Closed tag case. Taking offset:', ctag.offset);
          usage = ctag.offset;
        }
        return usage;
      }
    }
    debug('No tag found!');
    return usage;
  }

  // Return the tags for a date according to the criteria introduces before.
  // We say a tag labels a date if:
  //  a) tag's start or end refer to the same day as date or
  //  b) date is between tag's start and tag's end or
  //  c) date is latter then tag's start and there is no tag's end
  function getTagsForDate(tags, date) {
    var time = date.getTime();
    var dateTags = [];
    for (var i = 0, len = tags.length; i < len; i++) {
      var tag = tags[i];
      if (sameDate(date, tag.start) || tag.end && sameDate(date, tag.end) ||
          tag.start.getTime() < time && tag.end === undefined ||
          tag.start.getTime() < time && time < tag.end.getTime()) {

        dateTags.push(tag);
      }
    }
    return dateTags;
  }

  // Return true is dateA and dateB refer to the same day
  function sameDate(dateA, dateB) {
    return dateA.getFullYear() === dateB.getFullYear() &&
           dateA.getMonth() === dateB.getMonth() &&
           dateA.getDate() === dateB.getDate();
  }

  // Return the fixing value for a date given a list of fixing pairs
  function getFixingFor(date, fixingList) {
    fixingList = fixingList || [];
    for (var i = fixingList.length - 1; i >= 0; i--) {
      var cfixing = fixingList[i];
      if (sameDate(cfixing[0], date)) {
        return cfixing[1];
      }
    }
    return null;
  }

  return {
    // Mechanism 1: build the tag list
    updateTagList: updateTagList,

    // Mechanism 2: see resetData() at common.js

    // Mechanism 3: get the usage for a SIM and date
    getUsage: getUsage
  };

}());
