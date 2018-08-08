// This tool routes in three steps
// intended to be used (at least) as an exposed docker container

// Check
// check if the user is authorized for the resource requested

// Get
// route and tet the resource

// Return
// return it to the user

var express = require('express');
var app = express();

function checkAuth(type, path, request, auth){
  let a
}

function route(type, path, request, auth){
  let a
}



app.use("/", function(req, res){
  let type = req.originalUrl.split("/")[1]
  let path = req.originalUrl.split("/");
  console.log(type)
  console.log(path)
  res.sendStatus(200)
})
app.listen(8081, () => console.log('Listening'));
