const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

exports.convertImage = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image file uploaded.' });

        const targetFormat = req.body.format || 'jpeg'; // 'jpeg' or 'png'
        if (!['jpeg', 'png'].includes(targetFormat)) {
            return res.status(400).json({ error: 'Unsupported format. Choose jpeg or png.' });
        }

        const buffer = await sharp(req.file.buffer)
            .toFormat(targetFormat)
            .toBuffer();

        res.set('Content-Type', `image/${targetFormat}`);
        res.set('Content-Disposition', `attachment; filename=converted.${targetFormat}`);
        res.send(buffer);
    } catch (error) {
        next(error);
    }
};

exports.compressImage = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image file uploaded.' });

        const quality = parseInt(req.body.quality, 10) || 60; // Default 60% quality

        const image = sharp(req.file.buffer);
        const metadata = await image.metadata();
        const ext = metadata.format === 'png' ? 'png' : (metadata.format === 'webp' ? 'webp' : 'jpeg');

        let compressedBuffer;
        if (ext === 'png') {
            compressedBuffer = await image.png({ quality: quality, compressionLevel: 9 }).toBuffer();
        } else if (ext === 'webp') {
            compressedBuffer = await image.webp({ quality: quality }).toBuffer();
        } else {
            compressedBuffer = await image.jpeg({ quality: quality }).toBuffer();
        }

        res.set('Content-Type', `image/${ext}`);
        res.set('Content-Disposition', `attachment; filename=compressed.${ext}`);
        res.send(compressedBuffer);
    } catch (error) {
        next(error);
    }
};

exports.imageToPdf = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No image file(s) uploaded.' });

        const pdfDoc = await PDFDocument.create();
        
        for (const file of req.files) {
            const metadata = await sharp(file.buffer).metadata();
            let image;
            // pdf-lib supports embedding JPEG and PNG
            if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
                image = await pdfDoc.embedJpg(file.buffer);
            } else if (metadata.format === 'png') {
                image = await pdfDoc.embedPng(file.buffer);
            } else {
                // Convert to JPEG first if it's WEBP or something else
                const jpegBuffer = await sharp(file.buffer).jpeg().toBuffer();
                image = await pdfDoc.embedJpg(jpegBuffer);
            }

            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, {
                x: 0,
                y: 0,
                width: image.width,
                height: image.height,
            });
        }

        const pdfBytes = await pdfDoc.save();

        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', 'attachment; filename=converted.pdf');
        res.send(Buffer.from(pdfBytes));
    } catch (error) {
        next(error);
    }
};

exports.resizeImage = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image file uploaded.' });

        const width = req.body.width ? parseInt(req.body.width, 10) : null;
        const height = req.body.height ? parseInt(req.body.height, 10) : null;
        const scale = req.body.scale ? parseFloat(req.body.scale) : null;

        let image = sharp(req.file.buffer);
        const metadata = await image.metadata();

        let finalWidth = metadata.width;
        let finalHeight = metadata.height;

        if (scale) {
            finalWidth = Math.round(metadata.width * (scale / 100));
            finalHeight = Math.round(metadata.height * (scale / 100));
        } else if (width || height) {
            finalWidth = width || Math.round(metadata.width * (height / metadata.height));
            finalHeight = height || Math.round(metadata.height * (width / metadata.width));
        }

        const buffer = await image
            .resize(finalWidth, finalHeight, { fit: 'inside' })
            .toBuffer();

        const ext = metadata.format === 'jpeg' ? 'jpg' : metadata.format;
        res.set('Content-Type', `image/${metadata.format}`);
        res.set('Content-Disposition', `attachment; filename=resized.${ext}`);
        res.send(buffer);
    } catch (error) {
        next(error);
    }
};
