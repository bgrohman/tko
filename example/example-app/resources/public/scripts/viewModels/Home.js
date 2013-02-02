define(['knockout', 'text!views/home.html'], function(ko, view) {
    "use strict";

    return function Home(app) {
        var self = this;
        self.view = view;
    };
});
