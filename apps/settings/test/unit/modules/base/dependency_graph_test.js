'use strict';

suite('DependencyGraph', function() {
  suiteSetup(function(done) {
    testRequire(['modules/base/dependency_graph'], (DependencyGraph) => {
      this.DependencyGraph = DependencyGraph;
      done();
    });
  });

  setup(function() {
    this.graph = this.DependencyGraph();
  });

  suite('getAllDependent', function() {
    test('a->b, b->c', function() {
      this.graph.addDependency('a', 'b');
      this.graph.addDependency('b', 'c');
      assert.sameMembers(this.graph.getAllDependent('a'), []);
      assert.sameMembers(this.graph.getAllDependent('b'), ['a']);
      assert.sameMembers(this.graph.getAllDependent('c'), ['a', 'b']);
    });

    test('b->c, c->a', function() {
      this.graph.addDependency('b', 'c');
      this.graph.addDependency('a', 'b');
      assert.sameMembers(this.graph.getAllDependent('a'), []);
      assert.sameMembers(this.graph.getAllDependent('b'), ['a']);
      assert.sameMembers(this.graph.getAllDependent('c'), ['a', 'b']);
    });

    test('a->b, b->c, d->b', function() {
      this.graph.addDependency('a', 'b');
      this.graph.addDependency('b', 'c');
      this.graph.addDependency('d', 'b');
      assert.sameMembers(this.graph.getAllDependent('a'), []);
      assert.sameMembers(this.graph.getAllDependent('b'), ['a', 'd']);
      assert.sameMembers(this.graph.getAllDependent('c'), ['a', 'b', 'd']);
    });

    test('a->b, b->c, b->d, b->e, d->f, e->f', function() {
      this.graph.addDependency('a', 'b');
      this.graph.addDependency('b', 'c');
      this.graph.addDependency('b', 'd');
      this.graph.addDependency('b', 'e');
      this.graph.addDependency('d', 'f');
      this.graph.addDependency('e', 'f');
      assert.sameMembers(this.graph.getAllDependent('a'), []);
      assert.sameMembers(this.graph.getAllDependent('b'), ['a']);
      assert.sameMembers(this.graph.getAllDependent('c'), ['a', 'b']);
      assert.sameMembers(this.graph.getAllDependent('d'), ['a', 'b']);
      assert.sameMembers(this.graph.getAllDependent('e'), ['a', 'b']);
      assert.sameMembers(this.graph.getAllDependent('f'), ['a', 'b', 'd', 'e']);
    });
  });

  suite('throws when a circular dependency is detected', function() {
    test('a->b, b->a', function() {
      this.graph.addDependency('a', 'b');
      assert.throw(() => {
        this.graph.addDependency('b', 'a');
      }, Error, 'circular dependency detected! b -> a -> b');
    });

    test('a->b, c->a, b->c', function() {
      this.graph.addDependency('a', 'b');
      this.graph.addDependency('c', 'a');
      assert.throw(() => {
        this.graph.addDependency('b', 'c');
      }, Error, 'circular dependency detected! b -> c -> a -> b');
    });

    test('a->b, c->d, d->a, b->c', function() {
      this.graph.addDependency('a', 'b');
      this.graph.addDependency('c', 'd');
      this.graph.addDependency('d', 'a');
      assert.throw(() => {
        this.graph.addDependency('b', 'c');
      }, Error, 'circular dependency detected! b -> c -> d -> a -> b');
    });
  });
});
