// WIP - slide and colleciotn level auth for bindaaas
async function bindaaasCheckAuth(type, path, auth, request){
  if (!(type=="data" || type=="img")){
    return true
  }
  // TODO something to translate auth into user better than literal
  if (!auth){
    return false
  }
  let user = auth.split(" ")[1];
  // TODO need a better method to auth user

  if (type == "data"){
    // WHITELIST method for routing
    let collection = path.split("/")[path.split("/").indexOf("caMicroscope")+1]
    if (["template", "collection"].includes(collection.toLowerCase())){
      // collection metadata is public
      // templates are public
      return true
    } else if (!["slide", "mark", "overlay", "heatmap"].includes(collection.toLowerCase())){
      return false
      // slide, mark, overlay require auth
      // otherwise, reject entirely (for now)
    }
    // TODO we need to check POST also
  }


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
