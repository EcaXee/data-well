/**
 * ==========================================
 * 1. VARIABEL GLOBAL & STATE
 * ==========================================
 */
let rawData = [];
let activeMode = "";     // 'apriori', 'classification', 'kmeans'
let lastCols = [];       // Menyimpan kolom fitur (X) yang dipilih
let lastTarget = "";     // Menyimpan kolom target (Y)
let finalCentroids = []; // Digunakan untuk audit K-Means

/**
 * ==========================================
 * 2. NAVIGASI DASHBOARD & BRANDING
 * ==========================================
 */

// Membuka area kerja algoritma dengan branding "Eca Well"
function openWorkspace(mode) {
    activeMode = mode;
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('tagline').style.display = 'none';
    document.getElementById('workspace').style.display = 'block';
    
    const titles = {
        'apriori': 'Association Rules (Apriori)',
        'classification': 'Classification Suite (K-NN & C4.5)',
        'kmeans': 'Clustering (K-Means)'
    };

    // Menampilkan identitas "Data Mining by Eca Well" pada header workspace
    document.getElementById('activeAlgoName').innerHTML = `
        <span style="font-size: 0.9rem; color: var(--primary); font-weight: 600; display: block; margin-bottom: 5px; letter-spacing: 1px;">
            DATA MINING BY ECA WELL
        </span>
        ${titles[mode]}
    `;
    
    resetProcess();
    addLog(`Mode ${mode.toUpperCase()} aktif. Silakan unggah file Excel.`);
}

function backToMenu() {
    document.getElementById('mainMenu').style.display = 'grid';
    document.getElementById('tagline').style.display = 'block';
    document.getElementById('workspace').style.display = 'none';
    rawData = [];
}

/**
 * ==========================================
 * 3. EXCEL READER (Langkah 01)
 * ==========================================
 */
async function readExcel() {
    const file = document.getElementById('fUpload').files[0];
    if (!file) return alert("Pilih file Excel terlebih dahulu!");

    try {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data);
        const sheetName = wb.SheetNames[0];
        rawData = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
        
        if (rawData.length === 0) return alert("Data Excel kosong!");

        addLog(`Berhasil memuat ${rawData.length} baris data.`);
        renderMappingUI(); 
    } catch (e) {
        alert("Gagal membaca file: " + e.message);
    }
}

/**
 * ==========================================
 * 4. MAPPING ATRIBUT (Langkah 02)
 * ==========================================
 */
function renderMappingUI() {
    const cols = Object.keys(rawData[0]);
    const container = document.getElementById('mappingUI');
    let html = `<div class="grid">`;

    if (activeMode === 'apriori') {
        html += `
            <div class="form-group">
                <label>ID Transaksi:</label>
                <select id="selID">${cols.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
            </div>
            <div class="form-group">
                <label>Nama Barang:</label>
                <select id="selItem">${cols.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
            </div>`;
    } else {
        html += `
            <div class="form-group">
                <label>Atribut Fitur (X):</label>
                <select id="selFeatures" multiple style="height:120px">
                    ${cols.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
                <small style="color:var(--text-muted)">*Tahan Ctrl untuk memilih lebih dari satu.</small>
            </div>`;
        if (activeMode === 'classification') {
            html += `
                <div class="form-group">
                    <label>Target Label (Y):</label>
                    <select id="selTarget">${cols.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
                </div>`;
        }
    }

    container.innerHTML = html + `</div>`;
    document.getElementById('configSection').style.display = 'block';
}

/**
 * ==========================================
 * 5. PARAMETER & INPUT X-UJI (Langkah 03)
 * ==========================================
 */
