async function pathdbCheckAuth(type, path, auth, request){
  // forward auth header
  let slide = path.split("?")[1].split("=")[1];
  // get current user's collections and slides
  let url = "ca-data:9099/services/caMicroscope/Authorization/query/getAuth?name=" + user
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
