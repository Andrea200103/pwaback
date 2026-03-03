import mongoose from "mongoose";
 const taskSchema = new mongoose.Schema(
    {
        user: {type: mongoose.Schema.Types.ObjectId, re: 'user', required: true},
        // Agrega esto en taskSchema, después del campo "user":
         project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
         assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        title: {type: String, required: true, trim: true},
        description:{ type: String, trim: true, default: ''},
        status:{
            type: String,
            enum:['Pendiente', 'En progreso', 'Completada'],
            default: 'Pendiente',
        },
        clienteId:{type: String},
        deleted:{type: Boolean, default: false},
    },
    {
       timestamps: true, 
    }
 );

 taskSchema.index(
    {user: 1, clienteId: 1},
 {
    unique: true,
    partialFilterExpression: { clienteId:{$exists: true, $ne: null, $ne: ''}, deleted: {$ne: true } 
},
name: 'uniq_user_clienteId',
background: true


 } );
 export default mongoose.model('Task', taskSchema);