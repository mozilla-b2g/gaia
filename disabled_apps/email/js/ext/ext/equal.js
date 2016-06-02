/**
 * Sane equivalence checking, originally from loggest's rdcommon/log.js.
 */

/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at:
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Raindrop Code.
 *
 * The Initial Developer of the Original Code is
 *   The Mozilla Foundation
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Andrew Sutherland <asutherland@asutherland.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * This module exports a single comparison function:
 *
 *   equal(a, b) -> boolean
 *
 */
define(function(require) {

  /**
   * Maximum comparison depth for argument equivalence in expectation checking.
   *  This value gets bumped every time I throw something at it that fails that
   *  still seems reasonable to me.
   */
  var COMPARE_DEPTH = 6;

  function boundedCmpObjs(a, b, depthLeft) {
    var aAttrCount = 0, bAttrCount = 0, key, nextDepth = depthLeft - 1;

    if ('toJSON' in a)
      a = a.toJSON();
    if ('toJSON' in b)
      b = b.toJSON();

    for (key in a) {
      aAttrCount++;
      if (!(key in b))
        return false;

      if (depthLeft) {
        if (!equal(a[key], b[key], nextDepth))
          return false;
      }
      else {
        if (a[key] !== b[key])
          return false;
      }
    }
    // the theory is that if every key in a is in b and its value is equal, and
    //  there are the same number of keys in b, then they must be equal.
    for (key in b) {
      bAttrCount++;
    }
    if (aAttrCount !== bAttrCount)
      return false;
    return true;
  }

  /**
   * @return[Boolean]{
   *   True when equivalent, false when not equivalent.
   * }
   */
  function equal(a, b, depthLeft) {
    if (depthLeft === undefined) {
      depthLeft = COMPARE_DEPTH;
    }
    var ta = typeof(a), tb = typeof(b);
    if (ta !== 'object' || (tb !== ta) || (a == null) || (b == null))
      return a === b;
    // fast-path for identical objects
    if (a === b)
      return true;
    if (Array.isArray(a)) {
      if (!Array.isArray(b))
        return false;
      if (a.length !== b.length)
        return false;
      for (var iArr = 0; iArr < a.length; iArr++) {
        if (!equal(a[iArr], b[iArr], depthLeft - 1))
          return false;
      }
      return true;
    }
    return boundedCmpObjs(a, b, depthLeft);
  }

  return equal;

}); // end define
