(ns example-app.handler
  (:use compojure.core)
  (:import [java.util Date])
  (:require [compojure.handler :as handler]
            [compojure.route :as route]
			[clj-json.core :as json]
			[ring.util.response :as resp]))

(def TODOS (atom {}))

(defn json-response [data & [status]]
  {:status (or status 200)
   :headers {"Content-Type" "application/json"}
   :body (json/generate-string data)})

(defn create-todo
  [attrs]
  (let [id (keyword (str (.getTime (Date.))))
		new-attrs (merge {:id id :priority (Integer. (:priority attrs))} attrs)]
	(swap! TODOS merge {id new-attrs})
	new-attrs))

(defn update-todo
  [attrs]
  (let [id (keyword (:id attrs))
		todo (id @TODOS)]
	(if (not (nil? todo))
		  (let [new-attrs (merge {:id id} attrs)]
						  (swap! TODOS merge {id new-attrs})
						  new-attrs))))

(defn delete-todo
  [id]
  (swap! TODOS dissoc (keyword id)))

(defroutes app-routes
  (GET "/" [] (resp/resource-response "main.html" {:root "public"}))
  (GET "/todo" [] "Todo!")
  (POST "/todo" {params :params} (json-response (create-todo params)))
  (PUT "/todo/:id" {params :params} (json-response (update-todo params)))
  (DELETE "/todo/:id" [id] (fn [& args]
							 (let [todo ((keyword id) @TODOS)]
													 (delete-todo id)
													 (json-response todo))))
  (GET "/todos" [] (json-response @TODOS))
  (route/resources "/")
  (route/not-found "Not Found"))

(def app
  (handler/site app-routes))
