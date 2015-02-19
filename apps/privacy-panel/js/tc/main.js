/**
 * Transparency Control panel.
 *
 * @module TcPanel
 * @return {Object}
 */
define([
  'panels',
  'tc/applications',
  'tc/permissions'
],

function(panels, applicationsPanel, permissionsPanel) {
  'use strict';

  /**
   * Transparency Control panel.
   *
   * @constructor
   */
  function TcPanel() {}

  TcPanel.prototype = {

    /**
     * Initialize the Transparency Control panel and its sub-panels.
     *
     * @method init
     */
    init: function init() {
      panels.loadJSON('resources/permissions_table.json', data => {
        applicationsPanel.init(data);
        permissionsPanel.init(data);
      });
    }

  };

  return new TcPanel();
});
