var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.connect('mongodb://mongo:27017/production', function(err) {
    if (err) throw err;
});
module.exports = mongoose.model('userrs', new Schema({ 
    username: String, 
    password: String
    
}));