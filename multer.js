const multer = require('multer')
const path = require('path')


// Storage configuration
const storage = multer.diskStorage({
    destination: function (req,file,callback){
        callback(null,"./uploads/"); // Destination folder for storing uploaded images
    },
    filename: function (req,file, callback){
        callback(null, Date.now()+path.extname(file.originalname)) // Unique Filename
    }
});

// file filter to accept only images
const fileFilter = (req,file,callback)=>{
    if( file.mimetype === "image/png" ||
        file.mimetype === "image/jpg" ||
        file.mimetype === "image/jpeg"){
        callback(null,true)
    }else{
        callback(new Error('Only images are allowed'),false)
    }
}

const upload = multer({storage,fileFilter})

module.exports = upload;