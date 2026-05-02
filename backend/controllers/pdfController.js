const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const archiver = require('archiver');
const pdfParse = require('pdf-parse');
const { Document, Packer, Paragraph, TextRun } = require('docx');

exports.mergePdfs = async (req, res, next) => {
    try {
        if (!req.files || req.files.length < 2) {
            return res.status(400).json({ error: 'Please upload at least 2 PDF files to merge.' });
        }

        const mergedPdf = await PDFDocument.create();

        for (const file of req.files) {
            const pdf = await PDFDocument.load(file.buffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const pdfBytes = await mergedPdf.save();
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', 'attachment; filename=merged.pdf');
        res.send(Buffer.from(pdfBytes));
    } catch (error) {
        next(error);
    }
};

exports.splitPdf = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded.' });

        const pdf = await PDFDocument.load(req.file.buffer);
        const totalPages = pdf.getPageCount();

        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', 'attachment; filename=split_pages.zip');

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(res);

        for (let i = 0; i < totalPages; i++) {
            const singlePagePdf = await PDFDocument.create();
            const [copiedPage] = await singlePagePdf.copyPages(pdf, [i]);
            singlePagePdf.addPage(copiedPage);
            const pdfBytes = await singlePagePdf.save();
            archive.append(Buffer.from(pdfBytes), { name: `page_${i + 1}.pdf` });
        }

        await archive.finalize();
    } catch (error) {
        next(error);
    }
};

exports.compressPdf = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded.' });

        // Create temporary files
        const tempId = Date.now().toString();
        const inputPath = path.join(os.tmpdir(), `input_${tempId}.pdf`);
        const outputPath = path.join(os.tmpdir(), `output_${tempId}.pdf`);
        
        fs.writeFileSync(inputPath, req.file.buffer);

        // Attempt to run Ghostscript
        const gsCmds = ['gswin64c', 'gs', 'gswin32c'];
        let success = false;

        for (const cmd of gsCmds) {
            try {
                const command = `${cmd} -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${inputPath}"`;
                await execPromise(command);
                success = true;
                break;
            } catch (err) {
                // Command not found or failed, try next
            }
        }

        if (success && fs.existsSync(outputPath)) {
            const compressedBuffer = fs.readFileSync(outputPath);
            res.set('Content-Type', 'application/pdf');
            res.set('Content-Disposition', 'attachment; filename=compressed.pdf');
            res.send(compressedBuffer);
        } else {
            // Fallback: Just save via pdf-lib (strips some unused objects)
            const pdf = await PDFDocument.load(req.file.buffer);
            const pdfBytes = await pdf.save({ useObjectStreams: false });
            res.set('Content-Type', 'application/pdf');
            res.set('Content-Disposition', 'attachment; filename=compressed_fallback.pdf');
            res.send(Buffer.from(pdfBytes));
        }

        // Cleanup
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    } catch (error) {
        next(error);
    }
};

exports.pdfToImages = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded.' });

        const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
        const { createCanvas } = require('canvas');

        const data = new Uint8Array(req.file.buffer);
        const loadingTask = pdfjsLib.getDocument({
            data: data,
            disableFontFace: true,
            standardFontDataUrl: path.join(__dirname, '../../node_modules/pdfjs-dist/standard_fonts/')
        });
        
        const pdfDocument = await loadingTask.promise;
        const totalPages = pdfDocument.numPages;

        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', 'attachment; filename=extracted_images.zip');

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(res);

        for (let i = 1; i <= totalPages; i++) {
            const page = await pdfDocument.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); 
            
            const canvas = createCanvas(viewport.width, viewport.height);
            const ctx = canvas.getContext('2d');

            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };

            await page.render(renderContext).promise;
            
            const imageBuffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
            archive.append(imageBuffer, { name: `page_${i}.jpg` });
        }

        await archive.finalize();

    } catch (error) {
        console.error("PDF to Image Error:", error);
        res.status(500).json({ error: 'Failed to extract images from PDF.' });
    }
};

exports.pdfToWord = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded.' });

        // Extract text
        const data = await pdfParse(req.file.buffer);
        const text = data.text;

        // Split text by newlines and create paragraphs
        const paragraphs = text.split('\\n').map(line => {
            return new Paragraph({
                children: [new TextRun(line)]
            });
        });

        const doc = new Document({
            sections: [{
                properties: {},
                children: paragraphs
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.set('Content-Disposition', 'attachment; filename=converted.docx');
        res.send(buffer);

    } catch (error) {
        next(error);
    }
};
