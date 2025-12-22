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

    let testPoint = {};
    document.querySelectorAll('.main-xuji-input').forEach(inp => {
        testPoint[inp.dataset.col] = Number(inp.value) || 0;
    });

    addLog(`K-NN: Memproses prediksi dengan ${rawData.length} data training.`);

    let distances = rawData.map((row, idx) => {
        let diffs = {};
        cols.forEach(c => {
            diffs[c] = testPoint[c] - (Number(row[c]) || 0);
        });
        let dist = calculateEuclidean(row, testPoint, cols);
        return { ...row, _diffs: diffs, _dist: dist, _rowNum: idx + 1, _label: row[target] };
    });

    let sortedDistances = [...distances].sort((a, b) => a._dist - b._dist);
    let neighbors = sortedDistances.slice(0, k);

    let votes = {};
    neighbors.forEach(n => { votes[n._label] = (votes[n._label] || 0) + 1; });
    let prediction = Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b);

    renderKNNResult(distances, neighbors, prediction, k);
}

function renderKNNResult(allDists, neighbors, prediction, kVal) {
    let res = document.getElementById('resultArea');
    let h = `
    <div class="card fade-in">
        <div class="step-num">01</div>
        <span class="section-title">Detail Selisih & Jarak Euclidean</span>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th rowspan="2">Baris</th>
                        <th colspan="${lastCols.length}" style="background:#f8fafc">Data Training (Xi)</th>
                        <th colspan="${lastCols.length}" style="background:#fff7ed">Selisih (Xuji - Xi)</th>
                        <th rowspan="2" style="background:var(--primary-light)">Jarak</th>
                        <th rowspan="2">Label</th>
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
                            <td>${row._label}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>`;

    h += `
    <div class="card fade-in">
        <div class="step-num">02</div>
        <span class="section-title">${kVal} Tetangga Terdekat</span>
        <div class="table-container">
            <table style="border: 2px solid var(--success)">
                <thead style="background:var(--success); color:white">
                    <tr><th>Ranking</th><th>Baris</th><th>Jarak</th><th>Label</th></tr>
                </thead>
                <tbody>
                    ${neighbors.map((n, i) => `
                        <tr><td>#${i+1}</td><td>Baris ${n._rowNum}</td><td>${n._dist.toFixed(2)}</td><td><b>${n._label}</b></td></tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
    <div class="card fade-in" style="border-top: 5px solid var(--primary)">
        <div class="step-num">03</div>
        <span class="section-title">Hasil Prediksi K-NN</span>
        <div class="summary-box"><div class="summary-item"><span>Label Akhir</span><b style="font-size:2.5rem">${prediction}</b></div></div>
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
    document.querySelectorAll('.main-xuji-input').forEach(inp => {
        testPoint[inp.dataset.col] = inp.value; 
    });

    addLog(`C4.5: Menghitung Entropy dan Gain Ratio.`);

    const targetLabels = [...new Set(rawData.map(d => d[target]))].sort();
    
    let summaryCounts = {};
    targetLabels.forEach(l => {
        summaryCounts[l] = rawData.filter(d => d[target] === l).length;
    });

    const totalEntropy = calculateEntropy(rawData, target);

    let gainResults = cols.map(col => {
        const info = calculateGainRatio(rawData, col, target, totalEntropy, targetLabels);
        return { 
            attribute: col, 
            gain: info.gain, 
            splitInfo: info.splitInfo, 
            gainRatio: info.gainRatio, 
            details: info.details 
        };
    });

    gainResults.sort((a, b) => b.gainRatio - a.gainRatio);
    const bestAttr = gainResults[0];

    const valXuji = testPoint[bestAttr.attribute];
    const predictionDetail = bestAttr.details.find(d => String(d.value) === String(valXuji));
    const prediction = predictionDetail ? predictionDetail.majorityLabel : "N/A";

    renderC45Result(totalEntropy, summaryCounts, gainResults, prediction, targetLabels);
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
        targetLabels.forEach(label => {
            labelCounts[label] = subset.filter(s => s[target] === label).length;
        });

        let majority = Object.keys(labelCounts).reduce((a, b) => labelCounts[a] > labelCounts[b] ? a : b, "-");

        subsetInfo.push({ 
            value: val, 
            count: subset.length, 
            entropy: entropyVal, 
            labelCounts: labelCounts, 
            majorityLabel: majority 
        });
        sumSubsetEntropy += weight * entropyVal;
    });

    let gain = totalEntropy - sumSubsetEntropy;
    let gainRatio = totalSplitInfo === 0 ? 0 : gain / totalSplitInfo;

    return { gain, splitInfo: totalSplitInfo, gainRatio, details: subsetInfo };
}

