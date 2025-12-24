/**
 * ==========================================
 * 1. ROUTER KLASIFIKASI
 * ==========================================
 */
function startKNN() {
    processKNN();
}

function startC45() {
    processC45();
}

/**
 * ==========================================
 * 2. LOGIKA UTAMA: K-NEAREST NEIGHBORS (K-NN)
 * ==========================================
 */
function processKNN() {
    const k = parseInt(document.getElementById('knnK').value);
    const cols = lastCols; 
    const target = document.getElementById('selTarget').value;

    if (cols.length === 0 || !target) return alert("Pilih Fitur dan Target di Langkah 02!");

    // Ambil Data X-Uji dari input manual
    let testPoint = {};
    document.querySelectorAll('.main-xuji-input').forEach(inp => {
        testPoint[inp.dataset.col] = Number(inp.value) || 0;
    });

    addLog(`K-NN: Memproses prediksi dengan ${rawData.length} data training.`);

    // Hitung Selisih dan Jarak Euclidean untuk SEMUA data
    let distances = rawData.map((row, idx) => {
        let diffs = {};
        cols.forEach(c => {
            diffs[c] = testPoint[c] - (Number(row[c]) || 0);
        });
        let dist = calculateEuclidean(row, testPoint, cols);
        return { 
            ...row, 
            _diffs: diffs, 
            _dist: dist, 
            _rowNum: idx + 1, 
            _label: row[target] 
        };
    });

    // URUTKAN data dari jarak terkecil ke terbesar
    let sortedDistances = [...distances].sort((a, b) => a._dist - b._dist);
    
    // Ambil K tetangga terdekat
    let neighbors = sortedDistances.slice(0, k);

    // Voting mayoritas
    let votes = {};
    neighbors.forEach(n => { votes[n._label] = (votes[n._label] || 0) + 1; });
    let prediction = Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b);

    renderKNNResult(distances, sortedDistances, neighbors, prediction, k);
}

