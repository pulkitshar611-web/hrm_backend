const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a base64-encoded image to Cloudinary.
 * No multer required — the frontend sends a base64 data URI directly in JSON.
 *
 * POST /api/upload/logo
 * Body: { data: "data:image/png;base64,..." }
 */
const uploadLogo = async (req, res) => {
    try {
        const { data } = req.body;

        if (!data || !data.startsWith('data:')) {
            return res.status(400).json({ error: 'Invalid image data. Expected a base64 data URI.' });
        }

        const result = await cloudinary.uploader.upload(data, {
            folder: 'hrm/logos',
            resource_type: 'image',
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
            transformation: [
                { width: 400, height: 200, crop: 'limit' } // cap size
            ]
        });

        return res.json({
            url: result.secure_url,
            publicId: result.public_id
        });
    } catch (err) {
        console.error('Cloudinary upload error:', err);
        return res.status(500).json({ error: 'Failed to upload image to Cloudinary.' });
    }
};

/**
 * Delete an image from Cloudinary by its public ID.
 *
 * DELETE /api/upload/logo
 * Body: { publicId: "hrm/logos/xxx" }
 */
const deleteLogo = async (req, res) => {
    try {
        const { publicId } = req.body;
        if (!publicId) return res.status(400).json({ error: 'publicId is required.' });

        await cloudinary.uploader.destroy(publicId);
        return res.json({ message: 'Image deleted.' });
    } catch (err) {
        console.error('Cloudinary delete error:', err);
        return res.status(500).json({ error: 'Failed to delete image from Cloudinary.' });
    }
};

module.exports = { uploadLogo, deleteLogo };
