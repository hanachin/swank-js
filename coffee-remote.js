var Script = require('vm').Script;
var Remote = require('./swank-handler').Remote;
var cs = require("coffee-script");
var evalcx = Script.runInContext;
var util = require("util");

// CoffeeScript
function CoffeeRemote (clientInfo, client) {
  this.context = Script.createContext();
  for (var i in global) this.context[i] = global[i];
  this.context.module = module;
  this.context.require = require;
  var self = this;
  this.context._swank = {
    output: function output (arg) {
      self.output(arg);
    }
  };
}

util.inherits(CoffeeRemote, Remote);

CoffeeRemote.prototype.REQUEST_TIMEOUT = 3000;

CoffeeRemote.prototype.prompt = function prompt () {
  return "COFFEE";
};

CoffeeRemote.prototype.kind = function kind () {
  return "direct";
};

CoffeeRemote.prototype.id = function id () {
  return "CoffeeScript";
};

CoffeeRemote.prototype.evaluate = function evaluate (id, str) {
  var r;
  try {
    r = evalcx(cs.compile(str, { bare: true }), this.context, "repl");
  } catch (e) {
    r = undefined;
    this.output(e.stack);
  }
  this.sendResult(id, r === undefined ? [] : [util.inspect(r)]);
};

exports.CoffeeRemote = CoffeeRemote;
