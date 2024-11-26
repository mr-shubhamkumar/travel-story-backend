const mongoose = require('mongoose')
const database = process.env.DATABASE

mongoose.connect(database,{
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
  .then(() => {
    console.log("DataBase Connected");
  })
  .catch((err) => {
    console.log(err);
  });
