import crypto from "crypto";
import nodemailer from "nodemailer";
import Invitation from "../models/Invitation.js";
import Project from "../models/Project.js";
import User from "../models/User.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

async function sendEmail(to, inviteLink, projectName, invitedByName) {
  await transporter.sendMail({
    from: `"To-Do PWA" <${process.env.GMAIL_USER}>`,
    to,
    subject: `${invitedByName} te invitó a colaborar en "${projectName}"`,
    html: `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background-color:#0a0a12;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a12;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#16161e;border-radius:16px;overflow:hidden;border:1px solid #2a2a3a;">
              
              <!-- Header -->
              <tr>
                <td style="padding:40px 40px 32px;text-align:center;border-bottom:1px solid #2a2a3a;">
                  <img src="https://pwafront-nu.vercel.app/icons/icon1.png" 
                    width="64" height="64"
                    style="border-radius:14px;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;"
                    alt="To-Do PWA"
                  />
                  <h1 style="margin:0;color:#f0eeff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                    To-Do PWA
                  </h1>
                  <p style="margin:6px 0 0;color:#666;font-size:14px;">
                    Gestión de tareas colaborativa
                  </p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:36px 40px;">
                  <p style="margin:0 0 8px;color:#888;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">
                    Nueva invitación
                  </p>
                  <h2 style="margin:0 0 20px;color:#f0eeff;font-size:22px;font-weight:700;line-height:1.3;">
                    ¡Te invitaron a colaborar!
                  </h2>
                  <p style="margin:0 0 28px;color:#888;font-size:15px;line-height:1.7;">
                    <strong style="color:#f0eeff;">${invitedByName}</strong> te ha invitado a unirte al proyecto:
                  </p>

                  <!-- Project Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d15;border:1px solid #2a2a3a;border-radius:12px;margin-bottom:32px;">
                    <tr>
                      <td style="padding:20px 24px;">
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="vertical-align:middle;">
                              <div style="width:44px;height:44px;background:#1f6feb22;border:1px solid #1f6feb44;border-radius:10px;text-align:center;line-height:44px;font-size:20px;">
                                📁
                              </div>
                            </td>
                            <td style="padding-left:14px;vertical-align:middle;">
                              <div style="color:#f0eeff;font-size:17px;font-weight:700;">${projectName}</div>
                              <div style="color:#555;font-size:13px;margin-top:2px;">Proyecto colaborativo</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center">
                        <a href="${inviteLink}"
                          style="display:inline-block;background:linear-gradient(135deg,#1f6feb,#a06af8);color:#ffffff;text-decoration:none;padding:15px 48px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.2px;">
                          Aceptar invitación →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:28px 0 0;color:#444;font-size:13px;text-align:center;line-height:1.6;">
                    Si no esperabas esta invitación puedes ignorar este mensaje.<br>
                    Este enlace expira en <strong style="color:#555;">7 días</strong>.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="border-top:1px solid #2a2a3a;padding:20px 40px;text-align:center;">
                  <p style="margin:0;color:#333;font-size:12px;">
                    © 2025 To-Do PWA · Enviado automáticamente, por favor no respondas este correo.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `,
  });
}

export async function sendInvitation(req, res) {
  const { email, projectId } = req.body;
  if (!email || !projectId)
    return res.status(400).json({ message: "Email y proyecto son requeridos" });

  const project = await Project.findOne({ _id: projectId, owner: req.userId });
  if (!project) return res.status(403).json({ message: "Solo el dueño puede invitar" });

  const existingUser = await User.findOne({ email });
  if (existingUser && project.members.map(String).includes(String(existingUser._id)))
    return res.status(409).json({ message: "El usuario ya es miembro" });

  const existing = await Invitation.findOne({ email, project: projectId, status: "pending" });
  if (existing) return res.status(409).json({ message: "Ya tiene una invitación pendiente" });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await Invitation.create({ project: projectId, invitedBy: req.userId, email, token, expiresAt });

  const inviteLink = `${process.env.FRONT_ORIGIN}/invite/${token}`;

  try {
    const inviter = await User.findById(req.userId);
    await sendEmail(email, inviteLink, project.name, inviter.name);
  } catch (err) {
    console.error("Error enviando email:", err.message);
  }

  res.status(201).json({ ok: true, inviteLink });
}

export async function getInvitation(req, res) {
  const invitation = await Invitation.findOne({ token: req.params.token })
    .populate("project", "name")
    .populate("invitedBy", "name email");
  if (!invitation) return res.status(404).json({ message: "Invitación no válida" });
  if (invitation.status !== "pending") return res.status(410).json({ message: "Ya fue usada" });
  if (invitation.expiresAt < new Date()) return res.status(410).json({ message: "Expirada" });
  res.json({ invitation });
}

export async function acceptInvitation(req, res) {
  const invitation = await Invitation.findOne({ token: req.params.token });
  if (!invitation || invitation.status !== "pending")
    return res.status(404).json({ message: "Invitación no válida" });
  if (invitation.expiresAt < new Date())
    return res.status(410).json({ message: "Invitación expirada" });

  const user = await User.findById(req.userId);
  if (user.email !== invitation.email)
    return res.status(403).json({ message: "Esta invitación no es para tu cuenta" });

  invitation.status = "accepted";
  await invitation.save();

  await Project.findByIdAndUpdate(invitation.project, { $addToSet: { members: req.userId } });

  const project = await Project.findById(invitation.project)
    .populate("owner", "name email")
    .populate("members", "name email");

  res.json({ ok: true, project });
}