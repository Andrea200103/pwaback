import Task from "../models/Task.js";
import Project from "../models/Project.js";

const allowed = ["Pendiente", "En Progreso", "Completada"];

export async function list(req, res) {
  const { project } = req.query;
  const filter = { deleted: false };

  if (project) {
    const proj = await Project.findOne({
      _id: project,
      $or: [{ owner: req.userId }, { members: req.userId }],
    });
    if (!proj) return res.status(403).json({ message: "No tienes acceso a este proyecto" });
    filter.project = project;
  } else {
    filter.user = req.userId;
  }

  const items = await Task.find(filter)
    .populate("assignedTo", "name email") // <- agrega
    .sort({ createdAt: -1 });
  res.json({ items });
}

export async function create(req, res) {
  const { title, description = "", status = "Pendiente", clienteId, project } = req.body;
  if (!title) return res.status(400).json({ message: "El título es requerido" });

  if (project) {
    const proj = await Project.findOne({
      _id: project,
      $or: [{ owner: req.userId }, { members: req.userId }],
    });
    if (!proj) return res.status(403).json({ message: "No tienes acceso a este proyecto" });
  }

  const task = await Task.create({
    user: req.userId,
    title,
    description,
    status: allowed.includes(status) ? status : "Pendiente",
    clienteId,
    project: project || null,
  });
  res.status(201).json({ task });
}

export async function update(req, res) {
  const { id } = req.params;
  const { title, description, status, assignedTo } = req.body; // <- agrega assignedTo

  if (status && !allowed.includes(status))
    return res.status(400).json({ message: "Estado inválido" });

  const task = await Task.findById(id);
  if (!task) return res.status(404).json({ message: "Tarea no encontrada" });

  if (task.project) {
    const proj = await Project.findOne({
      _id: task.project,
      $or: [{ owner: req.userId }, { members: req.userId }],
    });
    if (!proj) return res.status(403).json({ message: "No tienes acceso" });
  } else if (String(task.user) !== String(req.userId)) {
    return res.status(403).json({ message: "No tienes acceso" });
  }

  task.title = title ?? task.title;
  task.description = description ?? task.description;
  if (status) task.status = status;
  if (assignedTo !== undefined) task.assignedTo = assignedTo || null; // <- agrega
  await task.save();

  res.json({ task });
}

export async function remove(req, res) {
  const { id } = req.params;

  const task = await Task.findById(id);
  if (!task) return res.status(404).json({ message: "Tarea no encontrada" });

  if (task.project) {
    const proj = await Project.findOne({
      _id: task.project,
      $or: [{ owner: req.userId }, { members: req.userId }],
    });
    if (!proj) return res.status(403).json({ message: "No tienes acceso" });
  } else if (String(task.user) !== String(req.userId)) {
    return res.status(403).json({ message: "No tienes acceso" });
  }

  task.deleted = true;
  await task.save();

  res.json({ ok: true });
}

export async function bulksync(req, res) {
  try {
    const { tasks = [] } = req.body;
    if (!Array.isArray(tasks)) return res.status(400).json({ message: "tasks debe ser array" });

    const mapping = [];

    for (const t of tasks) {
      if (!t || !t.clienteId || !t.title) continue;

      let doc = await Task.findOne({ user: req.userId, clienteId: t.clienteId });

      if (!doc) {
        doc = await Task.create({
          user: req.userId,
          title: t.title,
          description: t.description ?? "",
          status: allowed.includes(t.status) ? t.status : "Pendiente",
          clienteId: t.clienteId,
        });
      } else {
        doc.title = t.title ?? doc.title;
        doc.description = t.description ?? doc.description;
        if (t.status && allowed.includes(t.status)) doc.status = t.status;
        await doc.save();
      }

      mapping.push({ clienteId: t.clienteId, serverId: String(doc._id) });
    }

    return res.json({ mapping });
  } catch (err) {
    console.error("bulksync error:", err);
    return res.status(500).json({ message: "Error en bulksync" });
  }
}