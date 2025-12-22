/**
 * ==========================================
 * 1. CORE LOGIC: APRIORI ALGORITHM
 * ==========================================
 * Algoritma untuk menemukan pola asosiasi 
 * antar item dalam dataset transaksi.
 */

function buildTabular() {
    const idCol = document.getElementById('selID').value;
    const itemCol = document.getElementById('selItem').value;
    const minSup = parseInt(document.getElementById('mSup').value);
    const minConf = parseInt(document.getElementById('mConf').value);

    addLog(`Apriori: Memproses ${rawData.length} baris data transaksi.`);

    // Grouping data berdasarkan ID Transaksi
    let group = {};
    rawData.forEach(row => {
        let id = row[idCol];
        let item = String(row[itemCol]).trim();
        if (!group[id]) group[id] = new Set();
        group[id].add(item);
    });

    let transactions = Object.values(group).map(set => Array.from(set));
    let totalTx = transactions.length;

    // 1. Hitung Frequent Itemset (Kombinasi 1 Item)
    let itemCounts = {};
    transactions.forEach(tx => {
        tx.forEach(item => {
            itemCounts[item] = (itemCounts[item] || 0) + 1;
        });
    });

    let frequentItems = Object.keys(itemCounts)
        .filter(item => itemCounts[item] >= minSup)
        .map(item => ({
            items: [item],
            count: itemCounts[item],
            support: (itemCounts[item] / totalTx) * 100
        }));

    // 2. Generate Association Rules (Kombinasi 2 Item)
    let rules = [];
    if (frequentItems.length > 1) {
        for (let i = 0; i < frequentItems.length; i++) {
            for (let j = 0; j < frequentItems.length; j++) {
                if (i === j) continue;

                let A = frequentItems[i].items[0];
                let B = frequentItems[j].items[0];

                // Hitung Support (A n B)
                let countAB = transactions.filter(tx => tx.includes(A) && tx.includes(B)).length;
                let supportAB = (countAB / totalTx) * 100;

                if (countAB >= minSup) {
                    // Hitung Confidence: P(B|A) = P(A n B) / P(A)
                    let confidence = (countAB / frequentItems[i].count) * 100;

                    if (confidence >= minConf) {
                        // Hitung Lift Ratio: Conf(A->B) / Supp(B)
                        let supportB = frequentItems[j].support / 100;
                        let lift = (confidence / 100) / supportB;

                        rules.push({
                            antecedent: A,
                            consequent: B,
                            support: supportAB,
                            confidence: confidence,
                            lift: lift,
                            count: countAB
                        });
                    }
                }
            }
        }
    }

    renderAprioriResult(totalTx, frequentItems, rules);
}

/**
 * ==========================================
 * 2. RENDERING HASIL (STEP-BY-STEP)
 * ==========================================
 */
function renderAprioriResult(totalTx, frequent, rules) {
    let res = document.getElementById('resultArea');
    
    // Langkah 01: Summary Transaksi
    let h = `
    <div class="card fade-in">
        <div class="step-num">01</div>
        <span class="section-title">Ringkasan Transaksi (Branding: Eca Well)</span>
        <div class="summary-box" style="background:var(--primary); margin-bottom:20px">
            <div class="summary-item"><span>Total Struk (N)</span><b>${totalTx}</b></div>
            <div class="summary-item"><span>Item Lolos Support</span><b>${frequent.length}</b></div>
            <div class="summary-item"><span>Aturan Terbentuk</span><b>${rules.length}</b></div>
        </div>
    </div>`;

    

    // Langkah 02: Tabel Frekuensi Item (1-Itemset)
    h += `
    <div class="card fade-in">
        <div class="step-num">02</div>
        <span class="section-title">Analisis Frekuensi Item (1-Itemset)</span>
        <div class="table-container">
            <table>
                <thead>
                    <tr style="background:#f8fafc">
                        <th>Nama Item</th>
                        <th>Jumlah Muncul</th>
                        <th>Support (%)</th>
                    </tr>
                </thead>
                <tbody>
                    ${frequent.map(item => `
                        <tr>
                            <td><b>${item.items[0]}</b></td>
                            <td>${item.count}</td>
                            <td>${item.support.toFixed(2)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>`;

    // Langkah 03: Association Rules & Lift Ratio
    h += `
    <div class="card fade-in" style="border-top: 5px solid var(--success)">
        <div class="step-num">03</div>
        <span class="section-title">Final Association Rules (Confidence & Lift)</span>
        <div class="table-container">
            <table>
                <thead>
                    <tr style="background:#ecfdf5">
                        <th>Aturan (Jika A → Maka B)</th>
                        <th>Support (%)</th>
                        <th>Confidence (%)</th>
                        <th style="background:var(--primary-light)">Lift Ratio</th>
                        <th>Kesimpulan</th>
                    </tr>
                </thead>
                <tbody>
                    ${rules.length > 0 ? rules.map(r => `
                        <tr>
                            <td>Jika membeli <b>${r.antecedent}</b>, maka membeli <b>${r.consequent}</b></td>
                            <td>${r.support.toFixed(2)}%</td>
                            <td>${r.confidence.toFixed(2)}%</td>
                            <td style="font-weight:bold; color:var(--primary)">${r.lift.toFixed(2)}</td>
                            <td>${r.lift > 1 ? '<span class="val-1">Kuat</span>' : '<span class="val-0">Lemah</span>'}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="5">Tidak ada aturan yang memenuhi kriteria Min. Confidence.</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>`;

    res.innerHTML = h;
    document.getElementById('exportControl').style.display = 'block';
    addLog(`Apriori Selesai: Berhasil membentuk ${rules.length} aturan pola belanja.`);
}
