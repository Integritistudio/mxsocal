const s3 = require("../config/s3");
const { Upload } = require("@aws-sdk/lib-storage");

const uploadFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const uploadPromises = req.files.map((file) => {
      const fileName = `${Date.now()}-${file.originalname}`;

      const uploader = new Upload({
        client: s3,
        params: {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
        },
      });

      return uploader.done();
    });

    const results = await Promise.all(uploadPromises);

    res.json({
      message: "Files uploaded successfully",
      results: results,
    });
  } catch (error) {
    console.error("S3 multiple upload error:", error);
    res.status(500).json({
      message: "Upload failed",
      error: error.message,
    });
  }
};

module.exports = { uploadFiles };
