var Remote = require('./swank-handler').Remote;
var cs = require("coffee-script");
var ua = require("./user-agent");
var util = require("util");

function CoffeeBrowserRemote (clientInfo, client) {
  var userAgent = ua.recognize(clientInfo.userAgent);
  this.name = userAgent.replace(/ /g, "") + (clientInfo.address ? (":" + clientInfo.address) : "") + " CoffeeScript";
  this._prompt = userAgent.toUpperCase().replace(/ /g, '-') + "-COFFEE";
  this.pendingRequests = {};
  this.client = client;
  this.client.on(
    "message", function(m) {
      // TBD: handle parse errors
      // TBD: validate incoming message (id, etc.)
      m = JSON.parse(m);
      if (m.op !== "ping") // don't show pings
        console.log("message from browser: %s", JSON.stringify(m));
      switch(m.op) {
      case "output":
        this.output(m.str);
        break;
      case "result":
        if (!this.pendingRequests.hasOwnProperty(m.id)) {
          console.log("WARNING: late result response from the browser");
          break;
        }
        delete this.pendingRequests[m.id];
        if (m.error) {
          this.output(m.error + "\n");
          this.sendResult(m.id, []);
        } else
          this.sendResult(m.id, m.values);
        this.sweepRequests();
        break;
      case "ping":
        this.client.send(JSON.stringify({ "pong": m.id }));
        break;
      default:
        console.log("WARNING: cannot interpret the client message");
      }
    }.bind(this));
    this.client.on(
      "disconnect", function() {
        console.log("client disconnected: %s", this.id());
        this.disconnect();
      }.bind(this));
}

util.inherits(CoffeeBrowserRemote, Remote);

CoffeeBrowserRemote.prototype.REQUEST_TIMEOUT = 3000;

CoffeeBrowserRemote.prototype.sweepRequests = function sweepRequests (all) {
  Object.keys(this.pendingRequests).forEach(
    function (id) {
      if (all || this.pendingRequests[id] < new Date().getTime() - this.REQUEST_TIMEOUT) {
        console.log("request %s didn't finish", id);
        this.sendResult(id, []);
        delete this.pendingRequests[id];
      }
    }, this);
};

CoffeeBrowserRemote.prototype.prompt = function prompt () {
  return this._prompt;
};

CoffeeBrowserRemote.prototype.kind = function kind () {
  return "browser";
};

CoffeeBrowserRemote.prototype.id = function id () {
  return this.name;
};

CoffeeBrowserRemote.prototype.evaluate = function evaluate (id, str) {
  this.client.send(JSON.stringify({ "id": id, "code": cs.compile(str, { bare: true}) }));
  this.pendingRequests[id] = new Date().getTime();
};

CoffeeBrowserRemote.prototype.disconnect = function disconnect () {
  this.sweepRequests(true);
  Remote.prototype.disconnect.call(this);
};

exports.CoffeeBrowserRemote = CoffeeBrowserRemote;
