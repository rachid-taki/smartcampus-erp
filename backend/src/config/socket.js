const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const pool = require("./database");

let io;

function initializeSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) return next(new Error("Non authentifié"));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const { rows } = await pool.query(
                `SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.id_role, r.nom_role
                 FROM utilisateur u
                 JOIN role r ON r.id_role = u.id_role
                 WHERE u.id_utilisateur = $1 AND u.actif = TRUE`,
                [decoded.id]
            );
            if (rows.length === 0) return next(new Error("Utilisateur invalide"));

            socket.user = rows[0];
            next();
        } catch (err) {
            next(new Error("Token invalide"));
        }
    });

    io.on("connection", (socket) => {
        console.log(`Connecté : ${socket.user.email} (${socket.user.id_utilisateur})`);
        socket.join(`user:${socket.user.id_utilisateur}`);
        io.emit("user:online", {
            userId: socket.user.id_utilisateur,
            nom: socket.user.nom,
            prenom: socket.user.prenom,
        });

        socket.on("conversation:join", (conversationId) => {
            socket.join(`conv:${conversationId}`);
        });

        socket.on("conversation:leave", (conversationId) => {
            socket.leave(`conv:${conversationId}`);
        });

        socket.on("message:send", async (data) => {
            try {
                const { conversationId, contenu } = data;
                if (!conversationId || !contenu?.trim()) return;

                const { rows } = await pool.query(
                    `INSERT INTO message (id_conversation, id_expediteur, contenu, date_envoi, lu)
                     VALUES ($1, $2, $3, NOW(), FALSE)
                     RETURNING *`,
                    [conversationId, socket.user.id_utilisateur, contenu.trim()]
                );

                const message = rows[0];

                await pool.query(
                    `UPDATE conversation SET derniere_activite = NOW() WHERE id_conversation = $1`,
                    [conversationId]
                );

                const enriched = {
                    ...message,
                    id: message.id_message,
                    contenu: message.contenu,
                    dateEnvoi: message.date_envoi,
                    lu: message.lu,
                    isMine: message.id_expediteur === socket.user.id_utilisateur,
                    expediteur: {
                        id: socket.user.id_utilisateur,
                        nom: `${socket.user.prenom} ${socket.user.nom}`,
                        role: socket.user.nom_role,
                    },
                    piecesJointes: [],
                };

                io.to(`conv:${conversationId}`).emit("message:new", enriched);
            } catch (err) {
                console.error(" Erreur message:send:", err);
                socket.emit("error", { message: "Erreur envoi message" });
            }
        });

        socket.on("message:read", async ({ conversationId }) => {
            try {
                await pool.query(
                    `UPDATE message SET lu = TRUE 
                     WHERE id_conversation = $1 AND id_expediteur != $2 AND lu = FALSE`,
                    [conversationId, socket.user.id_utilisateur]
                );

                io.to(`conv:${conversationId}`).emit("messages:read", {
                    conversationId,
                    readBy: socket.user.id_utilisateur,
                });

                const { rows: participants } = await pool.query(
                    `SELECT id_utilisateur FROM conversation_participant WHERE id_conversation = $1`,
                    [conversationId]
                );
                participants.forEach((p) => {
                    io.to(`user:${p.id_utilisateur}`).emit("conversations:refresh");
                });
            } catch (err) {
                console.error(" Erreur message:read:", err);
            }
        });

        socket.on("typing:start", ({ conversationId }) => {
            socket.to(`conv:${conversationId}`).emit("typing:update", {
                conversationId,
                userId: socket.user.id_utilisateur,
                nom: socket.user.prenom,
                isTyping: true,
            });
        });

        socket.on("typing:stop", ({ conversationId }) => {
            socket.to(`conv:${conversationId}`).emit("typing:update", {
                conversationId,
                userId: socket.user.id_utilisateur,
                isTyping: false,
            });
        });

        socket.on("disconnect", () => {
            io.emit("user:offline", { userId: socket.user.id_utilisateur });
        });
    });

    return io;
}

function getIO() {
    if (!io) throw new Error("Socket.io non initialisé");
    return io;
}

module.exports = { initializeSocket, getIO };