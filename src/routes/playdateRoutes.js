// routes/playdateRoutes.js
import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import protectRoute from '../middleware/auth.middleware.js';
import Playdate from '../models/Playdate.js';

const router = express.Router();

// 1️⃣ Configure Multer to store files in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});

// 2️⃣ Helper: stream a buffer to Cloudinary
function uploadBufferToCloudinary(buffer, folder = 'playdates') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
}

// 3️⃣ Create new playdate (with image upload)
router.post(
  '/create',
  protectRoute,
  upload.single('image'),           // expect field name “image”
  async (req, res) => {
    try {
      // Validate required text fields
      const { title, duration, access, location, attractions, date } = req.body;
      const missing = ['title','duration','access','location','date']
        .filter(f => !req.body[f]);
      if (missing.length) {
        return res.status(400).json({ error: 'Missing fields', missing });
      }

      // Ensure file arrived
      if (!req.file) {
        return res.status(400).json({ error: 'Image file is required' });
      }

      // 4️⃣ Upload buffer to Cloudinary
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer);

      // 5️⃣ Create Playdate document
      const newPlaydate = await Playdate.create({
        title,
        duration,
        access,
        location,
        attractions: Array.isArray(attractions) ? attractions : [attractions],
        date: new Date(date),
        image: uploadResult.secure_url,
        poster: req.user._id,
      });

      return res.status(201).json(newPlaydate);
    } catch (err) {
      console.error('Playdate creation error:', err);
      return res.status(500).json({ error: 'Server error', message: err.message });
    }
  }
);

// 6️⃣ List all playdates
router.get('/', protectRoute, async (req, res) => {
  try {
    const list = await Playdate
      .find()
      .sort({ createdAt: -1 })
      .populate('poster', 'username profileImage');
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// 7️⃣ Get one playdate by ID
router.get('/:id', async (req, res) => {
  try {
    const pd = await Playdate
      .findById(req.params.id)
      .populate('poster', 'username profileImage');
    if (!pd) return res.status(404).json({ error: 'Not found' });
    res.json(pd);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// 8️⃣ Join a playdate
router.put('/:id/join', protectRoute, async (req, res) => {
  try {
    const pd = await Playdate.findById(req.params.id);
    if (!pd) return res.status(404).json({ error: 'Not found' });

    const userId = req.user._id;
    if (pd.participants.includes(userId)) {
      return res.status(400).json({ error: 'Already joined' });
    }

    pd.participants.push(userId);
    await pd.save();
    res.json(pd);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 9️⃣ Delete a playdate (only poster)
router.delete('/:id', protectRoute, async (req, res) => {
  try {
    const pd = await Playdate.findById(req.params.id);
    if (!pd) return res.status(404).json({ error: 'Not found' });
    if (pd.poster.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Optionally destroy image on Cloudinary
    if (pd.image) {
      const publicId = pd.image
        .split('/')
        .pop()
        .split('.')
        .shift();
      await cloudinary.uploader.destroy(publicId);
    }

    await pd.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
