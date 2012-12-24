define(['underscore', 'knockout', 'models/Todo'], function(_, ko, Todo) {
	"use strict";

	return function Todos(app) {
		var self = this,
			resorting = false,
			rawTodos = [
				{label: 'Take out the trash', priority: 1},
				{label: 'Walk the dog', priority: 2}
			];

		self.visible = ko.observable(false);

		self.todos = ko.observableArray(_.map(rawTodos, function(t) {
			return new Todo(t);
		}));

		self.form = {
			label: ko.observable()
		};

		function getHighestPriority() {
			var priorities = _.pluck(_.map(self.todos(), function(t) { return t.toJS(); }), 'priority');
			priorities.sort();
			return priorities[priorities.length - 1];
		}

		function sort() {
			self.todos.sort(function(a, b) {
				return a.priority() - b.priority();
			});
		}

		self.up = function(todo) {
			var currentPriority = todo.priority(),
				matchingPriority;

			if (currentPriority > 1) {
				matchingPriority = _.find(self.todos(), function(t) {
					return t.priority() === currentPriority - 1;
				});

				if (matchingPriority) {
					matchingPriority.priority(currentPriority);
				}

				todo.priority(currentPriority - 1);
				sort();
			}
		};

		self.down = function(todo) {
			var currentPriority = todo.priority(),
				matchingPriority;

			if (currentPriority < getHighestPriority()) {
				matchingPriority = _.find(self.todos(), function(t) {
					return t.priority() === currentPriority + 1;
				});

				if (matchingPriority) {
					matchingPriority.priority(currentPriority);
				}

				todo.priority(currentPriority + 1);
				sort();
			}
		};

		self.remove = function(todo) {
			self.todos.remove(todo);

			_.each(self.todos(), function(t, i) {
				t.priority(i + 1);
			});
		};

		self.add = function() {
			var t = new Todo({
				label: self.form.label(),
				priority: getHighestPriority() + 1
			});
			self.todos.push(t);

			app.notify('success', '"' + t.label() + '" added.', 5000);
			self.form.label('');
		};

		self.cancel = function() {
			self.form.first('');
			self.form.last('');
		};
	};
});
