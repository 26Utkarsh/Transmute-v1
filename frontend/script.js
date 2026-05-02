document.addEventListener('DOMContentLoaded', () => {
    // ── UI Elements ─────────────────────────────────────────────
    const zone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const fileListEl = document.getElementById('fileList');
    const processBtn = document.getElementById('processBtn');
    const messageBox = document.getElementById('messageBox');
    const optionsContainer = document.getElementById('optionsContainer');
    const activeToolTitle = document.getElementById('activeToolTitle');
    const outputPreviewArea = document.getElementById('outputPreviewArea');
    const previewContainer = document.getElementById('previewContainer');
    const downloadBtn = document.getElementById('downloadBtn');
    const navClock = document.getElementById('navClock');

    // ── Clock ───────────────────────────────────────────────────
    if (navClock) {
        const updateClock = () => { navClock.textContent = new Date().toLocaleTimeString(); };
        updateClock();
        setInterval(updateClock, 1000);
    }

    // ── Theme Toggle ──────────────────────────────────────────
    const themeToggle = document.getElementById('themeToggle');
    const htmlEl = document.documentElement;
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') htmlEl.setAttribute('data-theme', 'dark');

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const newTheme = htmlEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            if (newTheme === 'dark') {
                htmlEl.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            } else {
                htmlEl.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
            }
        });
    }

    // ── State ───────────────────────────────────────────────────
    let currentEndpoint = 'convert-image';
    let expectedType = 'image';
    let allowMultiple = false;
    let selectedFiles = [];
    let currentDownloadUrl = null;
    let currentDownloadFilename = null;
    let currentBlob = null;

    // ── Drag & drop highlight ──────────────────────────────────
    ['dragenter', 'dragover'].forEach(e =>
      zone.addEventListener(e, ev => { ev.preventDefault(); zone.classList.add('dragging'); })
    );
    ['dragleave', 'drop'].forEach(e =>
      zone.addEventListener(e, ev => { ev.preventDefault(); zone.classList.remove('dragging'); })
    );

    // ── Tool Selection Logic ────────────────────────────────────
    function selectTool(endpoint, type, titleText) {
        currentEndpoint = endpoint;
        expectedType = type;
        
        // Multiple uploads allowed for certain endpoints
        allowMultiple = ['pdf/merge', 'image-to-pdf'].includes(endpoint);
        fileInput.multiple = allowMultiple;
        fileInput.accept = expectedType === 'image' ? 'image/*' : '.pdf';

        activeToolTitle.textContent = titleText;
        
        // Reset selected files when changing tools
        selectedFiles = [];
        updateFileListUI();
        hideMessage();
        if (outputPreviewArea) outputPreviewArea.classList.add('hidden');
        renderOptions();
    }

    // Connect sidebar, mobile tabs, and table rows
    function setupToolLinks(selector) {
        document.querySelectorAll(selector).forEach(el => {
            el.addEventListener('click', e => {
                // For links, prevent default
                if(el.tagName === 'A') e.preventDefault();

                // Update active class on the specific list
                document.querySelectorAll(selector).forEach(x => x.classList.remove('active'));
                el.classList.add('active');

                // If table row, no 'active' class needed, just scroll to top
                if(el.tagName === 'TR') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }

                let title = el.textContent.trim().split('\n')[0].replace('Hot', '').replace('Standard', '');
                if (el.querySelector('.tool-name')) {
                    title = el.querySelector('.tool-name').textContent;
                }

                selectTool(el.dataset.tool, el.dataset.type, title);
            });
        });
    }

    setupToolLinks('.tool-nav a');
    setupToolLinks('.mobile-tab');
    setupToolLinks('.tools-table tr');

    // Removed old nav-tabs logic

    // ── Options Rendering ─────────────────────────────────────
    function renderOptions() {
        optionsContainer.innerHTML = '';
        let html = '';

        if (currentEndpoint === 'convert-image') {
            html = `
                <div style="display: flex; gap: 10px; align-items: center; font-size: 0.8rem;">
                    <label>Target Format:</label>
                    <select id="optFormat" style="padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-med); background: var(--white);">
                        <option value="jpeg">JPEG</option>
                        <option value="png">PNG</option>
                    </select>
                </div>
            `;
        } else if (currentEndpoint === 'compress-image') {
            html = `
                <div style="display: flex; gap: 10px; align-items: center; font-size: 0.8rem;">
                    <label>Quality: <span id="qualityVal">60%</span></label>
                    <input type="range" id="optQuality" min="10" max="100" value="60" style="accent-color: var(--sage);">
                </div>
            `;
            setTimeout(() => {
                const qSlider = document.getElementById('optQuality');
                if (qSlider) qSlider.addEventListener('input', (e) => {
                    document.getElementById('qualityVal').textContent = e.target.value + '%';
                });
            }, 0);
        } else if (currentEndpoint === 'resize-image') {
            html = `
                <div style="display: flex; gap: 10px; align-items: center; font-size: 0.8rem;">
                    <label>Scale %:</label>
                    <input type="number" id="optScale" min="1" max="200" value="50" style="padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-med); background: var(--white); width: 60px;">
                </div>
            `;
        }

        if (html) {
            optionsContainer.innerHTML = html;
            optionsContainer.classList.remove('hidden');
        } else {
            optionsContainer.classList.add('hidden');
        }
    }

    // ── File Handling ──────────────────────────────────────────
    zone.addEventListener('click', (e) => {
        // Prevent click if clicking inside options or buttons
        if(e.target.closest('button') || e.target.closest('#optionsContainer')) return;
        fileInput.click();
    });

    zone.addEventListener('drop', (e) => {
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        fileInput.value = ''; 
    });

    function handleFiles(files) {
        hideMessage();
        if (outputPreviewArea) outputPreviewArea.classList.add('hidden');
        
        if (!allowMultiple) {
            selectedFiles = [files[0]];
        } else {
            selectedFiles = [...selectedFiles, ...Array.from(files)].slice(0, 20); // max 20
        }

        const valid = selectedFiles.every(f => {
            if (expectedType === 'image') return f.type.startsWith('image/');
            if (expectedType === 'pdf') return f.type === 'application/pdf';
            return true;
        });

        if (!valid) {
            showMessage(`Please upload only ${expectedType === 'image' ? 'Images' : 'PDFs'}.`, 'error');
            selectedFiles = [];
        }

        updateFileListUI();
    }

    function updateFileListUI() {
        if (selectedFiles.length === 0) {
            fileListEl.classList.add('hidden');
            processBtn.disabled = true;
            return;
        }

        fileListEl.classList.remove('hidden');
        processBtn.disabled = false;
        fileListEl.innerHTML = `Selected ${selectedFiles.length} file(s): ` + 
            selectedFiles.map(f => f.name).join(', ');
    }

    function showMessage(msg, type) {
        messageBox.textContent = msg;
        messageBox.className = `message-box ${type}`;
        messageBox.classList.remove('hidden');
    }

    function hideMessage() {
        messageBox.classList.add('hidden');
    }

    // ── Process File Logic ─────────────────────────────────────
    processBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // prevent triggering upload zone click
        if (selectedFiles.length === 0) return;

        hideMessage();
        processBtn.disabled = true;
        const originalText = processBtn.textContent;
        processBtn.innerHTML = '<span class="spinner"></span> Processing...';

        try {
            const formData = new FormData();
            
            if (allowMultiple) {
                selectedFiles.forEach(f => formData.append('files', f));
            } else {
                formData.append('file', selectedFiles[0]);
            }

            if (currentEndpoint === 'convert-image') {
                formData.append('format', document.getElementById('optFormat').value);
            } else if (currentEndpoint === 'compress-image') {
                formData.append('quality', document.getElementById('optQuality').value);
            } else if (currentEndpoint === 'resize-image') {
                formData.append('scale', document.getElementById('optScale').value);
            }

            let backendUrl = '/api';
            const port = window.location.port;
            if (port && port !== '5000' && port !== '80' && port !== '443') {
                backendUrl = `http://${window.location.hostname}:5000/api`;
            } else if (window.location.protocol === 'file:') {
                backendUrl = 'http://127.0.0.1:5000/api';
            }

            const response = await fetch(`${backendUrl}/${currentEndpoint}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                let errorMsg = 'An unknown error occurred.';
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) {
                    errorMsg = `Server error (${response.status}).`;
                }
                throw new Error(errorMsg);
            }

            const blob = await response.blob();
            const filename = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'processed_file';
            
            if (currentDownloadUrl) {
                window.URL.revokeObjectURL(currentDownloadUrl);
            }
            currentDownloadUrl = window.URL.createObjectURL(blob);
            currentDownloadFilename = filename;
            currentBlob = blob;

            previewContainer.innerHTML = '';
            const ext = filename.split('.').pop().toLowerCase();
            
            await renderUniversalPreview(blob, ext, filename, previewContainer, currentDownloadUrl);

            outputPreviewArea.classList.remove('hidden');
            showMessage('✓ Processed successfully!', 'success');
            
            setTimeout(() => {
                selectedFiles = [];
                updateFileListUI();
            }, 2000);

        } catch (error) {
            let errorMsg = error.message;
            if (errorMsg.includes('Unexpected end of JSON input') || errorMsg.includes('Failed to fetch')) {
                errorMsg = 'Server disconnected or feature not available.';
            }
            showMessage(errorMsg, 'error');
        } finally {
            processBtn.textContent = originalText;
            if (selectedFiles.length > 0) processBtn.disabled = false;
        }
    });

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!currentDownloadUrl) return;
            const a = document.createElement('a');
            a.href = currentDownloadUrl;
            a.download = currentDownloadFilename || 'processed_file';
            document.body.appendChild(a);
            a.click();
            a.remove();
        });
    }


    async function renderUniversalPreview(blob, ext, filename, container, url) {
        container.innerHTML = '<div style="padding: 2rem; color: var(--ink-soft);"><div class="spinner" style="border-color: var(--sage); border-left-color: transparent;"></div> Generating preview...</div>';

        try {
            if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
                container.innerHTML = `<img src="${url}" style="max-width: 100%; max-height: 250px; border-radius: 4px;">`;
            } else if (ext === 'pdf') {
                container.innerHTML = `<iframe src="${url}#toolbar=0" style="width: 100%; height: 350px; border: 1px solid var(--border-med); border-radius: 4px;"></iframe>`;
            } else if (ext === 'docx' && window.mammoth) {
                const arrayBuffer = await blob.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
                container.innerHTML = `<div style="text-align: left; background: #fff; color: #000; padding: 1.5rem; max-height: 350px; overflow-y: auto; border: 1px solid var(--border-med); border-radius: 4px; font-family: serif; font-size: 0.9rem;">${result.value}</div>`;
            } else if (ext === 'zip' && window.JSZip) {
                const zip = await JSZip.loadAsync(blob);
                let imagesHtml = '';
                let count = 0;
                
                // Show up to 12 image thumbnails
                for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
                    if (!zipEntry.dir && relativePath.match(/\.(jpg|jpeg|png|webp)$/i) && count < 12) {
                        const imgBlob = await zipEntry.async("blob");
                        const imgUrl = URL.createObjectURL(imgBlob);
                        imagesHtml += `<img src="${imgUrl}" style="width: 60px; height: 80px; object-fit: cover; border-radius: 3px; border: 1px solid #ccc; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">`;
                        count++;
                    }
                }
                
                if (count > 0) {
                    const extra = Object.keys(zip.files).length > 12 ? `<div style="font-size: 0.75rem; color: var(--ink-muted); margin-top: 10px;">+ ${Object.keys(zip.files).length - 12} more files inside</div>` : '';
                    container.innerHTML = `<div style="padding: 1rem;"><h4 style="margin-bottom: 10px; font-size: 0.8rem; color: var(--ink);">Extracted Pages:</h4><div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">${imagesHtml}</div>${extra}</div>`;
                } else {
                    container.innerHTML = `<div style="padding: 2rem; color: var(--ink-soft);"><p>📦 ${filename}</p><p style="font-size: 0.8rem;">${Object.keys(zip.files).length} files archived.</p></div>`;
                }
            } else {
                container.innerHTML = `<div style="padding: 2rem; color: var(--ink-soft);"><p>📄 ${filename}</p><p style="font-size: 0.8rem;">Preview not available for this format.</p></div>`;
            }
        } catch (err) {
            console.error("Preview render failed:", err);
            container.innerHTML = `<div style="padding: 2rem; color: var(--rose);"><p>📄 ${filename}</p><p style="font-size: 0.8rem;">Preview could not be generated.</p></div>`;
        }
    }
});
