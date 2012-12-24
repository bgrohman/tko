define(
	[
		'underscore',
		'knockout',
		'tko'
	],

	function(underscore, ko, tko) {
		"use strict";

		return tko.Model.extend({
			urlRoot: '/todo',
			label: ko.observable(),
			priority: ko.observable()
		});
	}
);
