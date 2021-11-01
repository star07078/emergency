var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});


// router.get('/decision', function (req, res, next) {
//   console.log("=====")
//   var options = {
//     root: __dirname,
//     dotfiles: 'deny',
//     headers: {
//         'x-timestamp': Date.now(),
//         'x-sent': true
//     }
//   };
  
//   res.sendFile('decision.png',options);
// });
module.exports = router;