function renderC45Result(totalEnt, summary, gains, prediction, targetLabels) {
    let res = document.getElementById('resultArea');
    
    let h = `
    <div class="card fade-in">
        <div class="step-num">01</div>
        <span class="section-title">Ringkasan Dataset & Entropy Total</span>
        <div class="summary-box" style="background:var(--primary); margin-bottom:20px">
            <div class="summary-item"><span>Total Data</span><b>${rawData.length}</b></div>
            ${targetLabels.map(l => `<div class="summary-item"><span>Total "${l}"</span><b>${summary[l]}</b></div>`).join('')}
            <div class="summary-item"><span>Entropy Total</span><b>${totalEnt.toFixed(2)}</b></div>
        </div>
    </div>`;

    h += `
    <div class="card fade-in">
        <div class="step-num">02</div>
        <span class="section-title">Detail Perhitungan Cabang & Gain Ratio</span>
        <div class="table-container">
            <table>
                <thead>
                    <tr style="background:#f1f5f9">
                        <th rowspan="2">Atribut</th>
                        <th rowspan="2">Nilai Atribut</th>
                        <th colspan="${targetLabels.length}">Distribusi Target</th>
                        <th rowspan="2">Total</th>
                        <th rowspan="2">Entropy</th>
                        <th rowspan="2">Gain</th>
                        <th rowspan="2">Split Info</th>
                        <th rowspan="2" style="background:var(--primary-light)">Gain Ratio</th>
                    </tr>
                    <tr style="background:#f8fafc">
                        ${targetLabels.map(l => `<th style="font-size:0.7rem">${l}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${gains.map((g, i) => 
                        g.details.map((d, j) => `
                            <tr>
                                ${j === 0 ? `<td rowspan="${g.details.length}"><b>${g.attribute}</b></td>` : ''}
                                <td>${d.value}</td>
                                ${targetLabels.map(l => `<td>${d.labelCounts[l]}</td>`).join('')}
                                <td>${d.count}</td>
                                <td>${d.entropy.toFixed(2)}</td>
                                ${j === 0 ? `<td rowspan="${g.details.length}">${g.gain.toFixed(2)}</td>` : ''}
                                ${j === 0 ? `<td rowspan="${g.details.length}">${g.splitInfo.toFixed(2)}</td>` : ''}
                                ${j === 0 ? `<td rowspan="${g.details.length}" style="font-weight:bold; color:var(--primary)">${g.gainRatio.toFixed(2)}</td>` : ''}
                            </tr>
                        `).join('')
                    ).join('')}
                </tbody>
            </table>
        </div>
    </div>`;

    h += `
    <div class="card fade-in" style="border-top: 5px solid var(--success)">
        <div class="step-num">03</div>
        <span class="section-title">Hasil Prediksi C4.5</span>
        <div class="summary-box" style="background:var(--success)">
            <div class="summary-item"><span>Prediksi Berdasarkan Root Node</span><b style="font-size:2.5rem">${prediction}</b></div>
        </div>
    </div>`;

    res.innerHTML = h;
    document.getElementById('exportControl').style.display = 'block';
}