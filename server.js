
var express = require('express');
var app = express();
var database = require("./database")
var bodyParser = require('body-parser')
var User = require('./User')
var session = require('express-session')
var uniqueString = require('unique-string');
var ObjectId = require('mongodb').ObjectId; 
var uuid = require('uuid/v4');
var cookieParser = require('cookie-parser');
var emailCheck = require('email-check');
var Poll = require('./Poll')
var poll ; 

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
  console.log("isLoggedIn() :", session.loggedIn)
  return false;
}
function getUniqueOptionName(){
  return uniqueString();
}
function authMiddleware(request, response, next){
  
  if(!request.session.loggedIn){
    request.session.flash = "You need to login!"
    response.redirect("/login")
    return;
  }
  
  next()
}

function getAuth(session){
  var auth = {login: false, username: ""}
  if(session){
    auth.login = session.loggedIn ? session.loggedIn : false
    auth.username = session.username ? session.username : "" 
  }
  console.log("getAuth(): ", auth)
  return auth;
}

function getFlashMessage(request){
  var msg = request.session.flash
  delete request.session.flash
  return msg ? msg : ""
}

// setup cookies
app.use(function(request, response, next){
  if(request.session.loggedIn){
    console.log(`[PATH: ${request.originalUrl}] User Logged In`);
  }
  else{
    if(!request.cookies.user_id){
      response.cookie('user_id', uniqueString());
      response.cookie('voted', JSON.stringify([]))
    }
    console.log("Cookie(): ",request.cookies.user_id)
  }
  next();
})


// view mypolls

app.get("/mypolls", authMiddleware ,function(request, response){
  var userObjectID = new ObjectId(request.session.userID)
  const db = app.locals.db
  db.collection("Polls").find({user : userObjectID}).toArray(function(err, data){
    response.render('mypolls', {
        title:"Polls",
        data, 
        auth:getAuth(request.session), 
        msg: getFlashMessage(request)
      })
  })
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
  const poll = {
    "name" : request.body.title,
    "options" : [],
    "voters" : []
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

// delete the poll

app.get("/poll/delete/:id", authMiddleware, function(request, response){
  try{
    var pollID = new ObjectId(request.params.id)
    poll.deletePoll(pollID).then(function(){
      request.session.flash = "Poll Deleted!"
      response.redirect("/mypolls")
    }).catch(function(err){
      response.render('error', {error : err})
    })
    }catch(err){
      response.render('error', {error : err})
    }
})

// log user in
app.get("/login", function(request, response){
  response.render('login', {title: "Login" , msg: getFlashMessage(request)})
})
app.post("/login", function(request, response){
  
  if(request.session.loggedIn) response.redirect("/");
  
  const username = request.body.username
  const password = request.body.password
  
  User.loginWithUsername(request.body, app ,request.session).then(function(id){
    request.session.loggedIn = true
    request.session.username = username
    request.session.userID = id.toString();
    request.session.flash = "Welcome " + username
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
  response.render('register', {
    msg: getFlashMessage(request)
  })
})

app.post("/register", function(request, response){
  var creds = request.body
  User.validate(creds).then(function(){
    User.makeUser(creds, app.locals.db).then(function(){
      request.session.flash = "Succesfully registered. Please Login."
      response.redirect("/login")
    }).catch(function(err){
      response.render("error", {error: err})
    })
  }).catch(function(err){
    response.render('login', {"error" : err})
  });
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
          auth:getAuth(request.session),
          "data" : data, 
          "title" : data.name + " | Poll Maker",
          "optionNames" : JSON.stringify(optionNames), 
          "optionValues" : JSON.stringify(optionValues),
          "msg" : getFlashMessage(request)
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
  if(!optionIndex){
    request.session.flash = "Empty vote really?"
    response.redirect("/")
    return;
  }
  console.log("POST /poll/", id, optionIndex)
  const db = app.locals.db
  
  db.collection("Polls").findOne({_id : new ObjectId(id)}, function(err, data){
    
    if(err) response.render("error", {"error" : JSON.stringify(err)})
    
    var currentUserID = request.session.userID;
    console.log("User Voting: ", currentUserID);
    
    
    if(data.voters.indexOf(currentUserID) != -1){
      console.log(`[/post/${id}] : Already Voted ! `)
      request.session.flash = "You can't vote twice!"
      response.redirect("/poll/" + id)
    }else{
      data.voters.push(currentUserID)
      console.log(`Current User: ${currentUserID},\nPoll Index ${optionIndex},\nPoll Data ${JSON.stringify(data)}`)
      data.options[optionIndex].votes = data.options[optionIndex].votes + 1
        
      db.collection("Polls").updateOne(
          {_id : new ObjectId(id)},
          {$set: { options: data.options, voters: data.voters }},
          function(err, result){
              if(result.result.n == 1){              
                response.redirect("/poll/" + id)
              }else{
                response.render("error", {error : "Unknown Error"})
              }
          })
    }
  })
})

// end todo()
// homepage

app.get("/", function (request, response) {
  const db = app.locals.db
  db.collection("Polls").find({}).toArray(function(err, data){
    response.render('index', {
        title:"Poll Maker - Create And Share Poll Easily",
        data, 
        auth:getAuth(request.session), 
        msg: getFlashMessage(request)
      })
  })
});

database.connect(app).then(db=>{
  poll = new Poll(db)
  var listener = app.listen(process.env.PORT, function () {
    console.log('Your app is listening on port ' + listener.address().port);
  });
})



