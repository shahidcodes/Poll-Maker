
var express = require('express');
var app = express();
var database = require("./database")
var bodyParser = require('body-parser')
var User = require('./User')
var session = require('express-session')
var uniqueString = require('unique-string');
var ObjectId = require('mongodb').ObjectId; 
var uuid = require('uuid/v4');
var cookieParser = require('cookie-parser')

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true
}))


app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cookieParser())

app.use(express.static('public'));
app.set('view engine', 'pug')

function isLoggedIn(session){
  if(session.loggedIn){
    return session.loggedIn;
  }
  console.log(session)
  return false;
}
function getUniqueOptionName(){
  return uniqueString();
}
function authMiddleware(request, response, next){
  if(!isLoggedIn(request.session)) response.redirect("/login")
  next()
}

function getAuth(session){
  var auth = {login: false, username: ""}
  if(session){
    auth.login = session.loggedIn ? session.loggedIn : false
    auth.username = session.username ? session.username : "" 
  }
  console.log("getAuth", auth)
  return auth;
}

function getFlashMessage(request){
  var msg = request.session.flash
  delete request.session.flash
  return msg
}

// setup cookies
app.use(function(request, response, next){
  if(request.session.loggedIn){
    console.log("User Logged In");
  }
  else{
    if(!request.cookies.user_id){
      response.cookie('user_id', uniqueString());
      response.cookie('voted', JSON.stringify([]))
    }
    console.log("Cookie",request.cookies.user_id)
  }
  next();
})

// create poll
app.get("/poll/create", authMiddleware ,function(request, response){
  response.render("create_poll", {
      title: "Create a Poll",
      auth: getAuth(request.session)
    })
})
app.post("/poll/create", authMiddleware ,function(request, response){
  var options = request.body["options[]"]
  console.log(request.body)
  const poll = {
    "name" : request.body.title,
    "options" : []
  }
  
  options.forEach(option=>{
    var opt = {
      name: getUniqueOptionName(),
      value : option,
      votes: 0
    }
    poll.options.push(opt)
  })
  
  User.getUserByUsername(app.locals.db, request.session.username)
      .then(function(data){
    console.log(data)
    poll.user = data._id
    app.locals.db.collection("Polls").insertOne(poll, function(err, data){
      console.log(data)
      if(data.insertedCount == 1)
        response.json({"id" : data.insertedId})
      else
        response.json({"error" : "Can not create poll"})
    })
  }).catch(function(err){
    console.log("Error(GetUsername)", err)
  })
  
})

// log user in
app.get("/login", function(request, response){
  response.render('login')
})
app.post("/login", function(request, response){
  
  if(request.session.loggedIn) response.redirect("/");
  
  const username = request.body.username
  const password = request.body.password
  
  User.loginWithUsername(request.body, app ,request.session).then(function(id){
    request.session.loggedIn = true
    request.session.username = username
    request.session.userID = id.toString();
    request.session.flash = "Logged in"
    // change user cookie
    console.log("Logged User ID", id)
    response.cookie('user_id', id.toString());
    response.redirect("/")
  }).catch((e)=>{
    console.log(e)
    request.session.flash = "Login incorrect"
    response.redirect("/login")
  })
})


// todo()

// register
app.get("/register", function(request, response){
  
})

app.post("/register", function(request, response){
  
})


app.get("/logout", function(request, response){
  delete request.session.loggedIn
  delete request.session.username
  request.session.flash = "Logged out"
  response.redirect("/")
})


// view a poll

app.get("/poll/:id" ,function(request, response){
  const id = request.params.id
  const db = app.locals.db
  db.collection("Polls").findOne({_id : new ObjectId(id)}, function(err, data){
    var optionValues = []
    var optionNames = []
    data.options.forEach(option=>{
      optionValues.push(option.votes)
      optionNames.push(option.value)
    })
    if(!err) response.render("view_poll", {
          data, 
          "optionNames" : JSON.stringify(optionNames), 
          "optionValues" : JSON.stringify(optionValues)
        }
      )
    // TODO Proper error object
    else response.render("error", {error: JSON.stringify(err)})
  })
})


// vote a poll
app.post("/poll/:id", authMiddleware ,function(request, response){
  const id = request.params.id
  const optionIndex = request.body.option
  console.log("POST /poll/", id, optionIndex)
  const db = app.locals.db
  db.collection("Polls").findOne({_id : new ObjectId(id)}, function(err, data){
    
    if(err) response.render("login", {"error" : JSON.stringify(err)})
    
    
    data.options[optionIndex].votes = data.options[optionIndex].votes + 1
        
    db.collection("Polls").updateOne(
        {_id : new ObjectId(id)},
        {$set: { options: data.options }},
        function(err, result){
            if(result.result.n == 1){              
              response.redirect("/poll/" + id)
            }else{
              response.render("error", {error : "Unknown Error"})
            }
        })
  })
})

// end todo()
// homepage

app.get("/", function (request, response) {
  const db = app.locals.db
  db.collection("Polls").find({}).toArray(function(err, data){
    // console.log(data)
    response.render('index', {
        title:"Polls",
        data, 
        auth:getAuth(request.session), 
        msg: request.session.flash ? request.session.flash : ""
      })
  })
});

database.connect(app).then(db=>{
  var listener = app.listen(process.env.PORT, function () {
    console.log('Your app is listening on port ' + listener.address().port);
  });
})