function renderKNNResult(allDists, sortedAll, neighbors, prediction, kVal) {
    let res = document.getElementById('resultArea');
    
    // Step 01: Detail Selisih (Urutan Asli)
    let h = `
    <div class="card fade-in">
        <div class="step-num">01</div>
        <span class="section-title">Detail Selisih & Jarak Euclidean (Data Training)</span>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th rowspan="2">ID</th>
                        <th colspan="${lastCols.length}" style="background:#f8fafc">Data Training (Xi)</th>
                        <th colspan="${lastCols.length}" style="background:#fff7ed">Selisih (Xuji - Xi)</th>
                        <th rowspan="2" style="background:var(--primary-light)">Jarak</th>
                    </tr>
                    <tr>
                        ${lastCols.map(c => `<th style="font-size:0.7rem">${c}</th>`).join('')}
                        ${lastCols.map(c => `<th style="font-size:0.7rem; color:var(--accent)">Δ ${c}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${allDists.map(row => `
                        <tr>
                            <td>${row._rowNum}</td>
                            ${lastCols.map(c => `<td>${row[c]}</td>`).join('')}
                            ${lastCols.map(c => `<td style="color:var(--accent)">${row._diffs[c].toFixed(2)}</td>`).join('')}
                            <td style="font-weight:bold">${row._dist.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>`;

    // Step 02: Tabel Perangkingan Jarak Terdekat (SEMUA DATA DIURUTKAN)
    h += `
    <div class="card fade-in">
        <div class="step-num">02</div>
        <span class="section-title">Tabel Perangkingan Jarak (Urutan Terdekat)</span>
        <div class="table-container">
            <table>
                <thead style="background:#f1f5f9">
                    <tr>
                        <th>Ranking</th>
                        <th>ID / Baris</th>
                        <th>Jarak Euclidean</th>
                        <th>Label Target</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedAll.map((row, i) => `
                        <tr style="${i < kVal ? 'background:var(--primary-light)' : ''}">
                            <td><b>#${i + 1}</b></td>
                            <td>Baris ${row._rowNum}</td>
                            <td>${row._dist.toFixed(2)}</td>
                            <td>${row._label}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>`;

    // Step 03: K Tetangga Terdekat
    h += `
    <div class="card fade-in">
        <div class="step-num">03</div>
        <span class="section-title">${kVal} Tetangga Terdekat (K-Neighbors)</span>
        <div class="table-container">
            <table style="border: 2px solid var(--success)">
                <thead style="background:var(--success); color:white">
                    <tr><th>Rank</th><th>Baris</th><th>Jarak</th><th>Label</th></tr>
                </thead>
                <tbody>
                    ${neighbors.map((n, i) => `
                        <tr><td>#${i+1}</td><td>Baris ${n._rowNum}</td><td>${n._dist.toFixed(2)}</td><td><b>${n._label}</b></td></tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>`;

    // Step 04: Hasil Prediksi
    h += `
    <div class="card fade-in" style="border-top: 5px solid var(--primary)">
        <div class="step-num">04</div>
        <span class="section-title">Hasil Prediksi Akhir</span>
        <div class="summary-box">
            <div class="summary-item"><span>Label Prediksi (X-Uji)</span><b style="font-size:2.5rem">${prediction}</b></div>
        </div>
    </div>`;

    res.innerHTML = h;
    document.getElementById('exportControl').style.display = 'block';
}

/**
 * ==========================================
 * 3. LOGIKA UTAMA: C4.5
 * ==========================================
 */
function processC45() {
    const cols = lastCols;
    const target = document.getElementById('selTarget').value;
    if (cols.length === 0 || !target) return alert("Pilih Fitur dan Target di Langkah 02!");

    let testPoint = {};
    document.querySelectorAll('.main-xuji-input').forEach(inp => { testPoint[inp.dataset.col] = inp.value; });

    const targetLabels = [...new Set(rawData.map(d => d[target]))].sort();
    const totalEntropy = calculateEntropy(rawData, target);

    let gainResults = cols.map(col => {
        const info = calculateGainRatio(rawData, col, target, totalEntropy, targetLabels);
        return { attribute: col, gain: info.gain, splitInfo: info.splitInfo, gainRatio: info.gainRatio, details: info.details };
    });

    gainResults.sort((a, b) => b.gainRatio - a.gainRatio);
    const bestAttr = gainResults[0];
    const valXuji = testPoint[bestAttr.attribute];
    const predictionDetail = bestAttr.details.find(d => String(d.value) === String(valXuji));
    const prediction = predictionDetail ? predictionDetail.majorityLabel : "N/A";

    renderC45Result(totalEntropy, gainResults, prediction, targetLabels);
}

function calculateEntropy(data, target) {
    if (data.length === 0) return 0;
    let counts = {};
    data.forEach(d => counts[d[target]] = (counts[d[target]] || 0) + 1);
    let entropy = 0;
    Object.values(counts).forEach(count => {
        let p = count / data.length;
        entropy -= p * Math.log2(p);
    });
    return entropy;
}

function calculateGainRatio(data, attr, target, totalEntropy, targetLabels) {
    let attrValues = [...new Set(data.map(d => d[attr]))].sort();
    let subsetInfo = [];
    let sumSubsetEntropy = 0;
    let totalSplitInfo = 0;

    attrValues.forEach(val => {
        let subset = data.filter(d => d[attr] === val);
        let weight = subset.length / data.length;
        let entropyVal = calculateEntropy(subset, target);
        if (weight > 0) totalSplitInfo -= weight * Math.log2(weight);

        let labelCounts = {};
        targetLabels.forEach(label => { labelCounts[label] = subset.filter(s => s[target] === label).length; });
        let majority = Object.keys(labelCounts).reduce((a, b) => labelCounts[a] > labelCounts[b] ? a : b, "-");

        subsetInfo.push({ value: val, count: subset.length, entropy: entropyVal, labelCounts: labelCounts, majorityLabel: majority });
        sumSubsetEntropy += weight * entropyVal;
    });

    let gain = totalEntropy - sumSubsetEntropy;
    let gainRatio = totalSplitInfo === 0 ? 0 : gain / totalSplitInfo;
    return { gain, splitInfo: totalSplitInfo, gainRatio, details: subsetInfo };
}

function renderC45Result(totalEnt, gains, prediction, targetLabels) {
    let res = document.getElementById('resultArea');
    let h = `<div class="card"><h3>1. Entropy Total: ${totalEnt.toFixed(2)}</h3></div>`;
    h += `
    <div class="card">
        <h3>2. Detail Perhitungan Cabang & Gain Ratio</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr style="background:#f1f5f9">
                        <th rowspan="2">Atribut</th><th rowspan="2">Nilai</th><th colspan="${targetLabels.length}">Target</th><th rowspan="2">Total</th><th rowspan="2">Entropy</th><th rowspan="2">Gain</th><th rowspan="2">Split Info</th><th rowspan="2">Ratio</th>
                    </tr>
                    <tr style="background:#f8fafc">${targetLabels.map(l => `<th style="font-size:0.7rem">${l}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${gains.map(g => g.details.map((d, j) => `
                        <tr>
                            ${j === 0 ? `<td rowspan="${g.details.length}"><b>${g.attribute}</b></td>` : ''}
                            <td>${d.value}</td>
                            ${targetLabels.map(l => `<td>${d.labelCounts[l]}</td>`).join('')}
                            <td>${d.count}</td><td>${d.entropy.toFixed(2)}</td>
                            ${j === 0 ? `<td rowspan="${g.details.length}">${g.gain.toFixed(2)}</td><td rowspan="${g.details.length}">${g.splitInfo.toFixed(2)}</td><td rowspan="${g.details.length}" style="font-weight:bold; color:var(--primary)">${g.gainRatio.toFixed(2)}</td>` : ''}
                        </tr>
                    `).join('')).join('')}
                </tbody>
            </table>
        </div>
    </div>
    <div class="card" style="border-top: 5px solid var(--success)"><h3>Hasil Prediksi C4.5: ${prediction}</h3></div>`;
    res.innerHTML = h;
    document.getElementById('exportControl').style.display = 'block';
}
