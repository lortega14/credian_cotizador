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

    // Financial Math Helper
    function calculatePMT(ir, np, pv) {
        if (ir === 0) return pv / np;
        return pv * (ir * Math.pow(1 + ir, np)) / (Math.pow(1 + ir, np) - 1);
    }

    // Live Auto-Calculation Preview
    function calculateLivePreview() {
        const rawValue = parseFloat(document.getElementById('q-invoiceValue').value) || 0;
        const valueType = document.getElementById('q-invoiceValueType').value;
        const dpPercent = parseFloat(document.getElementById('q-downpayment').value) || 0.10;
        const insurance = parseFloat(document.getElementById('q-insurance').value) || 0;
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

        const engancheMonto = invoiceTotal * dpPercent;
        const commissionSubtotal = invoiceSubtotal * 0.03;
        const extraSubtotal = commissionSubtotal + insurance;
        const extraIva = extraSubtotal * 0.16;
        const initialPaymentTotal = engancheMonto + extraSubtotal + extraIva;

        const amountToFinance = invoiceTotal - engancheMonto;
        let totalMonthlyRent = 0;
        let baseMonthlyRent = 0;
        let amortizationRows = '';

        const tableContainer = document.getElementById('amortization-table-container');
        const tableBody = document.querySelector('#amortization-table tbody');

        if (amountToFinance > 0) {
            const r = ((annualInterest / 100) / yearBase) * 30;
            baseMonthlyRent = calculatePMT(r, months, amountToFinance);
            totalMonthlyRent = baseMonthlyRent * 1.16; // Add IVA to monthly payment

            let balance = amountToFinance;
            for (let i = 1; i <= months; i++) {
                const interest = balance * r;
                let principal = baseMonthlyRent - interest;

                // Handle exact 0 balance on last month
                if (i === months) {
                    principal = balance;
                }

                const endBalance = balance - principal;

                amortizationRows += `
                    <tr>
                        <td style="text-align:center">${i}</td>
                        <td style="text-align:right">$${balance.toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        <td style="text-align:right">$${baseMonthlyRent.toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2})} <small style="color:#94a3b8; font-size:10px;">+IVA</small></td>
                        <td style="text-align:right; color:#dc2626;">$${interest.toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        <td style="text-align:right; color:#16a34a;">$${principal.toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        <td style="text-align:right; font-weight:600;">$${Math.max(0, endBalance).toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                    </tr>
                `;

                balance = endBalance;
            }

            tableBody.innerHTML = amortizationRows;
            tableContainer.style.display = 'block';
        } else {
            tableContainer.style.display = 'none';
        }

        document.getElementById('preview-initial-payment').textContent = `$${initialPaymentTotal.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('preview-monthly-payment').textContent = `$${totalMonthlyRent.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        const previewMonthsTag = document.getElementById('preview-months');
        if (previewMonthsTag) previewMonthsTag.textContent = months;
    }

    const inputsToWatch = document.querySelectorAll('#q-invoiceValue, #q-invoiceValueType, #q-downpayment, #q-insurance, #q-months, #q-interestRate, #q-yearBase');
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
            const rawValue = parseFloat(document.getElementById('q-invoiceValue').value) || 0;
            const valueType = document.getElementById('q-invoiceValueType').value;
            const dpPercent = parseFloat(document.getElementById('q-downpayment').value) || 0.10;
            const insurance = parseFloat(document.getElementById('q-insurance').value) || 0;
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

            const engancheMonto = invoiceTotal * dpPercent;
            const commissionSubtotal = invoiceSubtotal * 0.03;
            const extraSubtotal = commissionSubtotal + insurance;
            const extraIva = extraSubtotal * 0.16;
            const initialPaymentTotal = engancheMonto + extraSubtotal + extraIva;

            const amountToFinance = invoiceTotal - engancheMonto;

            let totalMonthlyRent = 0;
            if (amountToFinance > 0) {
                const r = ((annualInterest / 100) / yearBase) * 30;
                const baseMonthlyRent = calculatePMT(r, months, amountToFinance);
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
                firstRent: engancheMonto, // Using firstRent to store Enganche for DB
                openingCommission: commissionSubtotal,
                paymentSubtotal: extraSubtotal,
                paymentIva: extraIva,
                initialPaymentTotal: initialPaymentTotal,
                monthlyRent: totalMonthlyRent / 1.16, // Subtotal interest+capital
                monthlyRentIva: totalMonthlyRent - (totalMonthlyRent / 1.16),
                totalMonthlyRent: totalMonthlyRent,
                residualValue: amountToFinance, // Used to store Monto a Financiar
                residualIva: 0,
                netResidualValue: annualInterest, // Store interest rate
                estimatedIsrSaving: dpPercent // Store downpayment percent
            };

            const data = await window.api.createQuote({ generalData, terms: [termData] });
            alert('Cotización guardada exitosamente. Generando PDF...');
            
            // Generate PDF logic passing custom extras
            generatePDF({...data.quote, insuranceAmount: insurance, valueType: valueType}, user);

            // Reset form
            form.reset();
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
                    <td>$${q.generalData.invoiceValue.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
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
        const insurance = quote.insuranceAmount !== undefined ? quote.insuranceAmount : (t.paymentSubtotal - t.openingCommission);
        const annualInterest = t.netResidualValue || 30; // Retrieved from netResidualValue workaround
        const yearBase = t.extraordinaryCommission || 360; // Retrieved from extraordinaryCommission workaround
        const engancheMonto = t.firstRent; // Retrieved from firstRent workaround
        const amountToFinance = t.residualValue; // Retrieved from residualValue workaround
        const dpPercentText = (t.estimatedIsrSaving * 100).toFixed(0) + '%';
        
        let amortizationRowsHTML = '';
        if (amountToFinance > 0) {
            const r = ((annualInterest / 100) / yearBase) * 30;
            const months = t.months;
            const baseMonthlyRent = calculatePMT(r, months, amountToFinance);

            let balance = amountToFinance;
            for (let i = 1; i <= months; i++) {
                const interest = balance * r;
                let principal = baseMonthlyRent - interest;
                if (i === months) principal = balance;
                const endBalance = balance - principal;

                amortizationRowsHTML += `
                    <tr>
                        <td style="padding:6px; border-bottom:1px solid #f1f5f9; text-align:center">${i}</td>
                        <td style="padding:6px; border-bottom:1px solid #f1f5f9; text-align:right">$${balance.toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        <td style="padding:6px; border-bottom:1px solid #f1f5f9; text-align:right">$${baseMonthlyRent.toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        <td style="padding:6px; border-bottom:1px solid #f1f5f9; text-align:right">$${interest.toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        <td style="padding:6px; border-bottom:1px solid #f1f5f9; text-align:right">$${principal.toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        <td style="padding:6px; border-bottom:1px solid #f1f5f9; text-align:right; font-weight:600;">$${Math.max(0, endBalance).toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
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
                    <td style="padding:4px; font-weight: 500;">$${generalData.invoiceValue.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
                <tr>
                    <td style="padding:4px; font-weight:bold; color:#555;">Activo:</td>
                    <td style="padding:4px; font-weight: 500;">${generalData.asset} / ${generalData.type}</td>
                    <td style="padding:4px; font-weight:bold; color:#555;">Plazo / Interés Base:</td>
                    <td style="padding:4px; font-weight: 500;">${t.months} Meses / ${annualInterest}% Base ${yearBase}</td>
                </tr>
            </table>

            <h4 style="margin-bottom: 8px; border-bottom: 2px solid #e1e7ec; padding-bottom: 4px; font-size: 14px; color: #1e293b;">Resumen Financiero</h4>
            <table style="width:100%; border-collapse: collapse; font-size:12px; margin-bottom: 20px;">
                <tr>
                    <!-- Columna Izquierda: Pago Inicial -->
                    <td style="width:50%; vertical-align: top; padding-right: 20px;">
                        <table style="width:100%; border-collapse: collapse;">
                            <tr><td style="padding:4px; border-bottom:1px solid #f1f5f9;">Enganche (${dpPercentText})</td><td style="padding:4px; border-bottom:1px solid #f1f5f9; text-align:right;">$${engancheMonto.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td></tr>
                            <tr><td style="padding:4px; border-bottom:1px solid #f1f5f9;">Comisión Apertura + Seguro</td><td style="padding:4px; border-bottom:1px solid #f1f5f9; text-align:right;">$${t.paymentSubtotal.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td></tr>
                            <tr><td style="padding:4px; border-bottom:1px solid #cbd5e1;">IVA Comisiones y Seguro</td><td style="padding:4px; border-bottom:1px solid #cbd5e1; text-align:right;">$${t.paymentIva.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td></tr>
                            <tr><td style="padding:6px; background:#f8fafc; font-weight:bold;">TOTAL AL INICIO</td><td style="padding:6px; background:#f8fafc; text-align:right; font-weight:bold; color:#0f172a;">$${t.initialPaymentTotal.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td></tr>
                        </table>
                    </td>
                    <!-- Columna Derecha: Rentas -->
                    <td style="width:50%; vertical-align: top;">
                        <table style="width:100%; border-collapse: collapse;">
                            <tr><td style="padding:4px; border-bottom:1px solid #f1f5f9;">Monto a Financiar</td><td style="padding:4px; border-bottom:1px solid #f1f5f9; text-align:right; font-weight:bold;">$${amountToFinance.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td></tr>
                            <tr><td style="padding:4px; border-bottom:1px solid #f1f5f9;">Renta Mensual</td><td style="padding:4px; border-bottom:1px solid #f1f5f9; text-align:right;">$${t.monthlyRent.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td></tr>
                            <tr><td style="padding:4px; border-bottom:1px solid #cbd5e1;">IVA de la Renta</td><td style="padding:4px; border-bottom:1px solid #cbd5e1; text-align:right;">$${t.monthlyRentIva.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td></tr>
                            <tr><td style="padding:6px; background:#f0f9ff; font-weight:bold;">TOTAL MENSUAL</td><td style="padding:6px; background:#f0f9ff; text-align:right; font-weight:bold; color:#3ca65a;">$${t.totalMonthlyRent.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td></tr>
                        </table>
                    </td>
                </tr>
            </table>

            <h4 style="margin-bottom: 8px; border-bottom: 2px solid #e1e7ec; padding-bottom: 4px; font-size: 14px; color: #1e293b;">Tabla de Amortización</h4>
            <table style="width:100%; border-collapse: collapse; font-size:10px; margin-bottom: 10px;">
                <thead>
                    <tr style="background-color: #f8fafc;">
                        <th style="padding:6px; border-bottom:1px solid #cbd5e1; color:#475569;">Mes</th>
                        <th style="padding:6px; border-bottom:1px solid #cbd5e1; color:#475569; text-align:right;">Saldo Inicial</th>
                        <th style="padding:6px; border-bottom:1px solid #cbd5e1; color:#475569; text-align:right;">Pago Mensual</th>
                        <th style="padding:6px; border-bottom:1px solid #cbd5e1; color:#475569; text-align:right;">Intereses</th>
                        <th style="padding:6px; border-bottom:1px solid #cbd5e1; color:#475569; text-align:right;">Capital M.</th>
                        <th style="padding:6px; border-bottom:1px solid #cbd5e1; color:#475569; text-align:right;">Saldo Final</th>
                    </tr>
                </thead>
                <tbody>
                    ${amortizationRowsHTML}
                </tbody>
            </table>

            <div style="font-size: 9px; color: #64748b; line-height: 1.4; text-align: center; margin-top: 15px;">
                <p>Financiera RECREA, S.A. de C.V. | Documento de carácter informativo sin valor contractual.</p>
            </div>
        `;

        const { PDFDocument } = window.PDFLib;
        const templateUrl = '/pdf/hoja_membretada.pdf';
        
        setTimeout(async () => {
            try {
                const templateBytes = await fetch(templateUrl).then(res => res.arrayBuffer());
                const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
                const pages = pdfDoc.getPages();
                const firstPage = pages[0];
                const { width, height } = firstPage.getSize();

                // Increase scale heavily for giant table to look crisp
                const canvas = await html2canvas(container, { scale: 2.5, windowWidth: 800, backgroundColor: null });
                const imgData = canvas.toDataURL('image/png');
                
                const pngImage = await pdfDoc.embedPng(imgData);
                const pdfWidth = width;
                const contentHeight = (canvas.height * pdfWidth) / canvas.width;
                
                firstPage.drawImage(pngImage, {
                    x: 0,
                    y: height - contentHeight - 20, // Leave some margin
                    width: pdfWidth,
                    height: contentHeight
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
