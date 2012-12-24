(function(globals) {
	"use strict";

	globals.App.requireConfig();

	require(['tko', 'knockout', 'viewModels/HelloWorld', 'viewModels/Home', 'viewModels/People'], function(tko, ko, HelloWorld, Home, People) {
		var app = new tko.App(function() {
			var self = this;
			
			self.initialized = ko.observable(false);

			self.home = new Home(self);
			self.hello = new HelloWorld(self);
			self.people = new People(self);

			self.page('home', self.home, true);
			self.page('hello', self.hello);
			self.page('people', self.people);

			self.subscribe('app.initialized', function() {
				self.initialized(true);
			});
		});
	});

}(window));
