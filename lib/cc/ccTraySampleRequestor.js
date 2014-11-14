var Q = require('q');
var xml2json = require('xml2json');
var fs = require('fs');
var path = require('path');

function ccTraySampleRequestorModule() {

  var get = function() {

    var defer = Q.defer();

    var xml = fs.readFileSync(path.resolve(__dirname + '/sample/', 'cctray.xml'));
    var json = xml2json.toJson(xml, {
      object: true, sanitize: false
    });

    defer.resolve(json);

    return defer.promise;
  };

  return {
    get: get
  };
};

var ccTrayRequestor = ccTraySampleRequestorModule();
exports.get = ccTrayRequestor.get;
