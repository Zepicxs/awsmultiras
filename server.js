const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple auth middleware (optional)
const requireAuth = (req, res, next) => {
  // For now, skip auth. Add logic if needed.
  next();
};

// Route to handle file upload
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileKey = `${uuidv4()}-${req.file.originalname}`;
    const s3Params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'private'
    };

    // Upload file to S3
    const uploadResult = await s3.upload(s3Params).promise();

    // Generate signed URL for the uploaded file
    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
      Expires: 60 * 60 * 24 * 7 // 7 days expiration
    });

    // Store metadata in DynamoDB
    const dynamoParams = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: {
        id: uuidv4(),
        filename: req.file.originalname,
        s3Key: fileKey,
        s3Url: signedUrl,
        size: req.file.size,
        uploadDate: new Date().toISOString(),
        contentType: req.file.mimetype,
        description: req.body.description || '',
        category: req.body.category || 'Uncategorized',
        uploader: req.body.uploader || 'Anonymous'
      }
    };

    await dynamodb.put(dynamoParams).promise();

    res.json({ message: 'File uploaded successfully', filename: req.file.originalname, s3Url: signedUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Route to list all archives with optional search/filter
app.get('/archives', async (req, res) => {
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME
    };

    const result = await dynamodb.scan(params).promise();
    let archives = result.Items;

    // Filter by search query
    if (req.query.search) {
      const search = req.query.search.toLowerCase();
      archives = archives.filter(archive =>
        archive.filename.toLowerCase().includes(search) ||
        (archive.description && archive.description.toLowerCase().includes(search))
      );
    }

    // Filter by category
    if (req.query.category) {
      archives = archives.filter(archive => archive.category === req.query.category);
    }

    // Sort by upload date (newest first) or filename
    if (req.query.sort === 'date') {
      archives.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    } else if (req.query.sort === 'filename') {
      archives.sort((a, b) => a.filename.localeCompare(b.filename));
    }

    res.json(archives);
  } catch (error) {
    console.error('List archives error:', error);
    res.status(500).json({ error: 'Failed to retrieve archives' });
  }
});

// Route to get archive details by ID
app.get('/archive/:id', async (req, res) => {
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { id: req.params.id }
    };

    const result = await dynamodb.get(params).promise();
    if (!result.Item) {
      return res.status(404).json({ error: 'Archive not found' });
    }

    res.json(result.Item);
  } catch (error) {
    console.error('Get archive error:', error);
    res.status(500).json({ error: 'Failed to retrieve archive' });
  }
});

// Route to get stats
app.get('/stats', async (req, res) => {
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME
    };

    const result = await dynamodb.scan(params).promise();
    const archives = result.Items;

    const totalArchives = archives.length;
    const totalSize = archives.reduce((sum, archive) => sum + archive.size, 0);
    const categories = [...new Set(archives.map(archive => archive.category))].length;

    res.json({
      totalArchives,
      totalSize,
      categories
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

// Route to get recent uploads (last 5)
app.get('/recent', async (req, res) => {
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME
    };

    const result = await dynamodb.scan(params).promise();
    const archives = result.Items.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)).slice(0, 5);

    res.json(archives);
  } catch (error) {
    console.error('Recent uploads error:', error);
    res.status(500).json({ error: 'Failed to retrieve recent uploads' });
  }
});

// Route to get categories
app.get('/categories', async (req, res) => {
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME
    };

    const result = await dynamodb.scan(params).promise();
    const categories = [...new Set(result.Items.map(item => item.category))];

    res.json(categories);
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ error: 'Failed to retrieve categories' });
  }
});

// Route to export metadata as JSON
app.get('/export', async (req, res) => {
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME
    };

    const result = await dynamodb.scan(params).promise();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="archives.json"');
    res.json(result.Items);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Route to download file from S3
app.get('/download/:id', async (req, res) => {
  try {
    const archiveParams = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { id: req.params.id }
    };

    const archiveResult = await dynamodb.get(archiveParams).promise();
    if (!archiveResult.Item) {
      return res.status(404).json({ error: 'Archive not found' });
    }

    const s3Params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: archiveResult.Item.s3Key
    };

    const signedUrl = s3.getSignedUrl('getObject', {
      ...s3Params,
      Expires: 60 * 5 // 5 minutes
    });

    res.redirect(signedUrl);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Route to delete archive
app.delete('/archive/:id', async (req, res) => {
  try {
    const archiveParams = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { id: req.params.id }
    };

    const archiveResult = await dynamodb.get(archiveParams).promise();
    if (!archiveResult.Item) {
      return res.status(404).json({ error: 'Archive not found' });
    }

    // Delete from S3
    await s3.deleteObject({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: archiveResult.Item.s3Key
    }).promise();

    // Delete from DynamoDB
    await dynamodb.delete(archiveParams).promise();

    res.json({ message: 'Archive deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete archive' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
