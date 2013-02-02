(defproject example-app "0.1.0-SNAPSHOT"
  :description "FIXME: write description"
  :url "http://example.com/FIXME"
  :dependencies [[org.clojure/clojure "1.4.0"]
                 [compojure "1.1.1"]
                 [clj-json "0.5.0"]]
  :plugins [[lein-ring "0.7.1"]]
  :ring {:handler example-app.handler/app}
  :dev-dependencies [[ring-mock "0.1.2"]])
