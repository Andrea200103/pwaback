import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { listProjects, createProject, getProject, deleteProject } from '../controllers/project.controller.js';

const router = Router();
router.use(auth);
router.get('/', listProjects);
router.post('/', createProject);
router.get('/:id', getProject);
router.delete('/:id', deleteProject); // <- agrega esta línea

export default router;