module.exports = function(grunt) {
	'use strict';

  // Project configuration.
  grunt.initConfig({
	clean : ['doc'],
    jsdoc : {
		basic: {
			src: ['tasks/**.js', 'tasks/lib/*.js'],
			options: {
				destination: 'doc/basic'
			}
		},
        docstrap : {
            src: ['tasks/**.js', 'tasks/lib/*.js', 'README.md'],
            options:{
				destination: 'doc/docstrap',
                template: "node_modules/ink-docstrap/template",
                configure: "node_modules/ink-docstrap/template/jsdoc.conf.json"
			}
        }
	},
	nodeunit : {
        unit : ['test/jsdoc-plugin_test.js'],
        basic : ['test/jsdoc-basic_test.js'],
        docstrap : ['test/jsdoc-docstrap_test.js']
	},
	jshint : {
		files : ['Gruntfile.js', 'tasks/*.js', 'tasks/lib/*.js', 'test/*.js'],
		options: {
			node : true,
			smarttabs : true
		}
	}
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // Load local tasks.
  grunt.loadTasks('tasks');

  // Default task.
  grunt.registerTask('default', ['jshint', 'test']);

  //testing tasks
  grunt.registerTask('test-basic', ['jsdoc:basic', 'nodeunit:basic']);
  grunt.registerTask('test-docstrap', ['jsdoc:docstrap', 'nodeunit:docstrap']);
  grunt.registerTask('test', ['clean', 'nodeunit:unit', 'test-basic', 'test-docstrap']);
  
};
