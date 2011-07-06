var nowjs = require("now"),
	roomManager = {};

function room(_name, _maxSize){
	var self = this;
	self.name = _name;
	self.maxSize = _maxSize;
}

module.exports = roomManager;
module.exports.room = room;