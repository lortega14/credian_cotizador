document.addEventListener('DOMContentLoaded', async () => {
    const user = await window.requireAuth('ADMIN');
    if (!user) return;

    document.getElementById('user-name').textContent = 'Admin (' + (user.companyName || user.name) + ')';

    const navOverview = document.getElementById('nav-overview');
    const navCompanies = document.getElementById('nav-companies');
    const navReports = document.getElementById('nav-reports');
    const viewOverview = document.getElementById('view-overview');
    const viewCompanies = document.getElementById('view-companies');
    const viewReports = document.getElementById('view-reports');
    const pageTitle = document.getElementById('page-title');

    // Navigation
    navOverview.addEventListener('click', (e) => {
        e.preventDefault();
        navOverview.classList.add('active');
        navCompanies.classList.remove('active');
        navReports.classList.remove('active');
        viewOverview.style.display = 'block';
        viewCompanies.style.display = 'none';
        viewReports.style.display = 'none';
        pageTitle.textContent = 'Vista General';
        loadDashboardData();
    });

    navCompanies.addEventListener('click', (e) => {
        e.preventDefault();
        navCompanies.classList.add('active');
        navOverview.classList.remove('active');
        navReports.classList.remove('active');
        viewCompanies.style.display = 'block';
        viewOverview.style.display = 'none';
        viewReports.style.display = 'none';
        pageTitle.textContent = 'Gestión de Empresas';
        loadCompaniesData();
    });

    navReports.addEventListener('click', (e) => {
        e.preventDefault();
        navReports.classList.add('active');
        navOverview.classList.remove('active');
        navCompanies.classList.remove('active');
        viewReports.style.display = 'block';
        viewOverview.style.display = 'none';
        viewCompanies.style.display = 'none';
        pageTitle.textContent = 'Reportes y Descargas';
    });

    // Load Data
    async function loadDashboardData() {
        try {
            const stats = await window.api.getStats();

            // Basic Stats
            document.getElementById('stat-companies').textContent = stats.totalCompanies;
            document.getElementById('stat-quoted').textContent = stats.companiesThatQuoted;
            document.getElementById('stat-not-quoted').textContent = stats.companiesOnlyLoggedIn;
            document.getElementById('stat-quotes').textContent = stats.totalQuotes;
            document.getElementById('stat-sessions').textContent = stats.activeSessions24h;

            // Activity Table
            const tbody = document.querySelector('#activity-table tbody');
            tbody.innerHTML = '';

            if (stats.latestActivities && stats.latestActivities.length > 0) {
                stats.latestActivities.forEach(act => {
                    const row = document.createElement('tr');
                    const compName = act.userId ? act.userId.companyName : 'Eliminado/Desconocido';
                    const userEmail = act.userId ? act.userId.email : '-';
                    const actName = act.action === 'LOGIN' ? 'Inicio de Sesión' :
                        act.action === 'QUOTE_GENERATED' ? 'Cotización Creada' :
                            act.action === 'COMPANY_CREATED' ? 'Registro Empresa' : act.action;

                    let detText = '';
                    if (act.details && act.action === 'QUOTE_GENERATED') {
                        detText = `Cliente: ${act.details.client} | Activo: ${act.details.asset}`;
                    }

                    row.innerHTML = `
                        <td>${new Date(act.timestamp).toLocaleString()}</td>
                        <td>${compName}</td>
                        <td>${userEmail}</td>
                        <td><span style="padding:4px 8px; border-radius:4px; font-size:12px; background:${act.action === 'LOGIN' ? '#E0F2FE' : '#D1FAE5'}; color:${act.action === 'LOGIN' ? '#0369A1' : '#047857'}">${actName}</span></td>
                        <td style="font-size:12px; color:#666;">${detText}</td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay actividad reciente</td></tr>';
            }
        } catch (error) {
            console.error('Error cargando stats', error);
        }
    }

    async function loadCompaniesData() {
        try {
            const users = await window.api.getCompanyUsers();
            const tbody = document.querySelector('#companies-table tbody');
            tbody.innerHTML = '';

            if (users && users.length > 0) {
                users.forEach(user => {
                    const row = document.createElement('tr');
                    // Check if name is needed, or just companyName
                    row.innerHTML = `
                        <td>${user.companyName}</td>
                        <td>${user.email}</td>
                        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                        <td style="text-align:center;">
                            <button class="btn btn-secondary" style="padding:4px 8px; font-size:12px; margin-right:5px;" onclick="window.openEditCompanyModal('${user._id}', '${user.companyName}', '${user.email}')">Editar</button>
                            <button class="btn btn-outline" style="padding:4px 8px; font-size:12px; color:var(--danger); border-color:var(--danger);" onclick="window.deleteCompany('${user._id}')">Eliminar</button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay empresas registradas</td></tr>';
            }
        } catch (e) {
            console.error('Error cargando empresas', e);
        }
    }

    // PDF Generation
    const btnReportPdf = document.getElementById('btn-report-pdf');
    if (btnReportPdf) {
        btnReportPdf.addEventListener('click', async () => {
            btnReportPdf.disabled = true;
            btnReportPdf.textContent = 'Generando...';
            try {
                const container = document.getElementById('print-container');
                const stats = await window.api.getStats();

                let tbodyRows = '';
                if (stats.latestActivities) {
                    stats.latestActivities.forEach(act => {
                        const compName = act.userId ? act.userId.companyName : '-';
                        const actName = act.action === 'LOGIN' ? 'Inicio Sesión' :
                            act.action === 'QUOTE_GENERATED' ? 'Cotización' :
                                act.action === 'COMPANY_CREATED' ? 'Registro Empresa' : act.action;
                        tbodyRows += `<tr>
                            <td style="padding:8px; border-bottom:1px solid #eee;">${new Date(act.timestamp).toLocaleDateString()}</td>
                            <td style="padding:8px; border-bottom:1px solid #eee;">${compName}</td>
                            <td style="padding:8px; border-bottom:1px solid #eee; color:#104289; font-weight:500;">${actName}</td>
                        </tr>`;
                    });
                }

                container.innerHTML = `
                    <div style="text-align:center; margin-bottom: 30px;">
                        <h3 style="color:#104289; font-size: 22px; font-weight: 600;">Reporte Ejecutivo</h3>
                        <p style="color:#555;">${new Date().toLocaleDateString()}</p>
                    </div>
                    
                    <h4 style="color:#104289; margin-bottom:10px; border-bottom:2px solid #e1e7ec; padding-bottom:5px;">Resumen Global</h4>
                    <table style="width:100%; border-collapse:collapse; margin-bottom:30px; font-size:14px;">
                        <tr>
                            <td style="padding:10px; background:#f8fafc; font-weight:bold;">Total Empresas Registradas</td>
                            <td style="padding:10px; background:#f8fafc; text-align:right;">${stats.totalCompanies}</td>
                        </tr>
                        <tr>
                            <td style="padding:10px; font-weight:bold; border-bottom:1px solid #f1f5f9;">Empresas Activas (Cotizaron)</td>
                            <td style="padding:10px; text-align:right; font-weight:bold; color:#3ca65a; border-bottom:1px solid #f1f5f9;">${stats.companiesThatQuoted}</td>
                        </tr>
                        <tr>
                            <td style="padding:10px; background:#f8fafc; font-weight:bold;">Total Cotizaciones Generadas</td>
                            <td style="padding:10px; background:#f8fafc; text-align:right;">${stats.totalQuotes}</td>
                        </tr>
                    </table>

                    <h4 style="color:#104289; margin-bottom:10px; border-bottom:2px solid #e1e7ec; padding-bottom:5px;">Últimas Actividades</h4>
                    <table style="width:100%; border-collapse:collapse; font-size:14px; text-align:left;">
                        <thead>
                            <tr style="background:#f1f5f9;">
                                <th style="padding:8px; border-bottom:2px solid #cbd5e1; color:#64748b;">Fecha</th>
                                <th style="padding:8px; border-bottom:2px solid #cbd5e1; color:#64748b;">Empresa</th>
                                <th style="padding:8px; border-bottom:2px solid #cbd5e1; color:#64748b;">Acción</th>
                            </tr>
                        </thead>
                        <tbody>${tbodyRows || '<tr><td colspan="3" style="text-align:center; padding:10px;">Sin actividad reciente</td></tr>'}</tbody>
                    </table>
                `;

                // Load Background PDF
                const { PDFDocument } = window.PDFLib;
                const fetchRes = await fetch('/pdf/hoja_membretada.pdf');
                if (!fetchRes.ok) {
                    throw new Error('No se pudo cargar la hoja membretada. Status: ' + fetchRes.status);
                }
                const templateBytes = await fetchRes.arrayBuffer();
                const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
                const pages = pdfDoc.getPages();
                const firstPage = pages[0];
                const { width, height } = firstPage.getSize();

                // Snapshot HTML
                const canvas = await html2canvas(container, { scale: 2, windowWidth: 800, backgroundColor: null });
                const imgData = canvas.toDataURL('image/png');

                const pngImage = await pdfDoc.embedPng(imgData);
                const contentHeight = (canvas.height * width) / canvas.width;

                // Embed
                firstPage.drawImage(pngImage, {
                    x: 0,
                    y: height - contentHeight,
                    width: width,
                    height: contentHeight
                });

                const pdfBytes = await pdfDoc.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = `Reporte_Credian_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
                link.click();
                container.innerHTML = '';
            } catch (e) {
                console.error('PDF Generation Error:', e);
                alert("Error generando el PDF: " + e.message);
                document.getElementById('print-container').innerHTML = '';
            } finally {
                btnReportPdf.disabled = false;
                btnReportPdf.textContent = 'Descargar Reporte PDF';
            }
        });
    }

    // Company Registration
    let lastCreatedCredentials = null; // Store last created credentials for copy/email buttons

    const formCreateCompany = document.getElementById('form-create-company');
    if (formCreateCompany) {
        formCreateCompany.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = formCreateCompany.querySelector('button');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Creando...';

            const name = document.getElementById('new-company-name').value;
            const email = document.getElementById('new-company-email').value;
            const resultBox = document.getElementById('create-company-result');
            const statusBox = document.getElementById('email-send-status');

            try {
                const res = await window.api.createCompanyUser(email, name);

                // Store credentials for copy/email buttons
                lastCreatedCredentials = {
                    email: res.user.email,
                    companyName: res.user.companyName,
                    password: res.user.generatedPassword
                };

                // Show result box
                document.getElementById('created-email').textContent = res.user.email;
                document.getElementById('created-password').textContent = res.user.generatedPassword;
                resultBox.style.display = 'block';
                statusBox.style.display = 'none';

                // Reset send button state
                const btnSend = document.getElementById('btn-send-email');
                btnSend.disabled = false;
                btnSend.innerHTML = '✉️ Enviar Credenciales por Correo';

                formCreateCompany.reset();
                loadCompaniesData();
            } catch (err) {
                alert('Error al registrar empresa: ' + err.message);
                resultBox.style.display = 'none';
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }

    // Copy Password Button
    const btnCopyPassword = document.getElementById('btn-copy-password');
    if (btnCopyPassword) {
        btnCopyPassword.addEventListener('click', () => {
            if (!lastCreatedCredentials) return;

            navigator.clipboard.writeText(lastCreatedCredentials.password).then(() => {
                const originalHTML = btnCopyPassword.innerHTML;
                btnCopyPassword.innerHTML = '✅ Copiada';
                btnCopyPassword.style.background = '#16a34a';
                btnCopyPassword.style.color = '#fff';
                setTimeout(() => {
                    btnCopyPassword.innerHTML = originalHTML;
                    btnCopyPassword.style.background = '';
                    btnCopyPassword.style.color = '';
                }, 2000);
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = lastCreatedCredentials.password;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);

                btnCopyPassword.innerHTML = '✅ Copiada';
                setTimeout(() => { btnCopyPassword.innerHTML = '📋 Copiar'; }, 2000);
            });
        });
    }

    // Send Email Button — opens Outlook (default mail client) via mailto:
    const btnSendEmail = document.getElementById('btn-send-email');
    if (btnSendEmail) {
        btnSendEmail.addEventListener('click', () => {
            if (!lastCreatedCredentials) return;

            const { email, companyName, password } = lastCreatedCredentials;
            const subject = encodeURIComponent('Bienvenido a CREDIAN - Tus Credenciales de Acceso');
            const body = encodeURIComponent(
                `Hola ${companyName},\n\n` +
                `Tu cuenta ha sido creada en el sistema de cotizaciones de CREDIAN.\n\n` +
                `Aquí están tus credenciales de acceso:\n\n` +
                `  Correo: ${email}\n` +
                `  Contraseña: ${password}\n\n` +
                `Ingresa al sistema en: ${window.location.origin}\n\n` +
                `Te recomendamos cambiar tu contraseña después de iniciar sesión por primera vez.\n\n` +
                `Saludos,\nCREDIAN`
            );

            window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
        });
    }

    // Editing & Deleting logic attached to window for inline HTML onclick handlers
    window.openEditCompanyModal = (id, name, email) => {
        document.getElementById('edit-company-id').value = id;
        document.getElementById('edit-company-name').value = name;
        document.getElementById('edit-company-email').value = email;
        document.getElementById('edit-reset-password').checked = false;
        document.getElementById('edit-company-result').style.display = 'none';
        document.getElementById('modal-edit-company').style.display = 'flex';
    };

    window.deleteCompany = async (id) => {
        if (confirm('¿Estás seguro de que deseas eliminar esta empresa? Ya no podrá acceder al sistema ni cotizar.')) {
            try {
                await window.api.deleteCompanyUser(id);
                loadDashboardData();
                loadCompaniesData();
            } catch (e) {
                alert('Error al eliminar: ' + e.message);
            }
        }
    };

    const formEditCompany = document.getElementById('form-edit-company');
    if (formEditCompany) {
        formEditCompany.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-save-company');
            btn.disabled = true;
            btn.textContent = 'Guardando...';

            const id = document.getElementById('edit-company-id').value;
            const data = {
                companyName: document.getElementById('edit-company-name').value,
                email: document.getElementById('edit-company-email').value,
                resetPassword: document.getElementById('edit-reset-password').checked
            };

            try {
                const res = await window.api.updateCompanyUser(id, data);
                if (res.newPassword) {
                    // Show updated credentials in edit modal
                    document.getElementById('edited-email').textContent = data.email;
                    document.getElementById('edited-password').textContent = res.newPassword;
                    document.getElementById('edit-company-result').style.display = 'block';

                    // Also update the create-company-result box if visible
                    const createResultBox = document.getElementById('create-company-result');
                    if (createResultBox.style.display !== 'none') {
                        document.getElementById('created-email').textContent = data.email;
                        document.getElementById('created-password').textContent = res.newPassword;
                    }

                    // Update stored credentials for copy/send buttons
                    lastCreatedCredentials = {
                        email: data.email,
                        companyName: data.companyName,
                        password: res.newPassword
                    };

                    // Store for edit modal buttons
                    lastEditedCredentials = {
                        email: data.email,
                        companyName: data.companyName,
                        password: res.newPassword
                    };
                } else {
                    // No password reset — still update the create box email if it was changed
                    const createResultBox = document.getElementById('create-company-result');
                    if (createResultBox.style.display !== 'none' && lastCreatedCredentials && lastCreatedCredentials.email !== data.email) {
                        document.getElementById('created-email').textContent = data.email;
                        lastCreatedCredentials.email = data.email;
                        lastCreatedCredentials.companyName = data.companyName;
                    }
                    document.getElementById('modal-edit-company').style.display = 'none';
                }
                loadDashboardData();
                loadCompaniesData();
            } catch (err) {
                alert('Error al editar empresa: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = '💾 Guardar Cambios';
            }
        });
    }

    // Edit modal — Copy password button
    let lastEditedCredentials = null;
    const btnCopyEditedPw = document.getElementById('btn-copy-edited-password');
    if (btnCopyEditedPw) {
        btnCopyEditedPw.addEventListener('click', () => {
            if (!lastEditedCredentials) return;
            navigator.clipboard.writeText(lastEditedCredentials.password).then(() => {
                btnCopyEditedPw.innerHTML = '✅ Copiada';
                btnCopyEditedPw.style.background = '#16a34a';
                btnCopyEditedPw.style.color = '#fff';
                setTimeout(() => {
                    btnCopyEditedPw.innerHTML = '📋 Copiar';
                    btnCopyEditedPw.style.background = '';
                    btnCopyEditedPw.style.color = '';
                }, 2000);
            }).catch(() => {
                const ta = document.createElement('textarea');
                ta.value = lastEditedCredentials.password;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                btnCopyEditedPw.innerHTML = '✅ Copiada';
                setTimeout(() => { btnCopyEditedPw.innerHTML = '📋 Copiar'; }, 2000);
            });
        });
    }

    // Edit modal — Send email button (opens Outlook via mailto)
    const btnSendEditedEmail = document.getElementById('btn-send-edited-email');
    if (btnSendEditedEmail) {
        btnSendEditedEmail.addEventListener('click', () => {
            if (!lastEditedCredentials) return;
            const { email, companyName, password } = lastEditedCredentials;
            const subject = encodeURIComponent('CREDIAN - Tus Credenciales Actualizadas');
            const body = encodeURIComponent(
                `Hola ${companyName},\n\n` +
                `Tus credenciales de acceso al sistema de cotizaciones de CREDIAN han sido actualizadas.\n\n` +
                `  Correo: ${email}\n` +
                `  Nueva Contraseña: ${password}\n\n` +
                `Ingresa al sistema en: ${window.location.origin}\n\n` +
                `Te recomendamos cambiar tu contraseña después de iniciar sesión.\n\n` +
                `Saludos,\nCREDIAN`
            );
            window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
        });
    }

    // Initial Load
    // Only load overview stats.
    loadDashboardData();
});
