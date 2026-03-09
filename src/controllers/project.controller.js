import Project from "../models/Project.js";

export async function listProjects(req, res) {
  const projects = await Project.find({
    $or: [{ owner: req.userId }, { members: req.userId }],
  }).populate("owner", "name email").populate("members", "name email");
  res.json({ projects });
}

export async function createProject(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "El nombre es requerido" });
  const project = await Project.create({ name, owner: req.userId, members: [req.userId] });
  res.status(201).json({ project });
}

export async function getProject(req, res) {
  const project = await Project.findOne({
    _id: req.params.id,
    $or: [{ owner: req.userId }, { members: req.userId }],
  }).populate("owner", "name email").populate("members", "name email");
  if (!project) return res.status(404).json({ message: "Proyecto no encontrado" });
  res.json({ project });
}

// Eliminar proyecto
export async function deleteProject(req, res) {
  const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
  if (!project) return res.status(403).json({ message: "Solo el dueño puede eliminar el proyecto" });
  
  await Project.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}