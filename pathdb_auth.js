async function pathdbCheckAuth(type, path, auth, request){
  let slide = getUrlParam("slide", path)
  // get current user's collections and slides
  let url = "https://vinculum.bmi.stonybrookmedicine.edu/node/" + slide + "?_format=json"
  // be sure to forward auth header
  options = {
    uri: url,
    encoding: null,
    method: req.method,
    resolveWithFullResponse: true,
    headers: {
      'Authorization': auth
    }
  }
  // get the slides and collections the user can see
  try{
    var auth = await rp(options);
    if (auth.statusCode === 200){
      return true
    }
  } catch(e){
    return false
  }
}

module.exports = pathdbCheckAuth
