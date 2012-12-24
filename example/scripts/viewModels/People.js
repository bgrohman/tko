define(['underscore', 'knockout', 'models/Person'], function(_, ko, Person) {
	"use strict";

	return function People(app) {
		var self = this,
			rawPeople = [
				{first: 'Bryan', last: 'Grohman'},
				{first: 'John', last: 'Doe'},
				{first: 'Jane', last: 'Doe'}
			];

		self.visible = ko.observable(false);

		self.people = ko.observableArray(_.map(rawPeople, function(p) {
			return new Person({
				first: p.first,
				last: p.last
			});
		}));

		self.form = {
			first: ko.observable(),
			last: ko.observable()
		};

		self.add = function() {
			var p = new Person({
				first: self.form.first(),
				last: self.form.last()
			});
			self.people.push(p);

			app.notify('success', p.first() + ' ' + p.last() + ' added.', 5000);
			self.form.first('');
			self.form.last('');
		};

		self.cancel = function() {
			self.form.first('');
			self.form.last('');
		};
	};
});
