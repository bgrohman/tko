/*! tko - v0.2.0 - 2013-01-08
* https://github.com/bgrohman/tko
* Copyright (c) 2013 Bryan Grohman; Licensed MIT */

(function(root, factory) {
	"use strict";
	if (typeof define === 'function' && define.amd) {
		define(['underscore', 'knockout', 'jquery', 'amplify', 'routie', 'bootstrap'], factory);
	} else {
		root.tko = factory(root._, root.ko, root.$, root.amplify, root.routie);
	}
}(this, function(_, ko, $, amplify, routie) {
	"use strict";

	var templates = {
		'nav': [
			'<div class="navbar">',
				'<div class="navbar-inner">',
					'<!-- ko if: defaultPage -->',
						'<a class="brand" data-bind="text: defaultPage().name, attr: {href: defaultPage().href}"></a>',
					'<!-- /ko -->',
					'<ul class="nav" data-bind="foreach: pages">',
						'<!-- ko ifnot: isDefault -->',
							'<li data-bind="if: !isDefault(), css: {active: visible}">',
								'<a data-bind="text: name, attr: {href: href}"></a>',
							'</li>',
						'<!-- /ko -->',
					'</ul>',
				'</div>',
			'</div>'
		].join('')
	};

	/**
	 * Base Model constructor. Should not be used directly. Use Model.extend
	 * to create new constructors.
	 */
	function Model() {
		var self = this;

		self.urlRoot = null;
		self.id = null;

		/**
		 * Copies the properties of the from object to this Model. Only this
		 * Model's observables will be set. The id will be set if it has not
		 * already been set.
		 * @param from the object from which to copy properties
		 */
		self.setProperties = function(from) {
			var fromObj,
				selfVal,
				fromVal;

			if (!_.isUndefined(from) && !_.isNull(from)) {
				fromObj = ko.toJS(from);

				_.each(_.keys(self), function(key) {
					if (key !== 'id') {
						selfVal = self[key];

						if (ko.isObservable(selfVal)) {
							fromVal = fromObj[key];

							if (!_.isUndefined(fromVal)) {
								selfVal(fromVal);
							}
						}
					}
				});

				if (!_.isUndefined(fromObj.id)) {
					if (_.isNull(self.id)) {
						self.id = ko.observable(fromObj.id);
					}
				}
			}
		};

		/**
		 * Returns a plain object without observables representing this Model.
		 * @returns a plain object
		 */
		self.toJS = function() {
			var obj = {};

			_.each(_.keys(self), function(key) {
				if (ko.isObservable(self[key])) {
					obj[key] = self[key]();
				}
			});

			return obj;
		};

		/**
		 * Saves or updates this model. Generates a POST or PUT using this 
		 * Model's urlRoot.
		 */
		self.save = function() {
			var id,
				url,
				requestType,
				request;

			if (_.isUndefined(self.id) || _.isNull(self.id)) {
				requestType = 'POST';
				url = self.urlRoot;
			} else {
				requestType = 'PUT';
				id = ko.isObservable(self.id) ? self.id() : self.id;
				url = self.urlRoot + '/' + id;
			}

			request = $.ajax({
				type: requestType,
				url: url,
				cache: false,
				data: self.toJS(),
				dataType: 'json'
			});

			request.done(function(data) {
				if (!_.isUndefined(data.id)) {
					self.id = ko.observable(data.id);
				}
			});

			return request;
		};

		/**
		 * Deletes this Model. Generates a DELETE request using this Model's 
		 * urlRoot.
		 */
		self.destroy = function() {
			var id;

			if (!_.isUndefined(self.id)) {
				id = ko.isObservable(self.id) ? self.id() : self.id;

				return $.ajax({
					type: 'DELETE',
					url: self.urlRoot + '/' + id,
					cache: false
				});
			}

			return null;
		};

		/**
		 * Populates this Model with data from the server. Generates a GET 
		 * request using this Model's urlRoot and sets the Model's properties
		 * using the response.
		 */
		self.fetch = function() {
			var request,
				id;

			if (!_.isUndefined(self.id)) {
				id = ko.isObservable(self.id) ? self.id() : self.id;

				request = $.ajax({
					type: 'GET',
					url: self.urlRoot + '/' + id,
					cache: false
				});

				request.done(function(data) {
					self.setProperties(data);
				});

				return request;
			}

			return null;
		};
	}

	/**
	 * Creates a new Model constructor.
	 * @param props the properties used by the new Model
	 * @returns a new Model constructor
	 */
	Model.extend = function(props) {
		return function(properties) {
			var model = new Model();
			_.each(props, function(val, key) {
				if (ko.isObservable(val)) {
					model[key] = ko.observable(val());
				} else {
					model[key] = val;
				}
			});
			model.setProperties(properties);
			return model;
		};
	};

	/**
	 * Base Collection implementation.
	 */
	function Collection() {
		var self = this,
			valueSubscription;

		self.url = null;
		self.model = null;
		self.values = ko.observableArray([]);

		function reSort() {
			self.sort();
		}
		valueSubscription = self.values.subscribe(reSort);

		function silently(f) {
			valueSubscription.dispose();
			f.call(self);
			valueSubscription = self.values.subscribe(reSort);
		}

		self.sortBy = ko.observable();
		self.sortBy.subscribe(function() {
			self.sort();
		});

		self.length = ko.computed(function() {
			return self.values().length;
		});

		/**
		 * Retrieves a model from this Collection by index.
		 * @param index
		 */
		self.at = function(index) {
			return self.values()[index];
		};

		/**
		 * Retrieves a model from this Collection by id.
		 * @param id
		 */
		self.get = function(id) {
			return _.find(self.values(), function(model) {
				return model.id && model.id() === id;
			});
		};

		/**
		 * Converts this Collection and its Models into plain objects.
		 */
		self.toJS = function() {
			return _.map(self.values(), function(model) {
				return model.toJS();
			});
		};

		/**
		 * Sorts this Collection.
		 */
		self.sort = function() {
			silently(function() {
				var sortProperty = self.sortBy();

				if (_.isString(sortProperty)) {
					self.values().sort(function(a, b) {
						var av = ko.toJS(a[sortProperty]),
							bv = ko.toJS(b[sortProperty]);

						return av > bv ? 1 : -1;
					});
				} else if (_.isFunction(sortProperty)) {
					self.values().sort(sortProperty);
				}

				self.values.valueHasMutated();
			});
		};

		/**
		 * Populates this Collection with new Models representing the items 
		 * returned from this Collection's url.
		 */
		self.fetch = function() {
			var request;

			request = $.ajax({
				type: 'GET',
				url: self.url,
				cache: false
			});

			request.done(function(data) {
				_.each(data, function(item) {
					silently(function() {
						var model = new self.model(item);
						self.values.push(model);
					});
				});

				self.sort();
			});

			return request;
		};
	}

	/**
	 * Creates a new Collection constructor.
	 * @param props the properties used by the new Collection
	 * @returns a new Collection constructor
	 */
	Collection.extend = function(props) {
		var restrictedProps = ['length'];

		return function(values) {
			var coll = new Collection();

			_.each(_.omit(props, restrictedProps), function(val, key) {
				if (ko.isObservable(coll[key])) {
					coll[key](ko.isObservable(val) ? val() : val);
				} else {
					coll[key] = ko.isObservable(val) ? val() : val;
				}
			});

			if (_.isArray(values)) {
				coll.values(_.map(values, function(value) {
					if (value instanceof Model) {
						return value;
					} 
					
					if (coll.model) {
						return new coll.model(value);
					}

					return _.clone(value);
				}));
			}

			return coll;
		};
	};

	/**
	 * View model for notifications.
	 */
	function Notifications(app) {
		var self = this,
			types = ['error', 'warning', 'success', 'info'],
			typeTemplate = [
				'<% _.each(types, function(type) { %>',
					'<div class="alert alert-<%= type %>" data-bind="visible: <%= type %>">',
						'<button type="button" class="close" data-bind="click: function() {clear(\'<%= type %>\');}">&times;</button>',
						'<span data-bind="text: <%= type %>"></span>',
					'</div>',
				'<% }) %>'
			].join('');

		self.template = [
			'<div id="notifications" data-bind="visible: visible">',
				_.template(typeTemplate, {types: types}),
			'</div>'
		].join('');

		_.each(types, function(type) {
			self[type] = ko.observable();
		});

		self.clear = function(type) {
			if (_.has(self, type)) {
				self[type](null);
			}
		};

		self.visible = ko.computed(function() {
			var messageKeys = ['error', 'warning', 'success', 'info'];
			return _.any(messageKeys, function(key) {
				var val = self[key]();
				return !(_.isUndefined(val) || _.isNull(val) || _.isEmpty(val));
			});
		});
	}

	/**
	 * Base view model for pages.
	 */
	function PageViewModel(app, page) {
		var self = this;

		self.isDefault = ko.observable(page.isDefault);
		self.visible = ko.observable(false);
		self.name = ko.observable(page.name);
		self.route = ko.observable(page.route);

		self.href = ko.computed(function() {
			return '#' + self.route();
		});
	}

	/**
	 * Creates a new App.
	 * @param next function to call during initialization with 'this' set to
	 * the new App.
	 */
	function App(def) {
		var self = this,
			initialized = false,
			notifyTimeouts = {};

		self.$root = $('#root');
		self.defaultPage = ko.observable();
		self.pages = [];
		self.navLinks = [];
		self.notifications = new Notifications(self);

		self.getPage = function(name) {
			return _.find(self.pages, function(vm) {
				return vm.name() === name;
			});
		};

		self.notify = function(type, msg, timeout) {
			if (_.has(self.notifications, type)) {
				if (notifyTimeouts[type]) {
					clearTimeout(notifyTimeouts[type]);
				}
				self.notifications[type](msg);

				if (_.isNumber(timeout)) {
					notifyTimeouts[type] = setTimeout(function() {
						self.notifications.clear(type);
						notifyTimeouts[type] = null;
					}, timeout);
				}
			}
		};

		self.publish = function(topic, msg) {
			amplify.publish(topic, msg);
		};

		self.subscribe = function(topic, callback) {
			if (topic === 'app.initialized' && initialized) {
				callback();
			} else {
				return amplify.subscribe(topic, callback);
			}
		};

		self.unsubscribe = function(topic, callback) {
			amplify.unsubscribe(topic, callback);
		};

		self.retrieveSetting = function(key) {
			return amplify.store(key);
		};

		self.saveSetting = function(key, val) {
			return amplify.store(key, val);
		};

		self.route = function(route, handler) {
			routie(route, handler);
		};

		self.navigate = function(route) {
			routie(route);
		};

		function applyRoute() {
			var hash = window.location.hash,
				route,
				useDefault = true;

			if (!_.isEmpty(hash)) {
				route = hash.substr(1);

				if (!_.isEmpty(route)) {
					self.navigate('');
					self.navigate(route);
					useDefault = false;
				}
			}

			if (useDefault && !_.isUndefined(self.defaultPage())) {
				self.navigate(self.defaultPage().route());
			}
		}

		function buildPages() {
			var $pages;
			
			if (_.isArray(def.pages)) {
				$pages = $('<div id="pages"></div>');

				self.$root.append($pages);

				_.each(def.pages, function(page) {
					var viewModel = new PageViewModel(self, page),
						$page;

					_.extend(viewModel, new page.ViewModel(self));
					self.pages.push(viewModel);

					self.route(page.route, function() {
						_.each(self.pages, function(vm, key) {
							vm.visible(false);
						});
						viewModel.visible(true);
					});

					if (page.isDefault) {
						self.defaultPage(viewModel);
					}

					$page = $('<div data-bind="visible: visible">' + viewModel.view + '</div>');
					$pages.append($page);
					ko.applyBindings(viewModel, $page[0]);
				});
			}
		}

		function buildRoutes() {
			if (_.isObject(def.routes)) {
				_.each(def.routes, function(handler, route) {
					self.route(route, function() {
						handler.apply(self, arguments);
					});
				});
			}
		}

		function buildNav() {
			var template = templates.nav,
				$el = $(template);

			self.$root.prepend($el);
		}

		function buildNotifications() {
			var $el = $(self.notifications.template);
			self.notifications.$element = $el;
			self.$root.prepend($el);
		}

		function init() {
			_.each(def, function(val, key) {
				if (key !== 'pages' && key !== 'routes') {
					self[key] = val;
				}
			});

			buildNotifications();
			buildNav();
			buildPages();
			buildRoutes();

			$(function() {
				ko.applyBindings(self, self.$root.find('.navbar')[0]);
				ko.applyBindings(self.notifications, self.$root.find('#notifications')[0]);
				applyRoute();
				self.$root.show();

				initialized = true;
				self.publish('app.initialized');
			});
		}

		init();
	}

	return {
		Notifications: Notifications,
		Model: Model,
		Collection: Collection,
		App: App
	};
}));
