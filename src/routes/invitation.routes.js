import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { sendInvitation, getInvitation, acceptInvitation } from '../controllers/invitation.controller.js';

const router = Router();

// Pública — solo necesita el token en la URL
router.get('/:token', getInvitation);

// Protegidas — requieren login
router.use(auth);
router.post('/', sendInvitation);
router.post('/:token/accept', acceptInvitation);

export default router;