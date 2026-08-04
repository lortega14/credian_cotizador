document.addEventListener('DOMContentLoaded', async () => {
    const user = await window.requireAuth('COMPANY');
    if (!user) return;

    let currentAmortizationData = [];
    let selectedAmortizationYear = 1;

    function renderAmortizationYear(yearNum) {
        selectedAmortizationYear = yearNum;
        const tableBody = document.querySelector('#amortization-table tbody');
        const yearSummaryContainer = document.getElementById('amortization-year-summary');
        const yearTabsContainer = document.getElementById('amortization-year-tabs');

        if (!currentAmortizationData || currentAmortizationData.length === 0) return;

        const totalMonths = currentAmortizationData.length;
        const totalYears = Math.ceil(totalMonths / 12);

        // Sanity check yearNum
        if (typeof yearNum !== 'number' || yearNum < 1 || yearNum > totalYears) {
            yearNum = 1;
        }

        // Render Year Tabs
        if (yearTabsContainer) {
            let tabsHTML = '';
            for (let y = 1; y <= totalYears; y++) {
                const startM = (y - 1) * 12 + 1;
                const endM = Math.min(y * 12, totalMonths);
                const isActive = y === yearNum;
                const bg = isActive ? 'var(--primary)' : 'rgba(0,0,0,0.06)';
                const color = isActive ? '#ffffff' : '#475569';
                const shadow = isActive ? '0 4px 10px rgba(15, 78, 136, 0.25)' : 'none';
                tabsHTML += `<button type="button" class="year-tab-btn" data-year="${y}" style="padding: 6px 14px; border: none; border-radius: 8px; background: ${bg}; color: ${color}; font-weight: ${isActive ? '700' : '600'}; font-size: 12px; cursor: pointer; transition: all 0.2s; box-shadow: ${shadow};">Año ${y} (${startM}-${endM})</button>`;
            }

            yearTabsContainer.innerHTML = tabsHTML;

            yearTabsContainer.querySelectorAll('.year-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const yr = parseInt(btn.getAttribute('data-year')) || 1;
                    renderAmortizationYear(yr);
                });
            });
        }

        // Filter Rows - Strictly 12 months per tab
        const startIdx = (yearNum - 1) * 12;
        const filtered = currentAmortizationData.slice(startIdx, startIdx + 12);

        let rowsHTML = '';
        let periodInterest = 0;
        let periodPrincipal = 0;
        let periodRent = 0;
        let endBalance = 0;

        filtered.forEach(row => {
            periodInterest += row.interest;
            periodPrincipal += row.principal;
            periodRent += row.baseMonthlyRent;
            endBalance = row.endBalance;

            rowsHTML += `
                <tr>
                    <td style="text-align:center; font-weight:600;">${row.month}</td>
                    <td style="text-align:right">$${row.balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style="text-align:right; font-weight:600; color:#0f172a;">$${(row.baseMonthlyRent * 1.16).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style="text-align:right; color:#dc2626;">$${row.interest.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style="text-align:right; color:#16a34a;">$${row.principal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style="text-align:right; font-weight:600;">$${Math.max(0, row.endBalance).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
            `;
        });

        if (tableBody) tableBody.innerHTML = rowsHTML;

        // Render Summary
        if (yearSummaryContainer && filtered.length > 0) {
            const labelTitle = `Resumen Año ${yearNum} (Meses ${filtered[0].month} al ${filtered[filtered.length - 1].month})`;
            yearSummaryContainer.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                    <div>
                        <h5 style="margin: 0 0 2px 0; color: #104289; font-size: 14px; font-weight: 700;">${labelTitle}</h5>
                        <p style="margin: 0; font-size: 12px; color: #64748b;">Resumen acumulado del periodo visualizado</p>
                    </div>
                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                        <div>
                            <span style="font-size: 11px; color: #64748b; display: block;">Rentas en Periodo (con IVA)</span>
                            <strong style="font-size: 15px; color: #0f172a;">$${(periodRent * 1.16).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </div>
                        <div>
                            <span style="font-size: 11px; color: #64748b; display: block;">Interés Pagado</span>
                            <strong style="font-size: 15px; color: #dc2626;">$${periodInterest.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </div>
                        <div>
                            <span style="font-size: 11px; color: #64748b; display: block;">Capital Pagado</span>
                            <strong style="font-size: 15px; color: #16a34a;">$${periodPrincipal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </div>
                        <div>
                            <span style="font-size: 11px; color: #64748b; display: block;">Saldo Final</span>
                            <strong style="font-size: 15px; color: #104289;">$${Math.max(0, endBalance).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    document.getElementById('user-name').textContent = user.companyName || user.name;

    // Auto-fill client form with company name
    const qClient = document.getElementById('q-client');
    if (qClient) {
        qClient.value = user.companyName || user.name;
    }

    // Lock condition if fixed
    const qType = document.getElementById('q-type');
    if (qType && user.fixedCondition && user.fixedCondition !== 'Libre') {
        qType.value = user.fixedCondition;
        qType.style.backgroundColor = '#e2e8f0';
        qType.style.color = '#475569';
        qType.style.cursor = 'not-allowed';
        qType.style.fontWeight = 'bold';
        qType.disabled = true;

        // Si no es libre, removemos Camiones del selector de vehículos
        const qAsset = document.getElementById('q-asset');
        if (qAsset) {
            for (let i = 0; i < qAsset.options.length; i++) {
                if (qAsset.options[i].value === 'Camiones') {
                    qAsset.options[i].disabled = true;
                    qAsset.options[i].style.display = 'none';
                }
            }
        }
    }

    const navNewQuote = document.getElementById('nav-new-quote');
    const navHistory = document.getElementById('nav-history');
    const viewNewQuote = document.getElementById('view-new-quote');
    const viewHistory = document.getElementById('view-history');
    const pageTitle = document.getElementById('page-title');

    // Navigation
    navNewQuote.addEventListener('click', (e) => {
        e.preventDefault();
        navNewQuote.classList.add('active');
        navHistory.classList.remove('active');
        viewNewQuote.style.display = 'block';
        viewHistory.style.display = 'none';
        pageTitle.textContent = 'Nueva Cotización';
    });

    navHistory.addEventListener('click', (e) => {
        e.preventDefault();
        navHistory.classList.add('active');
        navNewQuote.classList.remove('active');
        viewHistory.style.display = 'block';
        viewNewQuote.style.display = 'none';
        pageTitle.textContent = 'Historial';
        loadQuotes();
    });

    // Financial Math Helper — supports optional future value (balloon/residual)
    function calculatePMT(ir, np, pv, fv) {
        fv = fv || 0;
        if (ir === 0) return (pv - fv) / np;
        const factor = Math.pow(1 + ir, np);
        return (pv * ir * factor - fv * ir) / (factor - 1);
    }

    // Monthly interest rate helper
    // Año Comercial (360): 30 días por mes → tasa diaria * 30
    // Año Natural (365): 30.5 días promedio por mes → tasa diaria * 30.5
    function getMonthlyRate(annualRate, yearBase, leaseType) {
        const daysPerMonth = leaseType === 'Financiero' ? 30.52077 : 30.4;
        return ((annualRate / 100) / yearBase) * daysPerMonth;
    }

    // ── Money Formatting Helpers ──
    // Strips $, commas, spaces to get raw number
    function parseMoney(val) {
        if (!val) return 0;
        return parseFloat(String(val).replace(/[\$,\s]/g, '')) || 0;
    }

    // Formats a number as $1,234,567.89
    function toMoneyString(n) {
        if (isNaN(n) || n === 0) return '';
        return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Live-format a money input on blur (when user leaves the field)
    function formatMoneyInput(e) {
        const input = e.target;
        const raw = parseMoney(input.value);
        if (raw > 0) {
            input.value = toMoneyString(raw);
        } else {
            input.value = '';
        }
    }

    // Strip formatting when user focuses (so they can edit the raw number)
    function unformatMoneyInput(e) {
        const input = e.target;
        const raw = parseMoney(input.value);
        if (raw > 0) {
            input.value = raw.toString();
        } else {
            input.value = '';
        }
    }

    // Attach money formatting to all currency inputs
    const moneyInputs = document.querySelectorAll('#q-invoiceValue, #q-residualValue');
    moneyInputs.forEach(input => {
        input.addEventListener('blur', formatMoneyInput);
        input.addEventListener('focus', unformatMoneyInput);
    });

    // Live Auto-Calculation Preview
    function calculateLivePreview() {
        const rawValue = parseMoney(document.getElementById('q-invoiceValue').value);
        const valueType = document.getElementById('q-invoiceValueType').value;
        const dpPercent = parseFloat(document.getElementById('q-downpayment').value) || 0.10;

        const months = parseInt(document.getElementById('q-months').value) || 12;
        const annualInterest = parseFloat(document.getElementById('q-interestRate').value) || 30;
        const yearBase = parseInt(document.getElementById('q-yearBase').value) || 360;

        let invoiceSubtotal = 0;
        let invoiceTotal = 0;

        if (valueType === 'calculada') {
            invoiceSubtotal = rawValue;
            invoiceTotal = rawValue * 1.16;
        } else {
            invoiceTotal = rawValue;
            invoiceSubtotal = rawValue / 1.16;
        }

        const leaseType = document.getElementById('q-leaseType') ? document.getElementById('q-leaseType').value : 'Puro';
        let resPct = 0;

        if (leaseType !== 'Financiero') {
            resPct = 0.20;
            if (months === 12) resPct = 0.38;
            else if (months === 18) resPct = 0.30;
            else if (months === 24) resPct = 0.26;
            else if (months === 36) resPct = 0.20;
            else if (months === 48) resPct = 0.15;
            else if (months === 60) resPct = 0.10;

            const conditionType = document.getElementById('q-type').value;
            const assetType = document.getElementById('q-asset').value;
            if (assetType === 'Camiones' && conditionType === 'Seminuevo') {
                if (months === 12 || months === 18 || months === 24) resPct = 0.10;
                else if (months === 36 || months === 48 || months === 60) resPct = 0.05;
            } else if (conditionType === 'Seminuevo') {
                resPct = resPct / 2;
            }
        }

        const residualValue = invoiceTotal * resPct;
        const residualTotal = residualValue * 1.16; // Valor residual ya con IVA

        const groupResidual = document.getElementById('group-residual-value');
        const previewResidualContainer = document.getElementById('preview-residual-container');
        const previewBadge = document.getElementById('preview-lease-type-badge');

        if (leaseType === 'Financiero') {
            if (groupResidual) groupResidual.style.display = 'none';
            if (previewResidualContainer) previewResidualContainer.style.display = 'none';
            if (previewBadge) {
                previewBadge.textContent = 'Arrendamiento Financiero';
                previewBadge.style.background = '#0284c7';
            }
        } else {
            if (groupResidual) groupResidual.style.display = 'block';
            if (previewResidualContainer) previewResidualContainer.style.display = 'block';
            if (previewBadge) {
                previewBadge.textContent = 'Arrendamiento Puro';
                previewBadge.style.background = 'var(--primary)';
            }
        }

        const qResidualInput = document.getElementById('q-residualValue');
        if (qResidualInput) {
            qResidualInput.value = toMoneyString(residualTotal);
        }

        let engancheSubtotal = 0;
        let commissionRate = 0;
        let amountToFinance = 0;

        if (leaseType === 'Financiero') {
            engancheSubtotal = rawValue * dpPercent;
            commissionRate = 0;
            amountToFinance = invoiceSubtotal * (1 - dpPercent);
        } else {
            engancheSubtotal = invoiceSubtotal * dpPercent;
            commissionRate = invoiceTotal > 1000000 ? 0.02 : 0.03;
            amountToFinance = invoiceSubtotal - engancheSubtotal;
        }

        const engancheIva = engancheSubtotal * 0.16;
        const engancheTotal = engancheSubtotal + engancheIva;
        const commissionSubtotal = invoiceTotal * commissionRate;
        const commissionTotal = commissionSubtotal * 1.16; // Comisión ya con IVA incluido
        // Pago inicial = enganche + IVA enganche + comisión (ya con IVA)
        const initialPaymentSubtotal = engancheSubtotal + commissionSubtotal;
        const initialPaymentTotal = engancheTotal + commissionTotal;
        let totalMonthlyRent = 0;
        let baseMonthlyRent = 0;
        let amortizationRows = '';

        const tableContainer = document.getElementById('amortization-table-container');
        const tableBody = document.querySelector('#amortization-table tbody');

        if (amountToFinance > 0) {
            const r = getMonthlyRate(annualInterest, yearBase, leaseType);
            baseMonthlyRent = calculatePMT(r, months, amountToFinance, residualValue);
            totalMonthlyRent = baseMonthlyRent * 1.16; // Add IVA to monthly payment

            let balance = amountToFinance;
            currentAmortizationData = [];

            for (let i = 1; i <= months; i++) {
                const interest = balance * r;
                let principal = baseMonthlyRent - interest;

                // On last month, principal pays down to residual value
                if (i === months) {
                    principal = balance - residualValue;
                }

                const endBalance = balance - principal;

                currentAmortizationData.push({
                    month: i,
                    balance: balance,
                    baseMonthlyRent: baseMonthlyRent,
                    interest: interest,
                    principal: principal,
                    endBalance: endBalance
                });

                balance = endBalance;
            }

            tableContainer.style.display = 'block';
            renderAmortizationYear(1);
        } else {
            tableContainer.style.display = 'none';
            currentAmortizationData = [];
        }

        document.getElementById('preview-initial-payment').innerHTML = `$${initialPaymentSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size: 14px; font-weight: 500; color: #64748b;">+ IVA = $${initialPaymentTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
        document.getElementById('preview-monthly-payment').innerHTML = `$${baseMonthlyRent.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size: 14px; font-weight: 500; color: #64748b;">+ IVA = $${totalMonthlyRent.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
        document.getElementById('preview-residual-value').innerHTML = `$${residualValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size: 14px; font-weight: 500; color: #64748b;">+ IVA = $${residualTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
        const previewMonthsTag = document.getElementById('preview-months');
        if (previewMonthsTag) previewMonthsTag.textContent = months;
    }

    const inputsToWatch = document.querySelectorAll('#q-invoiceValue, #q-downpayment, #q-months, #q-interestRate, #q-yearBase, #q-residualValue, #q-type, #q-leaseType, #q-asset');
    
    // Segmented Tabs for Lease Type
    const leaseTabBtns = document.querySelectorAll('.lease-tab-btn');
    const qLeaseTypeInput = document.getElementById('q-leaseType');
    if (leaseTabBtns.length > 0 && qLeaseTypeInput) {
        leaseTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const val = btn.getAttribute('data-value');
                qLeaseTypeInput.value = val;

                leaseTabBtns.forEach(b => {
                    if (b === btn) {
                        b.classList.add('active');
                        b.style.background = 'var(--primary)';
                        b.style.color = 'white';
                        b.style.boxShadow = '0 4px 12px rgba(15, 78, 136, 0.25)';
                    } else {
                        b.classList.remove('active');
                        b.style.background = 'transparent';
                        b.style.color = '#64748b';
                        b.style.boxShadow = 'none';
                    }
                });

                calculateLivePreview();
            });
        });
    }
    
    // Handle 60 meses restriction for Camiones Seminuevos
    const qMonthsElem = document.getElementById('q-months');
    const qAssetElem = document.getElementById('q-asset');
    if (qType && qMonthsElem && qAssetElem) {
        const toggle60Months = () => {
            if (qAssetElem.value === 'Camiones' && qType.value === 'Seminuevo') {
                for (let i = 0; i < qMonthsElem.options.length; i++) {
                    if (qMonthsElem.options[i].value === '60') {
                        qMonthsElem.options[i].disabled = true;
                        qMonthsElem.options[i].style.display = 'none';
                    }
                }
                if (qMonthsElem.value === '60') {
                    qMonthsElem.value = '48';
                }
            } else {
                for (let i = 0; i < qMonthsElem.options.length; i++) {
                    if (qMonthsElem.options[i].value === '60') {
                        qMonthsElem.options[i].disabled = false;
                        qMonthsElem.options[i].style.display = '';
                    }
                }
            }
        };
        qType.addEventListener('change', toggle60Months);
        qAssetElem.addEventListener('change', toggle60Months);
        toggle60Months();
    }

    inputsToWatch.forEach(input => input.addEventListener('input', calculateLivePreview));
    inputsToWatch.forEach(input => input.addEventListener('change', calculateLivePreview));

    // WhatsApp Copy Summary Button
    const btnCopyWhatsapp = document.getElementById('btn-copy-whatsapp');
    if (btnCopyWhatsapp) {
        btnCopyWhatsapp.addEventListener('click', () => {
            const client = document.getElementById('q-client').value || 'Cliente';
            const leaseType = document.getElementById('q-leaseType').value || 'Puro';
            const asset = document.getElementById('q-asset').value || 'Vehículo';
            const condition = document.getElementById('q-type').value || 'Nuevo';
            const desc = document.getElementById('q-description').value || '';
            const rawVal = parseMoney(document.getElementById('q-invoiceValue').value);
            const months = document.getElementById('q-months').value || '12';

            const initialPaymentText = document.getElementById('preview-initial-payment').innerText || '$0.00';
            const monthlyPaymentText = document.getElementById('preview-monthly-payment').innerText || '$0.00';

            let msg = `*COTIZACIÓN CREDIAN*\n`;
            msg += `• *Cliente:* ${client}\n`;
            msg += `• *Esquema:* Arrendamiento ${leaseType}\n`;
            msg += `• *Activo:* ${asset} (${condition}) ${desc ? '- ' + desc : ''}\n`;
            msg += `• *Valor Factura:* $${rawVal.toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2})} MXN\n`;
            msg += `• *Pago Inicial (Eng+Com):* ${initialPaymentText}\n`;
            msg += `• *Renta Mensual (${months} meses):* ${monthlyPaymentText}\n`;

            if (leaseType === 'Puro') {
                const residualText = document.getElementById('preview-residual-value').innerText || '$0.00';
                msg += `• *Valor Residual Base:* ${residualText}\n`;
            }

            msg += `\n*CREDIAN Cotizador*`;

            navigator.clipboard.writeText(msg).then(() => {
                if (window.showToast) window.showToast('Resumen copiado al portapapeles', 'success');
            }).catch(() => {
                if (window.showToast) window.showToast('No se pudo copiar el resumen.', 'error');
            });
        });
    }

    // Clear Form Button
    const btnClearForm = document.getElementById('btn-clear-form');
    if (btnClearForm) {
        btnClearForm.addEventListener('click', () => {
            document.getElementById('q-description').value = '';
            document.getElementById('q-invoiceValue').value = '';
            document.getElementById('q-asset').value = '';
            document.getElementById('q-type').value = user.fixedCondition && user.fixedCondition !== 'Libre' ? user.fixedCondition : 'Nuevo';
            calculateLivePreview();
            if (window.showToast) window.showToast('Formulario limpiado', 'info');
        });
    }

    // Handle Form Submit
    const form = document.getElementById('quote-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnSave = document.getElementById('btn-save-quote');
        btnSave.disabled = true;
        btnSave.textContent = 'Procesando...';

        try {
            const rawValue = parseMoney(document.getElementById('q-invoiceValue').value);
            const valueType = document.getElementById('q-invoiceValueType').value;
            const dpPercent = parseFloat(document.getElementById('q-downpayment').value) || 0.10;

            const months = parseInt(document.getElementById('q-months').value) || 12;
            const annualInterest = parseFloat(document.getElementById('q-interestRate').value) || 30;
            const yearBase = parseInt(document.getElementById('q-yearBase').value) || 360;
            // We recalculate residual value based on total instead of parsing from UI
            let invoiceSubtotal = 0;
            let invoiceTotal = 0;

            if (valueType === 'calculada') {
                invoiceSubtotal = rawValue;
                invoiceTotal = rawValue * 1.16;
            } else {
                invoiceTotal = rawValue;
                invoiceSubtotal = rawValue / 1.16;
            }

            const leaseType = document.getElementById('q-leaseType') ? document.getElementById('q-leaseType').value : 'Puro';
            let resPct = 0;

            if (leaseType !== 'Financiero') {
                resPct = 0.20;
                if (months === 12) resPct = 0.38;
                else if (months === 18) resPct = 0.30;
                else if (months === 24) resPct = 0.26;
                else if (months === 36) resPct = 0.20;
                else if (months === 48) resPct = 0.15;
                else if (months === 60) resPct = 0.10;

                const conditionType = document.getElementById('q-type').value;
                const assetType = document.getElementById('q-asset').value;
                if (assetType === 'Camiones' && conditionType === 'Seminuevo') {
                    if (months === 12 || months === 18 || months === 24) resPct = 0.10;
                    else if (months === 36 || months === 48 || months === 60) resPct = 0.05;
                } else if (conditionType === 'Seminuevo') {
                    resPct = resPct / 2;
                }
            }

            const residualSubtotal = invoiceTotal * resPct;

            let engancheSubtotal = 0;
            let commissionRate = 0;
            let amountToFinance = 0;

            if (leaseType === 'Financiero') {
                engancheSubtotal = rawValue * dpPercent;
                commissionRate = 0;
                amountToFinance = invoiceSubtotal * (1 - dpPercent);
            } else {
                engancheSubtotal = invoiceSubtotal * dpPercent;
                commissionRate = invoiceTotal > 1000000 ? 0.02 : 0.03;
                amountToFinance = invoiceSubtotal - engancheSubtotal;
            }

            const engancheIva = engancheSubtotal * 0.16;
            const engancheTotal = engancheSubtotal + engancheIva;
            const commissionSubtotal = invoiceTotal * commissionRate;
            const commissionTotal = commissionSubtotal * 1.16; // Comisión ya con IVA incluido
            // Pago inicial = enganche + IVA enganche + comisión (ya con IVA)
            const initialPaymentTotal = engancheTotal + commissionTotal;

            let totalMonthlyRent = 0;
            if (amountToFinance > 0) {
                const r = getMonthlyRate(annualInterest, yearBase, leaseType);
                const baseMonthlyRent = calculatePMT(r, months, amountToFinance, residualSubtotal);
                totalMonthlyRent = baseMonthlyRent * 1.16;
            }

            const generalData = {
                client: document.getElementById('q-client').value,
                leaseType: document.getElementById('q-leaseType') ? document.getElementById('q-leaseType').value : 'Puro',
                asset: document.getElementById('q-asset').value,
                type: document.getElementById('q-type').value,
                description: document.getElementById('q-description').value,
                currency: document.getElementById('q-currency').value,
                invoiceValue: invoiceTotal, // Store standard Total Factura
                iva: invoiceTotal - invoiceSubtotal,
                netValue: invoiceSubtotal,
                exchangeRate: 1,
                rentType: 'Fija'
            };

            const termData = {
                months: months,
                extraordinaryCommission: yearBase, // Using this numeric field to store yearBase for PDF rendering
                firstRent: engancheSubtotal, // Using firstRent to store Enganche subtotal for DB
                openingCommission: commissionTotal, // Comisión ya con IVA
                paymentSubtotal: commissionTotal, // Comisión total (ya incluye IVA)
                paymentIva: engancheSubtotal * 0.16, // Solo IVA del enganche
                initialPaymentTotal: initialPaymentTotal,
                monthlyRent: totalMonthlyRent / 1.16, // Subtotal interest+capital
                monthlyRentIva: totalMonthlyRent - (totalMonthlyRent / 1.16),
                totalMonthlyRent: totalMonthlyRent,
                residualValue: amountToFinance, // Store Monto a Financiar
                residualIva: residualSubtotal, // Store actual residual value amount
                netResidualValue: annualInterest, // Store interest rate
                estimatedIsrSaving: dpPercent // Store downpayment percent
            };

            const data = await window.api.createQuote({ generalData, terms: [termData] });
            if (window.showToast) window.showToast('¡Cotización guardada exitosamente! Generando PDF...', 'success');

            // Generate PDF logic passing custom extras
            generatePDF({ ...data.quote, valueType: valueType, residualAmount: residualSubtotal, montoAFinanciar: amountToFinance }, user);

            // Reset form
            form.reset();
            // Re-fill client name (form.reset clears disabled fields too)
            if (qClient) qClient.value = user.companyName || user.name;
            calculateLivePreview();
            navHistory.click();

        } catch (error) {
            alert('Error al guardar la cotización: ' + error.message);
        } finally {
            btnSave.disabled = false;
            btnSave.textContent = 'Guardar y Generar PDF';
        }
    });

    // Load History
    async function loadQuotes() {
        try {
            const tableBody = document.querySelector('#history-table tbody');
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Cargando...</td></tr>';

            const quotes = await window.api.getQuotes();

            if (quotes.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay cotizaciones</td></tr>';
                return;
            }

            tableBody.innerHTML = '';
            quotes.forEach(q => {
                const date = new Date(q.createdAt).toLocaleDateString();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${date}</td>
                    <td>${q.generalData.client}</td>
                    <td>${q.generalData.asset} (${q.generalData.leaseType || 'Puro'})</td>
                    <td>$${q.generalData.invoiceValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${q.generalData.currency}</td>
                    <td>
                        <button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick='reprintPDF(${JSON.stringify(q)}, ${JSON.stringify(user)})'>Descargar PDF</button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        } catch (error) {
            console.error(error);
        }
    }

    window.reprintPDF = generatePDF;

    function generatePDF(quote, userObj) {
        const { generalData, terms } = quote;
        const container = document.getElementById('print-container');

        const t = terms[0];

        const annualInterest = t.netResidualValue || 30; // Retrieved from netResidualValue workaround
        const yearBase = t.extraordinaryCommission || 360; // Retrieved from extraordinaryCommission workaround
        const engancheSubtotal = t.firstRent; // Retrieved from firstRent workaround (now stores subtotal)
        const engancheIva = engancheSubtotal * 0.16;
        const engancheTotal = engancheSubtotal + engancheIva;
        const amountToFinance = t.residualValue; // Retrieved from residualValue workaround
        const residualAmount = quote.residualAmount !== undefined ? quote.residualAmount : (t.residualIva || 0); // Actual residual value
        const residualTotal = residualAmount * 1.16; // Valor residual ya con IVA incluido
        const dpPercent = t.estimatedIsrSaving;
        const dpPercentText = (dpPercent * 100).toFixed(0) + '%';
        const selectedMonths = t.months;
        const invoiceTotal = generalData.invoiceValue;

        // ── Calcular comparativo para TODOS los plazos disponibles ──
        let allTerms = [12, 18, 24, 36, 48, 60];
        if (generalData.asset === 'Camiones' && generalData.type === 'Seminuevo') {
            allTerms = [12, 18, 24, 36, 48];
        }
        const fmt = (n) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        let comparisonRowsHTML = '';
        allTerms.forEach(termMonths => {
            const isSelected = termMonths === selectedMonths;
            const r = getMonthlyRate(annualInterest, yearBase);
            let baseRent = 0;
            let rentWithIva = 0;

            let resPct = 0;
            const leaseType = generalData.leaseType || 'Puro';

            if (leaseType !== 'Financiero') {
                resPct = 0.20;
                if (termMonths === 12) resPct = 0.38;
                else if (termMonths === 18) resPct = 0.30;
                else if (termMonths === 24) resPct = 0.26;
                else if (termMonths === 36) resPct = 0.20;
                else if (termMonths === 48) resPct = 0.15;
                else if (termMonths === 60) resPct = 0.10;

                if (generalData.asset === 'Camiones' && generalData.type === 'Seminuevo') {
                    if (termMonths === 12 || termMonths === 18 || termMonths === 24) resPct = 0.10;
                    else if (termMonths === 36 || termMonths === 48 || termMonths === 60) resPct = 0.05;
                } else if (generalData.type === 'Seminuevo') {
                    resPct = resPct / 2;
                }
            }

            const invoiceSubtotal = generalData.netValue;
            const currentResidualAmount = invoiceTotal * resPct;

            if (amountToFinance > 0) {
                baseRent = calculatePMT(r, termMonths, amountToFinance, currentResidualAmount);
                rentWithIva = baseRent * 1.16;
            }

            // Estilos para la fila seleccionada
            const rowStyle = isSelected
                ? 'background:#dbeafe;'
                : '';
            const cellStyle = isSelected
                ? 'font-weight:700; color:#104289;'
                : 'font-weight:600; color:#0f172a;';
            const badge = isSelected
                ? ' <span style="background:#2563eb; color:#fff; font-size:7px; padding:2px 5px; border-radius:3px; margin-left:3px; vertical-align:middle; letter-spacing:0.5px;">✔ SELECCIONADO</span>'
                : '';

            comparisonRowsHTML += `
                <tr style="${rowStyle}">
                    <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0; ${cellStyle}">${termMonths} Meses${badge}</td>
                    <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0; text-align:right; ${cellStyle}">$${fmt(engancheTotal)}</td>
                    <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0; text-align:right; ${cellStyle}">$${fmt(t.initialPaymentTotal)}</td>
                    <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0; text-align:right; ${cellStyle}">$${fmt(baseRent)}</td>
                    <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0; text-align:right; ${cellStyle}">$${fmt(rentWithIva)}</td>
                </tr>
            `;
        });

        // ── Tabla de amortización solo del plazo seleccionado ──
        let amortizationRowsHTML = '';
        if (amountToFinance > 0) {
            const r = getMonthlyRate(annualInterest, yearBase);
            const months = t.months;
            const baseMonthlyRent = calculatePMT(r, months, amountToFinance, residualAmount);

            let balance = amountToFinance;
            for (let i = 1; i <= months; i++) {
                const interest = balance * r;
                let principal = baseMonthlyRent - interest;
                if (i === months) principal = balance - residualAmount;
                const endBalance = balance - principal;

                amortizationRowsHTML += `
                    <tr>
                        <td style="padding:6px; border-bottom:1px solid #f1f5f9; text-align:center">${i}</td>
                        <td style="padding:6px; border-bottom:1px solid #f1f5f9; text-align:right">$${fmt(balance)}</td>
                        <td style="padding:6px; border-bottom:1px solid #f1f5f9; text-align:right">$${fmt(baseMonthlyRent)}</td>
                        <td style="padding:6px; border-bottom:1px solid #f1f5f9; text-align:right">$${fmt(interest)}</td>
                        <td style="padding:6px; border-bottom:1px solid #f1f5f9; text-align:right">$${fmt(principal)}</td>
                        <td style="padding:6px; border-bottom:1px solid #f1f5f9; text-align:right; font-weight:600;">$${fmt(Math.max(0, endBalance))}</td>
                    </tr>
                `;
                balance = endBalance;
            }
        }

        const activeLeaseType = generalData.leaseType || 'Puro';
        const isFinanciero = activeLeaseType === 'Financiero';

        container.innerHTML = `
            <style>
                #print-container * {
                    color: #000000 !important;
                    opacity: 1 !important;
                    font-family: Arial, Helvetica, sans-serif !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                #print-container h3, #print-container h4 {
                    color: #104289 !important;
                }
                #print-container th {
                    background-color: #104289 !important;
                    color: #ffffff !important;
                    font-weight: 700 !important;
                }
                #print-container .text-green {
                    color: #16a34a !important;
                    font-weight: 700 !important;
                }
                #print-container .text-residual {
                    color: #92400e !important;
                    font-weight: 700 !important;
                }
                #print-container .badge-selected {
                    background-color: #2563eb !important;
                    color: #ffffff !important;
                    font-weight: 700 !important;
                }
                #print-container .pdf-row-selected {
                    background-color: #dbeafe !important;
                }
                #print-container .pdf-row-selected td {
                    color: #104289 !important;
                    font-weight: 700 !important;
                }
            </style>

            <div style="text-align:center; margin-bottom: 16px;">
                <h3 style="color:#104289 !important; font-size: 22px; font-weight: 700; margin:0 0 4px 0;">Cotización de Arrendamiento ${activeLeaseType}</h3>
                <span style="display:inline-block; background:${isFinanciero ? '#0284c7' : '#104289'} !important; color:#ffffff !important; padding:3px 14px; border-radius:12px; font-size:11px; font-weight:600;">
                    ${isFinanciero ? 'Esquema: Arrendamiento Financiero (Sin Valor Residual)' : 'Esquema: Arrendamiento Puro (Con Opción a Compra)'}
                </span>
            </div>

            <table style="width:100%; border-collapse: collapse; font-size:12px; margin-bottom: 20px;">
                <tr>
                    <td style="padding:4px; font-weight:bold; width:25%;">Fecha:</td>
                    <td style="padding:4px; font-weight:600;">${new Date(quote.createdAt).toLocaleDateString()}</td>
                    <td style="padding:4px; font-weight:bold; width:25%;">Moneda:</td>
                    <td style="padding:4px; font-weight:600;">${generalData.currency}</td>
                </tr>
                <tr>
                    <td style="padding:4px; font-weight:bold;">Cliente:</td>
                    <td style="padding:4px; font-weight:600;">${generalData.client}</td>
                    <td style="padding:4px; font-weight:bold;">Valor Factura (con IVA):</td>
                    <td style="padding:4px; font-weight:600;">$${fmt(generalData.invoiceValue)}</td>
                </tr>
                <tr>
                    <td style="padding:4px; font-weight:bold;">Activo:</td>
                    <td style="padding:4px; font-weight:600;">${generalData.asset} / ${generalData.type}</td>
                    <td style="padding:4px; font-weight:bold;">Pago Inicial:</td>
                    <td style="padding:4px; font-weight:600;">${dpPercentText}</td>
                </tr>
            </table>

            <h4 style="margin-bottom: 8px; border-bottom: 2px solid #104289 !important; padding-bottom: 4px; font-size: 14px; color: #104289 !important;">Comparativo de Plazos</h4>
            <table style="width:100%; border-collapse: collapse; font-size:11px; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color:#104289 !important;">
                        <th style="padding:7px 8px; background-color:#104289 !important; color:#ffffff !important; text-align:left; font-size:10px; font-weight:700;">Plazo</th>
                        <th style="padding:7px 8px; background-color:#104289 !important; color:#ffffff !important; text-align:right; font-size:10px; font-weight:700;">Pago Inicial</th>
                        <th style="padding:7px 8px; background-color:#104289 !important; color:#ffffff !important; text-align:right; font-size:10px; font-weight:700;">Pago Inicial Total</th>
                        <th style="padding:7px 8px; background-color:#104289 !important; color:#ffffff !important; text-align:right; font-size:10px; font-weight:700;">Renta Mensual</th>
                        <th style="padding:7px 8px; background-color:#104289 !important; color:#ffffff !important; text-align:right; font-size:10px; font-weight:700;">Renta + IVA</th>
                    </tr>
                </thead>
                <tbody>
                    ${comparisonRowsHTML}
                </tbody>
            </table>

            <h4 style="margin-bottom: 8px; border-bottom: 2px solid #cbd5e1 !important; padding-bottom: 4px; font-size: 14px; color: #000000 !important;">Resumen Financiero</h4>
            <table style="width:100%; border-collapse: collapse; font-size:12px; margin-bottom: 20px;">
                <tr>
                    <!-- Columna Izquierda: Pago Inicial -->
                    <td style="width:50%; vertical-align: top; padding-right: 20px;">
                        <table style="width:100%; border-collapse: collapse;">
                            <tr><td style="padding:4px; border-bottom:1px solid #e2e8f0;">Pago Inicial (${dpPercentText} s/subtotal)</td><td style="padding:4px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:600;">$${fmt(engancheSubtotal)}</td></tr>
                            <tr><td style="padding:4px; border-bottom:1px solid #e2e8f0;">IVA Pago Inicial</td><td style="padding:4px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:600;">$${fmt(engancheIva)}</td></tr>
                            <tr><td style="padding:4px; border-bottom:1px solid #cbd5e1;">Comisión Apertura (IVA incluido)</td><td style="padding:4px; border-bottom:1px solid #cbd5e1; text-align:right; font-weight:600;">$${fmt(t.paymentSubtotal)}</td></tr>
                            <tr><td style="padding:6px; background:#f8fafc !important; font-weight:bold;">TOTAL AL INICIO</td><td style="padding:6px; background:#f8fafc !important; text-align:right; font-weight:bold;">$${fmt(t.initialPaymentTotal)}</td></tr>
                        </table>
                    </td>
                    <!-- Columna Derecha: Rentas -->
                    <td style="width:50%; vertical-align: top;">
                        <table style="width:100%; border-collapse: collapse;">
                            <tr><td style="padding:4px; border-bottom:1px solid #e2e8f0;">Monto a Financiar</td><td style="padding:4px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:bold;">$${fmt(amountToFinance)}</td></tr>
                            <tr><td style="padding:4px; border-bottom:1px solid #e2e8f0;">Renta Mensual</td><td style="padding:4px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:600;">$${fmt(t.monthlyRent)}</td></tr>
                            <tr><td style="padding:4px; border-bottom:1px solid #cbd5e1;">IVA de la Renta</td><td style="padding:4px; border-bottom:1px solid #cbd5e1; text-align:right; font-weight:600;">$${fmt(t.monthlyRentIva)}</td></tr>
                            <tr><td style="padding:6px; background:#f0f9ff !important; font-weight:bold;">TOTAL MENSUAL</td><td style="padding:6px; background:#f0f9ff !important; text-align:right; font-weight:bold;" class="text-green">$${fmt(t.totalMonthlyRent)}</td></tr>
                            ${residualAmount > 0 ? `
                            <tr><td colspan="2" style="padding:8px 4px 2px; border-top:2px solid #cbd5e1;"></td></tr>
                            <tr><td style="padding:6px; background:#fef3c7 !important; font-weight:bold;">Valor Residual (IVA incluido)</td><td style="padding:6px; background:#fef3c7 !important; text-align:right; font-weight:bold;" class="text-residual">$${fmt(residualTotal)}</td></tr>
                            ` : ''}
                        </table>
                    </td>
                </tr>
            </table>

            <div style="font-size: 8px; line-height: 1.5; margin-top: 18px; border-top: 1px solid #cbd5e1; padding-top: 10px;">
                <p style="font-weight: bold; margin-bottom: 4px;">NOTAS LEGALES Y CONDICIONES:</p>
                <p style="margin:2px 0;"><b>Vigencia:</b> 15 días naturales a partir de su emisión. Cantidades en moneda nacional con IVA.</p>
                <p style="margin:2px 0;"><b>Carácter Informativo:</b> Esta proyección es una simulación de <b>Arrendamiento ${activeLeaseType}</b>; no constituye una oferta vinculante, autorización de crédito, ni compromiso de contratación por parte de CREDIAN.</p>
                <p style="margin:2px 0;"><b>Transferencia / Valor Residual:</b> ${isFinanciero ? 'En el Arrendamiento Financiero, la propiedad del activo se transfiere al arrendatario al término de las rentas estipuladas, sin pago adicional de valor residual.' : 'Al término del contrato de Arrendamiento Puro, el cliente podrá optar por la compra del vehículo pagando el valor residual, la devolución de la unidad o la renovación del arrendamiento.'}</p>
                <p style="margin:2px 0;"><b>Variabilidad:</b> Las rentas, condiciones y gastos accesorios podrán variar tras la evaluación del perfil crediticio del cliente y las políticas vigentes al momento de la firma del contrato.</p>
                <p style="margin:2px 0;"><b>Deslinde de Responsabilidad:</b> CREDIAN no se responsabiliza por errores de captura o información ofrecida por terceros (agencias o lotes) ajenos a esta institución.</p>
                <p style="margin:2px 0;"><b>Gastos:</b> No se incluyen seguros, placas ni contribuciones derivadas del uso de la unidad, salvo pacto en contrario.</p>
                <p style="margin:2px 0;"><b>Aprobación:</b> Toda operación está sujeta a la entrega de documentación completa y aprobación final por CREDIAN.</p>
            </div>
        `;

        const { PDFDocument } = window.PDFLib;
        const templateUrl = '/pdf/hoja_memb10.pdf';

        setTimeout(async () => {
            try {
                const templateBytes = await fetch(templateUrl).then(res => res.arrayBuffer());
                const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });

                // Remove extra pages from template (keep only page 1)
                while (pdfDoc.getPageCount() > 1) {
                    pdfDoc.removePage(pdfDoc.getPageCount() - 1);
                }

                const firstPage = pdfDoc.getPages()[0];
                const { width, height } = firstPage.getSize();

                container.style.position = 'absolute';
                container.style.left = '-9999px';
                container.style.top = '0';
                container.style.opacity = '1';
                container.style.background = '#ffffff';

                const canvas = await html2canvas(container, {
                    scale: 2.5,
                    windowWidth: 800,
                    backgroundColor: '#ffffff',
                    useCORS: true,
                    logging: false
                });

                container.style.position = 'absolute';
                container.style.left = '-9999px';
                container.style.opacity = '1';

                const imgData = canvas.toDataURL('image/png');
                const pngImage = await pdfDoc.embedPng(imgData);

                // Precise placement between header logo area and footer address area
                const marginTop = 125; // 125pt space for top logo
                const marginBottom = 45; // 45pt space for footer address
                const availableHeight = height - marginTop - marginBottom;

                const pdfWidth = width;
                const contentHeight = (canvas.height * pdfWidth) / canvas.width;
                const finalHeight = Math.min(contentHeight, availableHeight);
                const finalWidth = (finalHeight === availableHeight) ? (canvas.width * availableHeight) / canvas.height : pdfWidth;
                const startX = (width - finalWidth) / 2;

                firstPage.drawImage(pngImage, {
                    x: startX,
                    y: height - marginTop - finalHeight,
                    width: finalWidth,
                    height: finalHeight
                });

                const pdfBytes = await pdfDoc.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = `Cotizacion_${generalData.client.replace(/ /g, '_')}.pdf`;
                link.click();

                container.innerHTML = '';
            } catch (err) {
                console.error('Error generating PDF:', err);
                alert('No se pudo generar el PDF con la hoja membretada.');
                container.innerHTML = '';
            }
        }, 300);
    }
});
