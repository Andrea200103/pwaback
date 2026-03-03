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
    subject: `Te invitaron a colaborar en "${projectName}"`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>¡Hola!</h2>
        <p><strong>${invitedByName}</strong> te invitó a colaborar en el proyecto <strong>${projectName}</strong>.</p>
        <a href="${inviteLink}" style="
          display:inline-block;background:#1f6feb;color:#fff;
          padding:12px 24px;border-radius:8px;text-decoration:none;
          font-weight:bold;margin:16px 0
        ">Aceptar invitación</a>
        <p style="color:#888;font-size:12px">Este enlace expira en 7 días.</p>
      </div>
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
    // No falla la invitación si el email falla
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