// routes/playdateRoutes.js
import express from 'express';
import multer from 'multer';
import protectRoute from '../middleware/auth.middleware.js';
import Playdate from '../models/Playdate.js';
import fetch from 'node-fetch';
import FormData from 'form-data';

const router = express.Router();

// 1️⃣ Configure Multer to store files in memory
const upload = multer({ storage: multer.memoryStorage() });

// 2️⃣ Helper: Upload buffer to imgBB
async function uploadBufferToImgBB(buffer, filename = 'playdate-image') {
  try {
    const formData = new FormData();
    formData.append('image', buffer.toString('base64'));
    formData.append('name', filename);
    
    const response = await fetch(
      'https://api.imgbb.com/1/upload?key=0aec06918a9326fc94e8f28387c4b600',
      {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`imgBB upload failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error uploading to imgBB:', error);
    throw error;
  }
}

// 3️⃣ Create new playdate (with image upload)
router.post(
  '/create',
  protectRoute,
  upload.single('image'),           // expect field name "image"
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

      // 4️⃣ Upload buffer to imgBB
      const uploadResult = await uploadBufferToImgBB(req.file.buffer, `playdate-${Date.now()}`);

      // 5️⃣ Create Playdate document
      const newPlaydate = await Playdate.create({
        title,
        duration,
        access,
        location,
        attractions: Array.isArray(attractions) ? attractions : [attractions],
        date: new Date(date),
        image: uploadResult.url,               // Use imgBB URL
        display_url: uploadResult.display_url, // Also store display URL
        delete_url: uploadResult.delete_url,   // Store delete URL for future management
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

    // No need to handle image deletion as imgBB automatically manages this
    // You can optionally make a delete request to pd.delete_url if stored

    await pd.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;