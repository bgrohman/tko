define(['underscore', 'tko', 'models/Todo'], function(_, tko, Todo) {
	"use strict";

	return tko.Collection.extend({
		url: '/todos',
		model: Todo,
		sortBy: 'priority',

		getHighestPriority: function() {
			var priorities = _.pluck(_.map(this.values(), function(t) { return t.toJS(); }), 'priority');
			priorities.sort();
			return priorities[priorities.length - 1];
		},

		incrementPriority: function(todo) {
			var currentPriority = todo.priority(),
				matchingPriority;

			if (currentPriority > 1) {
				matchingPriority = _.find(this.values(), function(t) {
					return t.priority() === currentPriority - 1;
				});

				if (matchingPriority) {
					matchingPriority.priority(currentPriority);
				}

				todo.priority(currentPriority - 1);
				this.values.valueHasMutated();
			}
		},

		decrementPriority: function(todo) {
			var currentPriority = todo.priority(),
				matchingPriority;

			if (currentPriority < this.getHighestPriority()) {
				matchingPriority = _.find(this.values(), function(t) {
					return t.priority() === currentPriority + 1;
				});

				if (matchingPriority) {
					matchingPriority.priority(currentPriority);
				}

				todo.priority(currentPriority + 1);
				this.values.valueHasMutated();
			}
		}
	});
});
