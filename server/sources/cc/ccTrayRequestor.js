var Q = require('q');
var request = require('request');
var xml2json = require('xml2json');
var fs = require('fs');
var path = require('path');
var configReader = require('../ymlHerokuConfig');

function ccTrayRequestorModule() {

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

    var xml = fs.readFileSync(path.resolve(__dirname + '/sample/', 'cctray.xml'));
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
};

var ccTrayRequestor = ccTrayRequestorModule();
exports.get = ccTrayRequestor.get;
exports.getSample = ccTrayRequestor.getSample;
