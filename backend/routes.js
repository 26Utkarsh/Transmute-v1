const express = require('express');
const router = express.Router();
const upload = require('./middlewares/upload');
const imageController = require('./controllers/imageController');
const pdfController = require('./controllers/pdfController');

// The Big 4 - Core Endpoints
router.post('/convert-image', upload.single('file'), imageController.convertImage);
router.post('/compress-image', upload.single('file'), imageController.compressImage);
router.post('/image-to-pdf', upload.array('files', 10), imageController.imageToPdf);
router.post('/pdf/merge', upload.array('files', 10), pdfController.mergePdfs);

// The Remaining 5 Endpoints
router.post('/resize-image', upload.single('file'), imageController.resizeImage);
router.post('/split-pdf', upload.single('file'), pdfController.splitPdf);
router.post('/compress-pdf', upload.single('file'), pdfController.compressPdf);
router.post('/pdf-to-images', upload.single('file'), pdfController.pdfToImages);
router.post('/pdf-to-word', upload.single('file'), pdfController.pdfToWord);

module.exports = router;
