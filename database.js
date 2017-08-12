const mongoClient = require("mongodb").MongoClient,
      Promise = require("bluebird")

function connect(app){
  return new Promise(function(resolve, reject){
    mongoClient.connect(
      `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@ds135983.mlab.com:35983/${process.env.DB_NAME}`,
      function(err, db){
        if(err) reject(err)
        app.locals.db = db
        console.log("Connected")
        resolve(db)
      }
    )
  })
}

const database = {
  connect
}


module.exports = database