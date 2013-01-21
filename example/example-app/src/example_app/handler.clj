(ns example-app.handler
  (:use compojure.core)
  (:import [java.util Date])
  (:require [compojure.handler :as handler]
            [compojure.route :as route]
			[clj-json.core :as json]
			[ring.util.response :as resp]))

(def TODOS (atom {:1 {:id "1" :label "Walk the dog" :priority 1}
				  :2 {:id "2" :label "Take out the trash" :priority 2}}))

(defn json-response [data & [status]]
  {:status (or status 200)
   :headers {"Content-Type" "application/json"}
   :body (json/generate-string data)})

(defn create-todo
  [attrs]
  (let [id (keyword (str (.getTime (Date.))))
		new-attrs (merge attrs {:id id :priority (.intValue (Integer. (:priority attrs)))})]
	(swap! TODOS merge {id new-attrs})
	new-attrs))

(defn get-todo
  [id]
  ((keyword id) @TODOS))

(defn update-todo
  [attrs]
  (let [id (keyword (:id attrs))
		todo (get-todo id)]
	(if (not (nil? todo))
		  (let [new-attrs (merge {:id id} attrs)]
						  (swap! TODOS merge {id new-attrs})
						  new-attrs))))

(defn delete-todo
  [id]
  (swap! TODOS dissoc (keyword id)))

(defn keywordize
  [m]
  (into {}
		(for [[k v] m]
				 [(keyword k) v])))

(defn create-or-update-todos
  [jsonTodos]
  (let [todos (json/parse-string jsonTodos)
		keywordedTodos (map keywordize todos)
		todosById (into {}
					(for [todo keywordedTodos]
											  {(keyword (:id todo)) todo}))]
	(swap! TODOS merge todosById)
	(println @TODOS)))

(defroutes app-routes
  (GET "/" [] (resp/resource-response "main.html" {:root "public"}))
  (GET "/todo/:id" [id] (json-response (get-todo id)))
  (POST "/todo" {params :params} (json-response (create-todo params)))
  (PUT "/todo/:id" {params :params} (json-response (update-todo params)))
  (DELETE "/todo/:id" [id] (fn [& args]
							 (let [todo ((keyword id) @TODOS)]
													 (delete-todo id)
													 (json-response todo))))
  (GET "/todos" [] (json-response @TODOS))
  (POST "/todos" {params :body} (do
						   (create-or-update-todos (slurp params))
						   (json-response {})))
  (route/resources "/")
  (route/not-found "Not Found"))

(def app
  (handler/site app-routes))
