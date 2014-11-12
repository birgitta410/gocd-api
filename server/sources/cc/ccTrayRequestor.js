
define(['q', 'request', 'xml2json', 'fs', 'server/sources/ymlHerokuConfig'], function (Q, request, xml2json, fs, configReader) {

  var config = configReader.create('cc');
  var url = config.get().url; // ccTray file URL from config file

  var get = function() {

    console.log('Requesting', config.get().loggableUrl);

    if (config.get().sampleIt()) {
      return getSample();
    } else {
      var defer = Q.defer();

      request(url, function (error, response, body) {
        var json = xml2json.toJson(body, {
          object: true, sanitize: false
        });
        defer.resolve(json);
      });

      return defer.promise;
    }
  };

  function getSample() {
    var defer = Q.defer();

    var xml = fs.readFileSync('server/sources/cc/sample/cctray.xml');
    var json = xml2json.toJson(xml, {
      object: true, sanitize: false
    });

    defer.resolve(json);

    return defer.promise;
  }

  return {
    get: get,
    getSample: getSample
  }
});

