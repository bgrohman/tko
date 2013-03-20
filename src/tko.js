(function(root, factory) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        define(['underscore', 'knockout', 'jquery', 'amplify', 'routie', 'bootstrap'], factory);
    } else {
        root.tko = factory(root._, root.ko, root.$, root.amplify, root.routie);
    }
}(this, function(_, ko, $, amplify, routie) {
    "use strict";

    var tko, 
        templates = {
            nav: [
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
     * Returns true if the given function is a tko Model constructor.
     * @param f
     * @returns
     */
    function isModelConstructor(f) {
        return _.isFunction(f) && f.tko && f.tko.modelConstructor;
    }

    /**
     * Returns true if the given function is a tko Collection constructor.
     * @param f
     * @returns
     */
    function isCollectionConstructor(f) {
        return _.isFunction(f) && f.tko && f.tko.collectionConstructor;
    }

    /**
     * Base Model constructor. Should not be used directly. Use Model.extend
     * to create new constructors.
     */
    function Model() {
        var self = this;

        self.urlRoot = null;
        self.id = null;

        /**
         * Sets a Model property on this Model.
         * @param from
         * @param key
         * @param modelDef
         */
        function setModelProperty(from, key, modelDef) {
            if (from[key] instanceof Model) {
                self[key](from[key]);
            } else {
                self[key](new modelDef.constructor(from[key]));
            }
        }

        /**
         * Sets a Collection property on this Model.
         * @param from
         * @param key
         * @param collectionDef
         */
        function setCollectionProperty(from, key, collectionDef) {
            if (from[key] instanceof tko.Collection) {
                self[key](from[key]);
            } else {
                self[key](new collectionDef.constructor(from[key]));
            }
        }

        /**
         * Sets a property on this Model.
         * @param from
         * @param key
         */
        function setProperty(from, key) {
            var selfVal = self[key],
                fromVal;

            if (ko.isObservable(selfVal)) {
                fromVal = from[key];

                if (!_.isUndefined(fromVal)) {
                    selfVal(fromVal);
                }
            }
        }

        /**
         * Copies the properties of the from object to this Model. Only this
         * Model's observables will be set. The id will be set if it has not
         * already been set.
         * @param from the object from which to copy properties
         */
        self.setProperties = function(from) {
            if (!_.isUndefined(from) && !_.isNull(from)) {

                _.each(_.keys(self), function(key) {
                    var modelDef,
                        collectionDef;

                    if (key !== 'id') {
                        modelDef = _.find(self._tko_.modelKeys, function(def) {
                            return def.key === key;
                        });

                        if (modelDef) {
                            setModelProperty(from, key, modelDef);
                        } else {
                            collectionDef = _.find(self._tko_.collectionKeys, function(def) {
                                return def.key === key;
                            });

                            if (collectionDef) {
                                setCollectionProperty(from, key, collectionDef);
                            } else {
                                setProperty(from, key);
                            }
                        }
                    }
                });

                if (!_.isUndefined(from.id)) {
                    if (_.isNull(self.id)) {
                        self.id = ko.observable(from.id);
                    }
                }
            }
        };

        /**
         * Returns a cloned version of this model.
         * Only the observable properties of the model are cloned. Nested models
         * are cloned as well.
         * @returns a cloned model
         */
        self.clone = function() {
            var cloned = new Model(),
                selfVal;

            _.each(_.keys(self), function(key) {
                if (key !== 'id') {
                    selfVal = self[key];

                    if (ko.isObservable(selfVal)) {
                        if (selfVal() instanceof Model ||
                            selfVal() instanceof tko.Collection) {
                            cloned[key] = ko.observable(selfVal().clone());
                        } else {
                            cloned[key] = ko.observable(selfVal());
                        }
                    }

                    cloned._tko_ = _.clone(self._tko_);
                }
            });

            return cloned;
        };

        /**
         * Returns a plain object without observables representing this Model.
         * @returns a plain object
         */
        self.toJS = function() {
            var obj = {};

            _.each(_.keys(self), function(key) {
                if (ko.isObservable(self[key])) {
                    if (self[key]() instanceof Model ||
                        self[key]() instanceof tko.Collection) {
                        obj[key] = self[key]().toJS();
                    } else {
                        obj[key] = self[key]();
                    }
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
        var constructor = function(properties) {
            var model = new Model();

            model._tko_ = {
                modelKeys: [],
                collectionKeys: []
            };

            _.each(props, function(val, key) {
                if (ko.isObservable(val)) {
                    model[key] = ko.observable(val());
                } else if (isModelConstructor(val)) {
                    model[key] = ko.observable();
                    model._tko_.modelKeys.push({
                        key: key,
                        constructor: val
                    });
                } else if (isCollectionConstructor(val)) {
                    model[key] = ko.observable();
                    model._tko_.collectionKeys.push({
                        key: key,
                        constructor: val
                    });
                } else {
                    model[key] = val;
                }
            });

            model.setProperties(properties);

            return model;
        };

        constructor.tko = {
            modelConstructor: true
        };

        return constructor;
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
         * Clones this Collection.
         * @returns a cloned collection
         */
        self.clone = function() {
            var coll = new Collection(),
                newValues;

            newValues = _.map(self.values(), function(val) {
                if (val instanceof Model ||
                    val instanceof Collection) {
                    return val.clone();
                }
                return val;
            });

            coll.url = self.url;
            coll.model = self.model;
            coll.sortBy(self.sortBy());
            coll.values(newValues);

            return coll;
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
         * Saves each model in this Collection.
         */
        self.saveAll = function() {
            var request,
                jsonData;

            jsonData = JSON.stringify(self.toJS());

            request = $.ajax({
                type: 'POST',
                url: self.url,
                cache: false,
                contentType: 'application/json; charset=utf-8',
                processData: false,
                data: jsonData
            });

            return request;
        };

        /**
         * Populates this Collection with new Models representing the items 
         * returned from this Collection's url.
         */
        self.fetch = function() {
            var request = $.ajax({
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

        function constructor(values) {
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
        }

        constructor.tko = {
            collectionConstructor: true
        };

        return constructor;
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
            notifyTimeouts = {},
            tkoConfig = _.defaults(def.tko || {}, {
                useSimpleNavigation: false,
                routingRoot: $('#root')
            });

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

                tkoConfig.routingRoot.append($pages);

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

        function buildSimpleNav() {
            var template = templates.nav,
                $el = $(template);

            tkoConfig.routingRoot.prepend($el);
        }

        function buildCustomNav() {
            var viewModel,
                $navEl = $('<div class="tko-nav"></div>');

            if (!_.isFunction(def.navigation)) {
                return;
            }

            viewModel = new def.navigation(self);
            self.navigation = viewModel;
            $navEl.append(viewModel.view);
            tkoConfig.routingRoot.prepend($navEl);
            ko.applyBindings(viewModel, $navEl[0]);
        }

        function buildNavigation() {
            if (tkoConfig.useSimpleNavigation) {
                buildSimpleNav();
            } else {
                buildCustomNav();
            }
        }

        function buildNotifications() {
            var $el = $(self.notifications.template);
            self.notifications.$element = $el;
            tkoConfig.routingRoot.prepend($el);
        }

        function init() {
            _.each(def, function(val, key) {
                if (key !== 'pages' && key !== 'routes' && key !== 'navigation') {
                    self[key] = val;
                }
            });

            buildNotifications();

            buildPages();
            buildRoutes();
            buildNavigation();

            $(function() {
                if (tkoConfig.useSimpleNavigation) {
                    ko.applyBindings(self, tkoConfig.routingRoot.find('.navbar')[0]);
                }

                ko.applyBindings(self.notifications, tkoConfig.routingRoot.find('#notifications')[0]);
                applyRoute();
                tkoConfig.routingRoot.show();

                initialized = true;
                self.publish('app.initialized');
            });
        }

        init();
    }

    tko = {
        Notifications: Notifications,
        Model: Model,
        Collection: Collection,
        App: App
    };

    return tko;
}));
