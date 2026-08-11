/**
 * Template de base avec layout SmartCampus
 */
const baseTemplate = (title, content, actionUrl = null, actionLabel = null) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
                            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;">
                                🎓 SmartCampus ERP
                            </h1>
                            <p style="margin:8px 0 0;color:#dbeafe;font-size:13px;">
                                ${title}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;">
                            ${content}
                            
                            ${actionUrl ? `
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                                <tr>
                                    <td align="center">
                                        <a href="${actionUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                                            ${actionLabel || "Consulter"}
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            ` : ""}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding:24px;text-align:center;">
                            <p style="margin:0;color:#94a3b8;font-size:11px;">
                                © ${new Date().getFullYear()} SmartCampus ERP · Portail Étudiant<br>
                                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

/**
 * Template : Nouvelle demande soumise
 */
const demandeSoumiseTemplate = ({ prenom, numero, type, objet }) => baseTemplate(
    "Demande soumise avec succès",
    `
    <h2 style="margin:0 0 16px;color:#0f172a;font-size:18px;">
        Bonjour ${prenom},
    </h2>
    <p style="margin:0 0 12px;color:#475569;font-size:14px;line-height:1.6;">
        Votre demande a bien été soumise et est en attente de traitement par la scolarité.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;">
        <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;">📋 Référence</td>
            <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">${numero}</td>
        </tr>
        <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;">🏷️ Type</td>
            <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">${type}</td>
        </tr>
        <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;">📝 Objet</td>
            <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">${objet || "—"}</td>
        </tr>
    </table>
    <p style="margin:12px 0 0;color:#475569;font-size:14px;line-height:1.6;">
        Vous recevrez une notification dès que le statut de votre demande changera.
    </p>
    `,
    null,
    null
);

/**
 * Template : Changement de statut d'une demande
 */
const statutDemandeTemplate = ({ prenom, numero, type, statut, commentaire }) => {
    const statutColors = {
        Validee: "#10b981",
        Rejetee: "#ef4444",
        En_Traitement: "#f59e0b",
        Soumise: "#3b82f6",
    };
    const statutLabels = {
        Validee: "✅ Validée",
        Rejetee: "❌ Rejetée",
        En_Traitement: "⏳ En traitement",
        Soumise: "📩 Soumise",
    };

    return baseTemplate(
        "Mise à jour de votre demande",
        `
        <h2 style="margin:0 0 16px;color:#0f172a;font-size:18px;">
            Bonjour ${prenom},
        </h2>
        <p style="margin:0 0 12px;color:#475569;font-size:14px;line-height:1.6;">
            Le statut de votre demande a été mis à jour :
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;">
            <tr>
                <td style="padding:8px 0;color:#64748b;font-size:13px;">📋 Référence</td>
                <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">${numero}</td>
            </tr>
            <tr>
                <td style="padding:8px 0;color:#64748b;font-size:13px;">🏷️ Type</td>
                <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">${type}</td>
            </tr>
            <tr>
                <td style="padding:8px 0;color:#64748b;font-size:13px;">📊 Statut</td>
                <td style="padding:8px 0;text-align:right;">
                    <span style="display:inline-block;background:${statutColors[statut] || "#64748b"};color:#ffffff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">
                        ${statutLabels[statut] || statut}
                    </span>
                </td>
            </tr>
        </table>
        ${commentaire ? `
        <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:6px;margin:16px 0;">
            <p style="margin:0;color:#78350f;font-size:13px;">
                💬 <strong>Commentaire :</strong><br>${commentaire}
            </p>
        </div>
        ` : ""}
        `,
        null,
        null
    );
};

/**
 * Template : Nouveau document officiel disponible
 */
const documentDisponibleTemplate = ({ prenom, nomDocument, categorie }) => baseTemplate(
    "Nouveau document disponible",
    `
    <h2 style="margin:0 0 16px;color:#0f172a;font-size:18px;">
        Bonjour ${prenom},
    </h2>
    <p style="margin:0 0 12px;color:#475569;font-size:14px;line-height:1.6;">
        Un nouveau document officiel est maintenant disponible dans votre espace :
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:16px 0;">
        <tr>
            <td style="padding:8px 0;color:#166534;font-size:13px;">📄 Document</td>
            <td style="padding:8px 0;color:#166534;font-size:13px;font-weight:600;text-align:right;">${nomDocument}</td>
        </tr>
        <tr>
            <td style="padding:8px 0;color:#166534;font-size:13px;">🏷️ Catégorie</td>
            <td style="padding:8px 0;color:#166534;font-size:13px;font-weight:600;text-align:right;">${categorie}</td>
        </tr>
    </table>
    <p style="margin:12px 0 0;color:#475569;font-size:14px;line-height:1.6;">
        Vous pouvez le télécharger depuis votre portail.
    </p>
    `,
    null,
    null
);

module.exports = {
    demandeSoumiseTemplate,
    statutDemandeTemplate,
    documentDisponibleTemplate,
};