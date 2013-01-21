define(['underscore', 'tko', 'models/Todo'], function(_, tko, Todo) {
	"use strict";

	return tko.Collection.extend({
		url: '/todos',
		model: Todo,
		sortBy: 'priority',

		getHighestPriority: function() {
			var priorities = _.pluck(_.map(this.values(), function(t) { return t.toJS(); }), 'priority');

			if (!_.isEmpty(priorities)) {
				priorities.sort();
				return priorities[priorities.length - 1];
			}

			return 0;
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

				this.saveAll().done(function() {
					console.log('all todos saved');
				});
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

				this.saveAll().done(function() {
					console.log('all todos saved');
				});
			}
		}
	});
});
