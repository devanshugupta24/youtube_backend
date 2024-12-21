import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {  //where the file should be kept
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) { //by what name the file should be kept
      cb(null, file.originalname)
    }
  })
  
export const upload = multer({ storage,})