function prepareParams() {
    const container = document.getElementById('paramsUI');
    const featureCols = Array.from(document.getElementById('selFeatures')?.selectedOptions || []).map(o => o.value);
    lastCols = featureCols;
    
    let html = "";

    // Input X-Uji otomatis untuk Klasifikasi & K-Means
    if (activeMode === 'classification' || activeMode === 'kmeans') {
        if (featureCols.length === 0) return alert("Pilih atribut fitur (X) di Langkah 02!");

        html += `
        <div style="grid-column: 1 / -1; background: var(--primary-light); padding: 25px; border-radius: 15px; margin-bottom: 25px; border: 1px dashed var(--primary);">
            <label class="section-title" style="color: var(--primary); margin-bottom: 15px;">Input Data Uji (X-Uji)</label>
            <div class="grid">
                ${featureCols.map(col => `
                    <div class="form-group">
                        <label>${col}</label>
                        <input type="number" step="any" class="main-xuji-input" data-col="${col}" placeholder="0.00">
                    </div>
                `).join('')}
            </div>
        </div>`;
        
        if (activeMode === 'classification') {
            html += `
                <div class="form-group">
                    <label>Pilih Metode:</label>
                    <select id="subAlgo" onchange="toggleKInput()">
                        <option value="knn">K-Nearest Neighbors (K-NN)</option>
                        <option value="c45">C4.5 Decision Tree</option>
                    </select>
                </div>
                <div class="form-group" id="knnKContainer">
                    <label>Nilai K (Tetangga)</label>
                    <input type="number" id="knnK" value="3">
                </div>`;
        } else {
            html += `<div class="form-group"><label>Jumlah Cluster (k)</label><input type="number" id="kmeansK" value="2"></div>`;
        }
    } else if (activeMode === 'apriori') {
        html = `
            <div class="form-group"><label>Min. Support (Qty)</label><input type="number" id="mSup" value="2"></div>
            <div class="form-group"><label>Min. Confidence (%)</label><input type="number" id="mConf" value="50"></div>`;
    }

    container.innerHTML = html;
    document.getElementById('processSection').style.display = 'block';
}

// Logika UI untuk menyembunyikan input K pada C4.5
function toggleKInput() {
    const sub = document.getElementById('subAlgo').value;
    document.getElementById('knnKContainer').style.display = (sub === 'c45') ? 'none' : 'block';
}

/**
 * ==========================================
 * 6. EKSEKUSI & UTILITIES
 * ==========================================
 */
function runAlgorithm() {
    document.getElementById('resultArea').innerHTML = "";
    addLog(`Menjalankan algoritma ${activeMode.toUpperCase()}...`);

    if (activeMode === 'apriori') buildTabular();
    else if (activeMode === 'kmeans') startKMeans();
    else if (activeMode === 'classification') {
        const sub = document.getElementById('subAlgo').value;
        sub === 'knn' ? startKNN() : startC45();
    }
}

// Rumus Jarak Euclidean Global
function calculateEuclidean(p1, p2, cols) {
    let sum = 0;
    cols.forEach(c => {
        let val1 = Number(p1[c]) || 0;
        let val2 = Number(p2[c]) || 0;
        sum += Math.pow(val1 - val2, 2);
    });
    return Math.sqrt(sum);
}

function addLog(msg) {
    const lp = document.getElementById('logPanel');
    lp.style.display = 'block';
    const time = new Date().toLocaleTimeString('id-ID');
    lp.innerHTML += `<div><span style="color:var(--text-muted)">[${time}]</span> > ${msg}</div>`;
    lp.scrollTop = lp.scrollHeight;
}

function resetProcess() {
    document.getElementById('configSection').style.display = 'none';
    document.getElementById('processSection').style.display = 'none';
    document.getElementById('resultArea').innerHTML = "";
    document.getElementById('logPanel').innerHTML = "";
    document.getElementById('exportControl').style.display = 'none';
}

/**
 * ==========================================
 * 7. EXPORT & REPORTING
 * ==========================================
 */
function generateReport() { window.print(); }

function downloadExcel() {
    const tables = document.querySelectorAll("#resultArea table");
    if (tables.length === 0) return alert("Tidak ada hasil analisis!");
    
    const wb = XLSX.utils.book_new();
    tables.forEach((table, i) => {
        const ws = XLSX.utils.table_to_sheet(table);
        XLSX.utils.book_append_sheet(wb, ws, `Data_Mining_EcaWell_${i + 1}`);
    });
    XLSX.writeFile(wb, `Laporan_EcaWell_${activeMode}.xlsx`);
}