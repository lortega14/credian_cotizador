const nodemailer = require('nodemailer');

// Create transporter using environment variables
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

/**
 * Send credentials email to a newly created company
 */
async function sendCredentialsEmail(toEmail, companyName, password) {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"CREDIAN Cotizador" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Bienvenido a CREDIAN - Tus Credenciales de Acceso',
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 0;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #104289 0%, #1a5bc4 100%); padding: 40px 30px; text-align: center; border-radius: 0 0 20px 20px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px;">CREDIAN</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Sistema de Cotizaciones</p>
        </div>

        <!-- Body -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 10px;">¡Bienvenido, ${companyName}!</h2>
          <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 25px;">
            Tu cuenta ha sido creada exitosamente en el sistema de cotizaciones de CREDIAN. 
            A continuación encontrarás tus credenciales de acceso:
          </p>

          <!-- Credentials Card -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #f1f5f9;">Correo Electrónico</td>
              </tr>
              <tr>
                <td style="padding: 8px 0 18px; color: #1e293b; font-size: 16px; font-weight: 500;">${toEmail}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #f1f5f9;">Contraseña</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">
                  <code style="background: #f0fdf4; color: #166534; padding: 8px 16px; border-radius: 6px; font-size: 18px; font-weight: 600; letter-spacing: 1px; border: 1px solid #bbf7d0;">${password}</code>
                </td>
              </tr>
            </table>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL || 'http://localhost:3000'}" 
               style="display: inline-block; background: linear-gradient(135deg, #104289, #1a5bc4); color: #ffffff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
              Ingresar al Sistema
            </a>
          </div>

          <!-- Security Notice -->
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 15px; margin-top: 20px;">
            <p style="color: #92400e; font-size: 13px; margin: 0; line-height: 1.5;">
              <strong>🔒 Nota de seguridad:</strong> Te recomendamos cambiar tu contraseña después de iniciar sesión por primera vez. 
              No compartas estas credenciales con terceros.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #1e293b; padding: 25px 30px; text-align: center; border-radius: 20px 20px 0 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5;">
            Este es un correo automático del sistema CREDIAN.<br>
            Si no solicitaste esta cuenta, por favor ignora este mensaje.
          </p>
        </div>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendCredentialsEmail };
