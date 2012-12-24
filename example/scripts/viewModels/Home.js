define(['knockout'], function(ko) {
	"use strict";

	return function Home(app) {
		var self = this;

		self.visible = ko.observable(false);
	};
});
