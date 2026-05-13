document.addEventListener('DOMContentLoaded', async () => {
    const user = await window.requireAuth('COMPANY');
    if (!user) return;

    document.getElementById('user-name').textContent = user.companyName || user.name;

    // Auto-fill client form with company name
    const qClient = document.getElementById('q-client');
    if (qClient) {
        qClient.value = user.companyName || user.name;
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
    // Año Natural (365): 30.4167 días promedio por mes (365/12) → tasa diaria * 30.4167
    function getMonthlyRate(annualRate, yearBase) {
        const daysPerMonth = yearBase === 365 ? (365 / 12) : 30;
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

        let resPct = 0.20;
        if (months === 12) resPct = 0.38;
        else if (months === 18) resPct = 0.30;
        else if (months === 24) resPct = 0.26;
        else if (months === 36) resPct = 0.20;
        else if (months === 48) resPct = 0.15;
        else if (months === 60) resPct = 0.10;

        const residualValue = invoiceSubtotal * resPct;

        const qResidualInput = document.getElementById('q-residualValue');
        if (qResidualInput) {
            qResidualInput.value = toMoneyString(residualValue);
        }

        // Enganche se calcula sobre el SUBTOTAL (sin IVA), como en arrendamiento
        const engancheSubtotal = invoiceSubtotal * dpPercent;
        const engancheIva = engancheSubtotal * 0.16;
        const engancheTotal = engancheSubtotal + engancheIva;
        const commissionSubtotal = invoiceSubtotal * 0.03;
        // Pago inicial = enganche + comisión, todo + IVA
        const pagoInicialSubtotal = engancheSubtotal + commissionSubtotal;
        const pagoInicialIva = pagoInicialSubtotal * 0.16;
        const initialPaymentTotal = pagoInicialSubtotal + pagoInicialIva;

        // Se financia el SUBTOTAL menos el enganche (sin IVA)
        const amountToFinance = invoiceSubtotal - engancheSubtotal;
        const residualIva = residualValue * 0.16;
        const residualTotal = residualValue + residualIva;
        let totalMonthlyRent = 0;
        let baseMonthlyRent = 0;
        let amortizationRows = '';

        const tableContainer = document.getElementById('amortization-table-container');
        const tableBody = document.querySelector('#amortization-table tbody');

        if (amountToFinance > 0) {
            const r = getMonthlyRate(annualInterest, yearBase);
            baseMonthlyRent = calculatePMT(r, months, amountToFinance, residualValue);
            totalMonthlyRent = baseMonthlyRent * 1.16; // Add IVA to monthly payment

            let balance = amountToFinance;
            for (let i = 1; i <= months; i++) {
                const interest = balance * r;
                let principal = baseMonthlyRent - interest;

                // On last month, principal pays down to residual value
                if (i === months) {
                    principal = balance - residualValue;
                }

                const endBalance = balance - principal;

                amortizationRows += `
                    <tr>
                        <td style="text-align:center">${i}</td>
                        <td style="text-align:right">$${balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style="text-align:right">$${baseMonthlyRent.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <small style="color:#94a3b8; font-size:10px;">+IVA</small></td>
                        <td style="text-align:right; color:#dc2626;">$${interest.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style="text-align:right; color:#16a34a;">$${principal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style="text-align:right; font-weight:600;">$${Math.max(0, endBalance).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                `;

                balance = endBalance;
            }

            tableBody.innerHTML = amortizationRows;
            tableContainer.style.display = 'block';
        } else {
            tableContainer.style.display = 'none';
        }

        document.getElementById('preview-initial-payment').textContent = `$${initialPaymentTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('preview-monthly-payment').innerHTML = `$${baseMonthlyRent.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size: 14px; font-weight: 500; color: #64748b;">+ IVA = $${totalMonthlyRent.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
        document.getElementById('preview-residual-value').textContent = `$${residualTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const previewMonthsTag = document.getElementById('preview-months');
        if (previewMonthsTag) previewMonthsTag.textContent = months;
    }

    const inputsToWatch = document.querySelectorAll('#q-invoiceValue, #q-invoiceValueType, #q-downpayment, #q-months, #q-interestRate, #q-yearBase, #q-residualValue');
    inputsToWatch.forEach(input => input.addEventListener('input', calculateLivePreview));
    inputsToWatch.forEach(input => input.addEventListener('change', calculateLivePreview));

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
            const residualValue = parseMoney(document.getElementById('q-residualValue').value);

            let invoiceSubtotal = 0;
            let invoiceTotal = 0;

            if (valueType === 'calculada') {
                invoiceSubtotal = rawValue;
                invoiceTotal = rawValue * 1.16;
            } else {
                invoiceTotal = rawValue;
                invoiceSubtotal = rawValue / 1.16;
            }

            // Enganche sobre SUBTOTAL
            const engancheSubtotal = invoiceSubtotal * dpPercent;
            const engancheIva = engancheSubtotal * 0.16;
            const engancheTotal = engancheSubtotal + engancheIva;
            const commissionSubtotal = invoiceSubtotal * 0.03;
            const pagoInicialSubtotal = engancheSubtotal + commissionSubtotal;
            const pagoInicialIva = pagoInicialSubtotal * 0.16;
            const initialPaymentTotal = pagoInicialSubtotal + pagoInicialIva;

            // Financiar SUBTOTAL - enganche
            const amountToFinance = invoiceSubtotal - engancheSubtotal;

            let totalMonthlyRent = 0;
            if (amountToFinance > 0) {
                const r = getMonthlyRate(annualInterest, yearBase);
                const baseMonthlyRent = calculatePMT(r, months, amountToFinance, residualValue);
                totalMonthlyRent = baseMonthlyRent * 1.16;
            }

            const generalData = {
                client: document.getElementById('q-client').value,
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
                openingCommission: commissionSubtotal,
                paymentSubtotal: pagoInicialSubtotal - engancheSubtotal, // comisión subtotal
                paymentIva: pagoInicialIva,
                initialPaymentTotal: initialPaymentTotal,
                monthlyRent: totalMonthlyRent / 1.16, // Subtotal interest+capital
                monthlyRentIva: totalMonthlyRent - (totalMonthlyRent / 1.16),
                totalMonthlyRent: totalMonthlyRent,
                residualValue: amountToFinance, // Store Monto a Financiar
                residualIva: residualValue, // Store actual residual value amount
                netResidualValue: annualInterest, // Store interest rate
                estimatedIsrSaving: dpPercent // Store downpayment percent
            };

            const data = await window.api.createQuote({ generalData, terms: [termData] });
            alert('Cotización guardada exitosamente. Generando PDF...');

            // Generate PDF logic passing custom extras
            generatePDF({ ...data.quote, valueType: valueType, residualAmount: residualValue, montoAFinanciar: amountToFinance }, user);

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
                    <td>${q.generalData.asset}</td>
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
        const residualIva = residualAmount * 0.16;
        const residualTotal = residualAmount + residualIva;
        const dpPercent = t.estimatedIsrSaving;
        const dpPercentText = (dpPercent * 100).toFixed(0) + '%';
        const selectedMonths = t.months;
        const invoiceTotal = generalData.invoiceValue;

        // ── Calcular comparativo para TODOS los plazos disponibles ──
        const allTerms = [12, 18, 24, 36, 48, 60];
        const fmt = (n) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        let comparisonRowsHTML = '';
        allTerms.forEach(termMonths => {
            const isSelected = termMonths === selectedMonths;
            const r = getMonthlyRate(annualInterest, yearBase);
            let baseRent = 0;
            let rentWithIva = 0;

            let resPct = 0.20;
            if (termMonths === 12) resPct = 0.38;
            else if (termMonths === 18) resPct = 0.30;
            else if (termMonths === 24) resPct = 0.26;
            else if (termMonths === 36) resPct = 0.20;
            else if (termMonths === 48) resPct = 0.15;
            else if (termMonths === 60) resPct = 0.10;

            const invoiceSubtotal = generalData.netValue;
            const currentResidualAmount = invoiceSubtotal * resPct;

            if (amountToFinance > 0) {
                baseRent = calculatePMT(r, termMonths, amountToFinance, currentResidualAmount);
                rentWithIva = baseRent * 1.16;
            }

            // Estilos para la fila seleccionada
            const rowStyle = isSelected
                ? 'background:#dbeafe;'
                : '';
            const cellStyle = isSelected
                ? 'font-weight:700; color:#1e40af;'
                : 'color:#334155;';
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

        container.innerHTML = `
            <div style="text-align:center; margin-bottom: 20px;">
                <h3 style="color:#104289; font-size: 22px; font-weight: 600;">Cotización de Arrendamiento</h3>
            </div>

            <table style="width:100%; border-collapse: collapse; font-size:12px; margin-bottom: 20px;">
                <tr>
                    <td style="padding:4px; font-weight:bold; width:25%; color:#555;">Fecha:</td>
                    <td style="padding:4px; font-weight: 500;">${new Date(quote.createdAt).toLocaleDateString()}</td>
                    <td style="padding:4px; font-weight:bold; width:25%; color:#555;">Moneda:</td>
                    <td style="padding:4px; font-weight: 500;">${generalData.currency}</td>
                </tr>
                <tr>
                    <td style="padding:4px; font-weight:bold; color:#555;">Cliente:</td>
                    <td style="padding:4px; font-weight: 500;">${generalData.client}</td>
                    <td style="padding:4px; font-weight:bold; color:#555;">Valor Factura (con IVA):</td>
                    <td style="padding:4px; font-weight: 500;">$${fmt(generalData.invoiceValue)}</td>
                </tr>
                <tr>
                    <td style="padding:4px; font-weight:bold; color:#555;">Activo:</td>
                    <td style="padding:4px; font-weight: 500;">${generalData.asset} / ${generalData.type}</td>
                    <td style="padding:4px; font-weight:bold; color:#555;">Pago Inicial:</td>
                    <td style="padding:4px; font-weight: 500;">${dpPercentText}</td>
                </tr>
            </table>

            <h4 style="margin-bottom: 8px; border-bottom: 2px solid #104289; padding-bottom: 4px; font-size: 14px; color: #104289;">Comparativo de Plazos</h4>
            <table style="width:100%; border-collapse: collapse; font-size:11px; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color:#1e3a5f; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
                        <th style="padding:7px 8px; background-color:#1e3a5f; color:#ffffff; text-align:left; font-size:10px; font-weight:700; border-bottom:2px solid #1e3a5f;">Plazo</th>
                        <th style="padding:7px 8px; background-color:#1e3a5f; color:#ffffff; text-align:right; font-size:10px; font-weight:700; border-bottom:2px solid #1e3a5f;">Pago Inicial</th>
                        <th style="padding:7px 8px; background-color:#1e3a5f; color:#ffffff; text-align:right; font-size:10px; font-weight:700; border-bottom:2px solid #1e3a5f;">Pago Inicial Total</th>
                        <th style="padding:7px 8px; background-color:#1e3a5f; color:#ffffff; text-align:right; font-size:10px; font-weight:700; border-bottom:2px solid #1e3a5f;">Renta Mensual</th>
                        <th style="padding:7px 8px; background-color:#1e3a5f; color:#ffffff; text-align:right; font-size:10px; font-weight:700; border-bottom:2px solid #1e3a5f;">Renta + IVA</th>
                    </tr>
                </thead>
                <tbody>
                    ${comparisonRowsHTML}
                </tbody>
            </table>

            <h4 style="margin-bottom: 8px; border-bottom: 2px solid #e1e7ec; padding-bottom: 4px; font-size: 14px; color: #1e293b;">Resumen Financiero</h4>
            <table style="width:100%; border-collapse: collapse; font-size:12px; margin-bottom: 20px;">
                <tr>
                    <!-- Columna Izquierda: Pago Inicial -->
                    <td style="width:50%; vertical-align: top; padding-right: 20px;">
                        <table style="width:100%; border-collapse: collapse;">
                            <tr><td style="padding:4px; border-bottom:1px solid #f1f5f9;">Pago Inicial (${dpPercentText} s/subtotal)</td><td style="padding:4px; border-bottom:1px solid #f1f5f9; text-align:right;">$${fmt(engancheSubtotal)}</td></tr>
                            <tr><td style="padding:4px; border-bottom:1px solid #f1f5f9;">IVA Pago Inicial</td><td style="padding:4px; border-bottom:1px solid #f1f5f9; text-align:right;">$${fmt(engancheIva)}</td></tr>
                            <tr><td style="padding:4px; border-bottom:1px solid #f1f5f9;">Comisión Apertura</td><td style="padding:4px; border-bottom:1px solid #f1f5f9; text-align:right;">$${fmt(t.paymentSubtotal)}</td></tr>
                            <tr><td style="padding:4px; border-bottom:1px solid #cbd5e1;">IVA Comisión</td><td style="padding:4px; border-bottom:1px solid #cbd5e1; text-align:right;">$${fmt(t.paymentSubtotal * 0.16)}</td></tr>
                            <tr><td style="padding:6px; background:#f8fafc; font-weight:bold;">TOTAL AL INICIO</td><td style="padding:6px; background:#f8fafc; text-align:right; font-weight:bold; color:#0f172a;">$${fmt(t.initialPaymentTotal)}</td></tr>
                        </table>
                    </td>
                    <!-- Columna Derecha: Rentas -->
                    <td style="width:50%; vertical-align: top;">
                        <table style="width:100%; border-collapse: collapse;">
                            <tr><td style="padding:4px; border-bottom:1px solid #f1f5f9;">Monto a Financiar</td><td style="padding:4px; border-bottom:1px solid #f1f5f9; text-align:right; font-weight:bold;">$${fmt(amountToFinance)}</td></tr>
                            <tr><td style="padding:4px; border-bottom:1px solid #f1f5f9;">Renta Mensual</td><td style="padding:4px; border-bottom:1px solid #f1f5f9; text-align:right;">$${fmt(t.monthlyRent)}</td></tr>
                            <tr><td style="padding:4px; border-bottom:1px solid #cbd5e1;">IVA de la Renta</td><td style="padding:4px; border-bottom:1px solid #cbd5e1; text-align:right;">$${fmt(t.monthlyRentIva)}</td></tr>
                            <tr><td style="padding:6px; background:#f0f9ff; font-weight:bold;">TOTAL MENSUAL</td><td style="padding:6px; background:#f0f9ff; text-align:right; font-weight:bold; color:#3ca65a;">$${fmt(t.totalMonthlyRent)}</td></tr>
                            ${residualAmount > 0 ? `
                            <tr><td colspan="2" style="padding:8px 4px 2px; border-top:2px solid #e2e8f0;"></td></tr>
                            <tr><td style="padding:4px; border-bottom:1px solid #f1f5f9;">Valor Residual</td><td style="padding:4px; border-bottom:1px solid #f1f5f9; text-align:right;">$${fmt(residualAmount)}</td></tr>
                            <tr><td style="padding:4px; border-bottom:1px solid #cbd5e1;">IVA Valor Residual</td><td style="padding:4px; border-bottom:1px solid #cbd5e1; text-align:right;">$${fmt(residualIva)}</td></tr>
                            <tr><td style="padding:6px; background:#fef3c7; font-weight:bold;">TOTAL RESIDUAL</td><td style="padding:6px; background:#fef3c7; text-align:right; font-weight:bold; color:#92400e;">$${fmt(residualTotal)}</td></tr>
                            ` : ''}
                        </table>
                    </td>
                </tr>
            </table>



            <div style="font-size: 8px; color: #64748b; line-height: 1.5; margin-top: 18px; border-top: 1px solid #cbd5e1; padding-top: 10px;">
                <p style="font-weight: bold; margin-bottom: 4px; color: #334155;">NOTAS LEGALES Y CONDICIONES:</p>
                <p><b>Vigencia:</b> 15 días naturales a partir de su emisión. Cantidades en moneda nacional con IVA.</p>
                <p><b>Carácter Informativo:</b> Esta proyección es una simulación de Arrendamiento Puro; no constituye una oferta vinculante, autorización de crédito, ni compromiso de contratación por parte de CREDIAN.</p>
                <p><b>Variabilidad:</b> Las rentas, condiciones y gastos accesorios podrán variar tras la evaluación del perfil crediticio del cliente y las políticas vigentes al momento de la firma del contrato.</p>
                <p><b>Deslinde de Responsabilidad:</b> CREDIAN no se responsabiliza por errores de captura o información ofrecida por terceros (agencias o lotes) ajenos a esta institución.</p>
                <p><b>Gastos:</b> No se incluyen seguros, placas ni contribuciones derivadas del uso de la unidad, salvo pacto en contrario.</p>
                <p><b>Aprobación:</b> Toda operación está sujeta a la entrega de documentación completa y aprobación final por CREDIAN.</p>
            </div>
        `;

        const { PDFDocument } = window.PDFLib;
        const templateUrl = '/pdf/hoja_memb2.pdf';

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

                const canvas = await html2canvas(container, { scale: 2.5, windowWidth: 800, backgroundColor: null });
                const imgData = canvas.toDataURL('image/png');
                const pngImage = await pdfDoc.embedPng(imgData);

                // Scale content to fit on the single page
                const pdfWidth = width;
                const contentHeight = (canvas.height * pdfWidth) / canvas.width;
                const maxHeight = height - 20;
                const finalHeight = Math.min(contentHeight, maxHeight);
                const finalWidth = (finalHeight === maxHeight) ? (canvas.width * maxHeight) / canvas.height : pdfWidth;

                firstPage.drawImage(pngImage, {
                    x: 0,
                    y: height - finalHeight - 10,
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
