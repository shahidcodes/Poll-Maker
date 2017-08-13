var emailCheck = require('email-check');
function loginWithUsername(creds, app, session){
  return new Promise(function(resolve, reject){
    const db = app.locals.db
    db.collection('Users').findOne({username: creds.username}, function(err, data){
      if(data.password == creds.password){
        console.log("Correct Login")
        resolve(data._id)
      }else{
        reject("Username Password Doesnt Match!")
      }
    })
  })
}
function getUserByUsername(db, username){
  console.log("Username: ", username)
  return new Promise(function (resolve, reject){
    db.collection("Users").findOne({username}, function(err, data){
      if (err) reject(err)
      else resolve(data)
    })
  })
}

function validate(creds){
  return new Promise(function(resolve, reject){
    emailCheck(creds.email).then(function(){
      try{
        if(creds.username != "" & creds.password != ""){
          resolve()
        }
      }catch(err){
        reject(err)
      }
    })  
  })
}

function makeUser(creds, db){
  return new Promise(function(resolve, reject){
    db.collection("Users").insertOne(creds, function(err, data){
      if(err) reject(err)
      if(data.insertedCount == 1){
        resolve()
      }else{
        reject("Unknow error!")
      }
    })
  })
}

const Users = {
  loginWithUsername,
  validate,
  makeUser,
  getUserByUsername
}

module.exports = Users