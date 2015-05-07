/**
 * DependencyGraph is a basic data structure that helps decide the evaluation
 * order of a certain node.
 *
 * @module modules/base/dependency_graph
 */
define(function(require) {
  'use strict';

  var Module = require('modules/base/module');

  /**
   * @class DependencyGraph
   * @requires module:modules/base/module
   * @params {DependencyGraph} dpGraph
   *                           The newly created graph will be initialized using
   *                           dpGraph.
   * @returns {DependencyGraph}
   */
  var DependencyGraph = Module.create(function DependencyGraph(dpGraph) {
    this._nodes = dpGraph ? JSON.parse(JSON.stringify(dpGraph._nodes)) : {};
  });

  /**
   * Print the content of the nodes for debugging.
   *
   * @access private
   * @memberOf DependencyGraph.prototype
   */
  DependencyGraph.prototype._printNodes = function dg_printNodes() {
    Object.keys(this._nodes).forEach((name) => {
      var node = this._nodes[name];
      console.log('name: ' + name);
      console.log('children: ' +
      node.children.reduce((result, name) => {
        return result + ' ' + name;
      }, ''));
      console.log('dependent nodes: ' +
      node.dependentNodes.reduce((result, name) => {
        return result + ' ' + name;
      }, ''));
      console.log('======================');
    });
  };

  /**
   * Traverse the tree and add the dependent nodes to all nodes in the path.
   *
   * @access private
   * @memberOf DependencyGraph.prototype
   * @param {Object} node
   *                 The node that we have new dependent nodes to add to.
   * @param {Array} dependentNodes
   *                New dependent nodes to add.
   */
  DependencyGraph.prototype._addDependentNodes =
    function dg_addDependentNodes(node, dependentNodes, traversedNodes) {
      traversedNodes = traversedNodes || [];
      if (traversedNodes.indexOf(node.name) >= 0) {
        traversedNodes.push(node.name);
        var error = traversedNodes.join(' -> ');
        this.throw('circular dependency detected! ' + error);
      }

      if (dependentNodes) {
        // add all nodes in "dependendNodes" to the current node
        dependentNodes.forEach((name) => {
          if (node.dependentNodes.indexOf(name) < 0) {
            node.dependentNodes.push(name);
          }
        });
      } else {
        // Nothing to add, prepare the nodes to be added to the children.
        dependentNodes = Array.prototype.slice.call(node.dependentNodes);
      }

      dependentNodes.push(node.name);
      traversedNodes.push(node.name);
      node.children.forEach((name) => { 
        this._addDependentNodes(this._nodes[name], dependentNodes,
          traversedNodes);
      });
      dependentNodes.pop();
      traversedNodes.pop();
  };

  /**
   * Add dependency. Calling to this function adds a dependency from the first
   * parameter towards the second one.
   *
   * @access public
   * @memberOf DependencyGraph.prototype
   * @param {String} name1
   *                 The name that depends on the other.
   * @param {String} name2
   *                 The name that is being depended on.
   */
  DependencyGraph.prototype.addDependency = function dg_addDep(name1, name2) {
    var node1 = this._nodes[name1];
    var node2 = this._nodes[name2];

    if (!node1) {
      node1 = this._nodes[name1] = {
        name: name1,
        children: [],
        dependentNodes: []
      };
    }

    if (!node2) {
      node2 = this._nodes[name2] = {
        name: name2,
        children: [],
        dependentNodes: []
      };
    }

    if (node1.children.indexOf(name2) < 0) {
      node1.children.push(name2);
      this._addDependentNodes(node1);
    }
  };

  /**
   * Get all dependent names of a name.
   *
   * @access public
   * @memberOf DependencyGraph.prototype
   * @param {String} name
   */
  DependencyGraph.prototype.getAllDependent = function dg_getAllDep(name) {
    var node = this._nodes[name];
    return node && node.dependentNodes;
  };

  return DependencyGraph;
});
