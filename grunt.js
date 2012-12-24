/*global module:false*/
module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		meta: {
			version: '0.1.0',
			banner: '/*! tko - v<%= meta.version %> - ' +
					'<%= grunt.template.today("yyyy-mm-dd") %>\n' +
					'* https://github.com/bgrohman/tko\n' +
					'* Copyright (c) <%= grunt.template.today("yyyy") %> ' +
					'Bryan Grohman; Licensed MIT */'
		},
		lint: {
			files: ['grunt.js', 'src/**/*.js']
		},
		qunit: {
			files: ['test/**/*.html']
		},
		concat: {
			dist: {
				src: ['<banner:meta.banner>', 'src/tko.js'],
				dest: 'dist/tko-latest.min.js'
			}
		},
		min: {
			dist: {
				src: ['<banner:meta.banner>', '<config:concat.dist.dest>'],
				dest: 'dist/tko-latest.min.js'
			}
		},
		watch: {
			files: '<config:lint.files>',
			tasks: 'lint qunit'
		},
		jshint: {
			options: {
				curly: true,
				eqeqeq: true,
				immed: true,
				latedef: true,
				newcap: true,
				noarg: true,
				sub: true,
				undef: true,
				boss: true,
				eqnull: true,
				browser: true
			},
			globals: {
				define: true,
				require: true
			}
		},
		uglify: {}
	});

	// Default task.
	grunt.registerTask('default', 'lint qunit concat min');
};
