import aws from "aws-sdk"
import express from "express"
import cors from "cors"
import fs from "fs"
import dotenv from "dotenv"
import {v4 as uuidv4} from "uuid"
dotenv.config()
import multer from "multer"

const s3 = new aws.S3({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    region: process.env.AWS_DEFAULT_REGION
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
      const newFile = file.originalname.replace(/ /g, "-");
      const newFilename = `${uuidv4() + "-" + newFile}`;
      cb(null, newFilename);
    },
});

const upload = multer({
    storage: storage
});

const app = express()

app.use(express.json())
app.use(cors())

app.get("", (req, res) => {
    return res.status(200).json({
        message: "Hello World"
    })
})

app.get("/images", async (req, res) => {
    const bucketName = process.env.AWS_BUCKET_NAME;

    try {
      const data = await s3.listObjectsV2({ Bucket: bucketName, Prefix: 'team_4' }).promise();
      const images = [];
      const newArray = data.Contents.sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified));
      for (let content of newArray) {
        const image = {};
        const key = content.Key;
        image.key = key;
        image.url = await s3.getUrl
        image.url = await s3.getSignedUrlPromise('getObject', {
          Bucket: bucketName,
          Key: key,
          Expires: 3600
        });
        
        images.push(image);
      }
      return res.status(200).json({
        images: images
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({message: "Something went wrong"});
    }
})

app.post("/images", upload.array("files"), async (req, res) => {
    const files = req.files;
  
    try {
      const s3Promises = files.map((file) => {
        const fileStream = fs.createReadStream(file.path);
        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `team_4/${file.filename}`,
          Body: fileStream,
        };
        return s3.upload(params).promise();
      });
  
      await Promise.all(s3Promises);
  
      for (let file of files) {
        fs.unlink(file.path, (err) => {
          if (err) {
            console.error(err);
          }
        });
      }
      return res.status(200).json("Files uploaded successfully");
    } catch (err) {
      console.error(err);
      return res.status(500).send("Error uploading files");
    }
});

app.listen(5000, () => {
    console.log("Server connected")
})