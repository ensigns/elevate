async function bindaaasCheckAuth(type, path, auth, request){
  if (!(type=="data" || type=="img")){
    return true
  }
  // TODO something to translate auth into user better than literal
  let user = auth.split(" ")[1];
  // TODO need a better method to do this
  // TODO need better auth checking depending on type
  let slide = getUrlParam("slide", path)
  if (!slide){
    // slide is needed
    return false
  }
  // get current user's collections and slides
  let url = "ca-data:9099/services/caMicroscope/Authorization/query/getAuth?name=" + user
  options = {
    uri: url,
    encoding: null,
    method: req.method,
    resolveWithFullResponse: true,
    json: true
  }
  // get the slides and collections the user can see
  var auth = await rp(options);
  function isInCollectionList(slide, collectionList){
    return false
    // not supporting collection level auth yet
  }
  if (slide in auth.slides){
    return true
  } else {
    return isInCollectionList(slide, auth.collections)
  }
}

module.exports = bindaaasCheckAuth
