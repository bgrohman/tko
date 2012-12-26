(function(globals) {
	"use strict";

	globals.App.requireConfig();

	require(['tko', 'knockout', 'viewModels/HelloWorld', 'viewModels/Home', 'viewModels/Todos'], function(tko, ko, HelloWorld, Home, Todos) {
		var app = new tko.App({
			pages: [
				{id: 'home', name: 'Home', route: 'home', ViewModel: Home, isDefault: true},
				{id: 'hello', name: 'Hello', route: 'hello', ViewModel: HelloWorld},
				{id: 'todos', name: 'Todos', route: 'todos', ViewModel: Todos}
			],
			routes: {
				'foo/:bar': function(bar) {
					console.log('foo', bar);
				}
			},
			initialized: ko.observable(false)
		});

		app.subscribe('app.initialized', function() {
			app.initialized(true);
		});
	});

}(window));
