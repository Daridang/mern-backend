
// middleware/upload.js
import multer from "multer";

const storage = multer.memoryStorage(); // Store the file in memory as a buffer
const upload = multer({ storage: storage });

export default upload;
