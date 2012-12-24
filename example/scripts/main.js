(function(globals) {
	"use strict";

	globals.App.requireConfig();

	require(['tko', 'knockout', 'viewModels/HelloWorld', 'viewModels/Home', 'viewModels/Todos'], function(tko, ko, HelloWorld, Home, Todos) {
		var app = new tko.App(function() {
			var self = this;
			
			self.initialized = ko.observable(false);

			self.home = new Home(self);
			self.hello = new HelloWorld(self);
			self.todos = new Todos(self);

			self.page('home', self.home, true);
			self.page('hello', self.hello);
			self.page('todos', self.todos);

			self.subscribe('app.initialized', function() {
				self.initialized(true);
			});
		});
	});

}(window));
