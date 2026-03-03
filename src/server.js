import dns from 'node:dns/promises'; dns.setServers(['1.1.1.1']);
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/task.routes.js';
import projectRoutes from './routes/project.routes.js';         // <- agrega
import invitationRoutes from './routes/invitation.routes.js';   // <- agrega

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (req, res) => res.json({ok: true, name: 'Andrea Todo API'}));
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);         // <- agrega
app.use('/api/invitations', invitationRoutes);   // <- agrega

const {PORT = 4000, MONGO_URI} = process.env;
mongoose.connect(process.env.MONGO_URI, {dbName: 'pwatodo'})
    .then(() => {
        console.log('Conectado a mongoDB', mongoose.connection.name);
        app.listen(PORT, () => console.log(`Servidor ejecutandose por: ${PORT}`));
    })
    .catch(err =>{
        console.error('Error conectado a mongoDB', err);
        process.exit(1);
    });