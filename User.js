
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
const Users = {
  loginWithUsername,
  getUserByUsername
}

module.exports = Users