(function(globals) {
	"use strict";

	var App = globals.App = globals.App || {};

	App.requireConfig = function(baseUrl) {
		var config = {
			paths: {
				'tko': '../../src/tko',
				'amplify': 'lib/amplify-1.1.min',
				'bootstrap': 'lib/bootstrap/js/bootstrap.min',
				'jquery': 'lib/jquery-1.8.3.min',
				'knockout': 'lib/knockout-2.1.0.debug',
				'knockout-mapping': 'lib/knockout.mapping-2.3.5',
				'routie': 'lib/routie-0.3.0.min',
				'underscore': 'lib/underscore-1.4.2.min'
			},
			shim: {
				'amplify': {
					exports: 'amplify',
					deps: ['jquery']
				},
				'bootstrap': {
					deps: ['jquery']
				},
				'routie': {
					exports: 'routie'
				},
				'underscore': {
					exports: '_'
				}
			}
		};

		if (baseUrl) {
			config.baseUrl = baseUrl;
		}

		require.config(config);
	};

}(window));
